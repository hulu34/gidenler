import { and, desc, eq, inArray } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { auditLog, fieldProvenance, placeIdentifiers, places } from "@/lib/db/schema";
import { atomic } from "@/lib/profile";

/* ──────────────────────────────────────────────────────────────────────────
   GOOGLE PLACES İZİN KAPISI — ücretli her çağrıdan önce sunucuda.
   · Varsayılan KAPALI: politika satırı yoksa, okunamıyorsa ya da veritabanı yoksa çağrı yapılmaz.
   · Sınıf izin vermez: A da olsa açık "izinli" kaydı gerekir. D sınıfı izinli olamaz.
   · Yer: field_provenance "policy.google" (yeni tablo yok). Ekleme yönlü; en yeni satır geçerlidir, geçmiş kalır.
   · Google verisi burada tutulmaz: yalnız bizim kararımız, gerekçesi ve onayı.
   ────────────────────────────────────────────────────────────────────────── */

export const POLICY_FIELD = "policy.google";

export const GooglePolicy = z.object({
  mode: z.enum(["kapali", "baglanti", "izinli"]),
  priority: z.enum(["A", "B", "C", "D"]),
  reason: z.string().trim().min(3).max(300),
  approvedBy: z.string().trim().min(2).max(80),
  approvedAt: z.string(),
  estimatedCostUsd: z.number().min(0).max(100).optional(),
  /** Otomatik (yönetici onaysız) eşleşme ile çağrıya izin. Varsayılan hayır: yalnız onaylı eşleşme. */
  allowAuto: z.boolean().default(false),
  lastReviewedAt: z.string(),
}).strict();
export type GooglePolicy = z.infer<typeof GooglePolicy>;

export function parsePolicy(value: string | null | undefined): GooglePolicy | null {
  try { const r = GooglePolicy.safeParse(JSON.parse(value ?? "")); return r.success ? r.data : null; } catch { return null; }
}

export const policyPermits = (p: GooglePolicy | null) => !!p && p.mode === "izinli" && p.priority !== "D";

type Db = NonNullable<ReturnType<typeof getDb>>;
/** Yer kimliği → en yeni politika. Bozuk satır "yok" sayılır, yani kapalı. */
export async function latestPolicies(db: Db, placeIds?: string[]) {
  if (placeIds && !placeIds.length) return new Map<string, GooglePolicy | null>();
  const rows = await db.select({ placeId: fieldProvenance.placeId, value: fieldProvenance.value }).from(fieldProvenance)
    .where(placeIds ? and(eq(fieldProvenance.field, POLICY_FIELD), inArray(fieldProvenance.placeId, placeIds)) : eq(fieldProvenance.field, POLICY_FIELD))
    .orderBy(desc(fieldProvenance.fetchedAt), desc(fieldProvenance.id));
  const out = new Map<string, GooglePolicy | null>();
  for (const r of rows) if (!out.has(r.placeId)) out.set(r.placeId, parsePolicy(r.value));
  return out;
}

export type GoogleGate = { id: string } | { none: "policy_closed" | "no_match" | "pending_review" | "rejected" | "disabled" | "auto_not_approved" };

/** Tek kapı. null = karar verilemedi: çağıran ücretli çağrı YAPMAZ. */
export async function googleCallAllowed(slug: string): Promise<GoogleGate | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const [p] = await db.select({ id: places.id }).from(places).where(eq(places.slug, slug)).limit(1);
    if (!p) return { none: "no_match" };
    const policy = (await latestPolicies(db, [p.id])).get(p.id) ?? null;
    if (!policyPermits(policy)) return { none: "policy_closed" };
    const ids = await db.select().from(placeIdentifiers).where(and(eq(placeIdentifiers.placeId, p.id), eq(placeIdentifiers.provider, "google")));
    const ok = ids.find((i) => i.status === "confirmed") ?? (policy!.allowAuto ? ids.find((i) => i.status === "auto") : undefined);
    if (ok) return { id: ok.externalId };
    if (ids.some((i) => i.status === "auto")) return { none: "auto_not_approved" };
    if (ids.some((i) => i.status === "pending")) return { none: "pending_review" };
    if (ids.some((i) => i.status === "disabled")) return { none: "disabled" };
    return { none: ids.length ? "rejected" : "no_match" };
  } catch { return null; }
}

/** Eşleştirme aramasına izin: içerik çağrısıyla aynı karar, eşleşme henüz olmayabilir. */
export async function googleMatchAllowed(slug: string) {
  const db = getDb();
  if (!db) return false;
  try {
    const [p] = await db.select({ id: places.id }).from(places).where(eq(places.slug, slug)).limit(1);
    return !!p && policyPermits((await latestPolicies(db, [p.id])).get(p.id) ?? null);
  } catch { return false; }
}

/** Google içeriği sayfada açılacak mekânlar. Hata olursa boş liste. */
export async function allowedGoogleSlugs(db: Db) {
  const rows = await db.select({ placeId: places.id, slug: places.slug, status: placeIdentifiers.status }).from(placeIdentifiers).innerJoin(places, eq(places.id, placeIdentifiers.placeId))
    .where(and(eq(placeIdentifiers.provider, "google"), inArray(placeIdentifiers.status, ["auto", "confirmed"])));
  const pol = await latestPolicies(db);
  return [...new Set(rows.filter((r) => { const p = pol.get(r.placeId) ?? null; return policyPermits(p) && (r.status === "confirmed" || p!.allowAuto); }).map((r) => r.slug))].sort();
}

const SetInput = z.object({
  slugs: z.array(z.string().min(1)).min(1), mode: GooglePolicy.shape.mode, priority: GooglePolicy.shape.priority,
  reason: GooglePolicy.shape.reason, admin: GooglePolicy.shape.approvedBy,
  estimatedCostUsd: GooglePolicy.shape.estimatedCostUsd, allowAuto: z.boolean().optional(),
}).strict();

/** Politika yazımı: bütün mekânlar ve denetim kaydı TEK işlemde; biri geçersizse hiçbiri yazılmaz. */
export async function setGooglePolicy(raw: unknown) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "no_db" };
  const parsed = SetInput.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "invalid", issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`) };
  const i = parsed.data;
  if (i.mode === "izinli" && i.priority === "D") return { ok: false as const, error: "d_cannot_be_allowed" };
  const slugs = [...new Set(i.slugs)];
  const found = await db.select({ id: places.id, slug: places.slug }).from(places).where(inArray(places.slug, slugs));
  if (found.length !== slugs.length) return { ok: false as const, error: "unknown_slug", missing: slugs.filter((s) => !found.some((f) => f.slug === s)).slice(0, 10) };
  const now = new Date(), day = now.toISOString().slice(0, 10);
  const policy: GooglePolicy = { mode: i.mode, priority: i.priority, reason: i.reason, approvedBy: i.admin, approvedAt: day, ...(i.estimatedCostUsd !== undefined ? { estimatedCostUsd: i.estimatedCostUsd } : {}), allowAuto: i.allowAuto ?? false, lastReviewedAt: day };
  const rows = found.map((f) => ({ id: uuidv7(), placeId: f.id, field: POLICY_FIELD, value: JSON.stringify(policy), provider: "admin", fetchedAt: now }));
  const auditId = uuidv7();
  await atomic(db, (q) => [
    q.insert(fieldProvenance).values(rows),
    q.insert(auditLog).values({ id: auditId, actor: `admin:${i.admin}`, action: "google_policy_set", refTable: "places", refId: null, detail: { slugs, policy, fieldIds: rows.map((r) => r.id) } }),
  ]);
  return { ok: true as const, auditId, count: rows.length, policy };
}

/** Yönetim özeti: mod ve sınıf dağılımı, politikası olmayan eşleşmeler. */
export async function googlePolicyStats() {
  const db = getDb();
  if (!db) return null;
  const pol = await latestPolicies(db);
  const byMode: Record<string, number> = {}, byPriority: Record<string, number> = {};
  for (const p of pol.values()) { if (!p) continue; byMode[p.mode] = (byMode[p.mode] ?? 0) + 1; byPriority[p.priority] = (byPriority[p.priority] ?? 0) + 1; }
  const matched = await db.select({ placeId: placeIdentifiers.placeId }).from(placeIdentifiers).where(and(eq(placeIdentifiers.provider, "google"), inArray(placeIdentifiers.status, ["auto", "confirmed"])));
  return { byMode, byPriority, withPolicy: pol.size, matchedUsable: new Set(matched.map((m) => m.placeId)).size, allowedNow: (await allowedGoogleSlugs(db)).length };
}
