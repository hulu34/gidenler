import { and, desc, eq, gt, ne } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Db } from "@/lib/db/client";
import { auditLog, session } from "@/lib/db/schema";

/* ==========================================================================
   AKTİF CİHAZLAR — kullanıcının kendi oturumları; tek tek ya da "diğer tümü" kapatılabilir.
   --------------------------------------------------------------------------
   · Oturumlar veritabanında tutulur (çerez önbelleği yok): satır silinince o cihaz bir sonraki
     istekte çıkış yapmış olur.
   · İstemciye oturum ANAHTARI (token) hiç gönderilmez; yalnız kimlik, cihaz özeti ve tarihler.
     IP adresi gösterilmez.
   · Her kapatma audit_log'a yazılır (güvenlik izi).
   ========================================================================== */

/** Tarayıcı bilgisinden kısa, kişisel veri içermeyen cihaz özeti: "iPhone · Safari". */
export function deviceOf(ua: string | null | undefined): string {
  const u = ua ?? "";
  const os = /iPhone/.test(u) ? "iPhone" : /iPad/.test(u) ? "iPad" : /Android/.test(u) ? "Android"
    : /Mac OS X|Macintosh/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows" : /Linux|CrOS/.test(u) ? "Linux" : null;
  const br = /Edg\//.test(u) ? "Edge" : /OPR\/|Opera/.test(u) ? "Opera" : /Firefox\/|FxiOS/.test(u) ? "Firefox"
    : /CriOS|Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : null;
  return os && br ? `${os} · ${br}` : os ?? br ?? "Bilinmeyen cihaz";
}

export interface DeviceSession { id: string; device: string; createdAt: string; lastActive: string; current: boolean }

export async function listSessions(db: Db, userId: string, currentId: string, now = new Date()): Promise<DeviceSession[]> {
  const rows = await db.select({ id: session.id, ua: session.userAgent, createdAt: session.createdAt, updatedAt: session.updatedAt })
    .from(session).where(and(eq(session.userId, userId), gt(session.expiresAt, now))).orderBy(desc(session.updatedAt));
  return rows
    .map((r) => ({ id: r.id, device: deviceOf(r.ua), createdAt: r.createdAt.toISOString(), lastActive: r.updatedAt.toISOString(), current: r.id === currentId }))
    .sort((a, b) => Number(b.current) - Number(a.current));
}

const audit = (db: Db, userId: string, detail: unknown) =>
  db.insert(auditLog).values({ id: uuidv7(), actor: `user:${userId}`, action: "session_revoke", refTable: "session", refId: userId, detail });

/** Tek oturumu kapatır (yalnız kendi oturumu; bu cihazı kapatmak için "Çıkış yap" kullanılır). */
export async function revokeSession(db: Db, userId: string, id: string, currentId: string): Promise<{ ok: true } | { ok: false; error: "current" | "not_found" }> {
  if (id === currentId) return { ok: false, error: "current" };
  const res = await db.delete(session).where(and(eq(session.id, id), eq(session.userId, userId))).returning({ id: session.id });
  if (!res.length) return { ok: false, error: "not_found" };
  await audit(db, userId, { count: 1, scope: "one" });
  return { ok: true };
}

/** Bu cihaz dışındaki bütün oturumları kapatır. Dönen: kapatılan oturum sayısı. */
export async function revokeOtherSessions(db: Db, userId: string, currentId: string): Promise<number> {
  const res = await db.delete(session).where(and(eq(session.userId, userId), ne(session.id, currentId))).returning({ id: session.id });
  if (res.length) await audit(db, userId, { count: res.length, scope: "others" });
  return res.length;
}
