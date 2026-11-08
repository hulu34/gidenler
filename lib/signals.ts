import { createHmac } from "node:crypto";
import { and, gte, lt, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { signalEvents } from "@/lib/db/schema";
import { HOME_LIST } from "@/lib/homeConfig";

/* ──────────────────────────────────────────────────────────────────────────
   KEŞİF SİNYALLERİ — Haftanın Popülerleri ve Yükselenler yalnız GERÇEK Gidenler etkileşiminden.
   · Tür ve ağırlık: profil ziyareti 1 · gitmek istiyorum / kaydet 3 · dış yönlendirme (yol tarifi, ara, web) 2 ·
     yayımlanmış deneyim 5. Google'ın değerlendirme sayısı ya da demo sinyali (weeklySignal) KULLANILMAZ.
   · Tekrar: aynı ziyaretçinin aynı gün aynı mekânda aynı türü tek satırdır (birincil anahtar); yenileme sayıyı artırmaz.
   · Mahremiyet: ziyaretçi = HMAC(sır, gün|ip|tarayıcı) ilk 32 hane. Ham IP/kimlik yazılmaz; gün değişince özet de değişir.
   · Bot ve test: tarayıcı imzası bot/otomasyon olan ya da test erişim başlığı taşıyan istek SAYILMAZ.
   · Eşik: yeterli tekil ziyaretçi ve geçmiş yoksa modül liste ÜRETMEZ; dürüst boş durum gösterir.
   ────────────────────────────────────────────────────────────────────────── */

export const SIGNAL_WEIGHT = { view: 1, save: 3, outbound: 2, review: 5 } as const;
export type SignalKind = keyof typeof SIGNAL_WEIGHT;
export const CLIENT_KINDS: SignalKind[] = ["view", "save", "outbound"];
export const SIGNAL_RULES = {
  /** Popüler listeye girmek için son 7 günde en az bu kadar farklı ziyaretçi-günü. */
  popularMinVisitors: 3,
  /** Liste en az bu kadar mekân yeterliyse gösterilir (tek mekânlık "liste" yapılmaz). */
  minItems: 3,
  /** Yükseliş: iki tam hafta veri, önceki haftada en az bu kadar ağırlıklı sinyal, en az bu oranda ve farkta artış. */
  risingMinPrev: 3, risingMinRatio: 1.5, risingMinGain: 3,
  /** liste boyu: ana sayfa merkezi ayarı (Top 10) */
  limit: HOME_LIST.size,
  keepDays: 35,
};

const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|headless|playwright|puppeteer|lighthouse|pagespeed|curl|wget|python-requests|node-fetch|axios|go-http/i;
export function countable(headers: Headers): boolean {
  const ua = headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return false;
  if (headers.get("x-vercel-protection-bypass") || headers.get("x-gidenler-test")) return false;
  if ((headers.get("purpose") ?? headers.get("sec-purpose") ?? "").includes("prefetch")) return false;
  return true;
}

export const dayOf = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number) => dayOf(new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5));
export function visitorOf(day: string, parts: string[], secret = process.env.BETTER_AUTH_SECRET ?? "gidenler-yerel") {
  return createHmac("sha256", `${secret}:sinyal:${day}`).update(parts.join("|")).digest("hex").slice(0, 32);
}

/** Bir sinyal yaz (tekrarsa sessizce yok sayılır). Ara sıra 35 günden eski satırları siler. */
export async function recordSignal(db: Db, s: { slug: string; kind: SignalKind; who: string[]; now?: Date }) {
  const day = dayOf(s.now ?? new Date());
  await db.insert(signalEvents).values({ day, slug: s.slug, kind: s.kind, visitor: visitorOf(day, s.who) }).onConflictDoNothing();
  if (Math.random() < 0.02) await db.delete(signalEvents).where(lt(signalEvents.day, addDays(day, -SIGNAL_RULES.keepDays)));
}

export interface SignalRow { slug: string; kind: SignalKind; day: string; n: number }
export interface BoardItem { slug: string; points: number; visitors: number; prev?: number }
export interface Boards { popular: BoardItem[]; rising: BoardItem[]; since: string | null; days: number; totalVisitors: number; reason: { popular: string | null; rising: string | null } }

/** Saf hesap (test edilir): son 7 gün popüler, son 7 ↔ önceki 7 gün yükseliş. */
export function computeBoards(rows: SignalRow[], today: string, isReal: (slug: string) => boolean = () => true): Boards {
  const d7 = addDays(today, -6), d14 = addDays(today, -13);
  const since = rows.reduce<string | null>((m, r) => (!m || r.day < m ? r.day : m), null);
  const days = since ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${since}T00:00:00Z`)) / 864e5) + 1 : 0;
  const cur = new Map<string, { points: number; visitors: number }>(), prev = new Map<string, number>();
  let totalVisitors = 0;
  for (const r of rows) {
    if (!isReal(r.slug)) continue;
    const w = SIGNAL_WEIGHT[r.kind] ?? 0;
    if (r.day >= d7 && r.day <= today) {
      const c = cur.get(r.slug) ?? { points: 0, visitors: 0 };
      c.points += w * r.n; if (r.kind === "view") { c.visitors += r.n; totalVisitors += r.n; }
      cur.set(r.slug, c);
    } else if (r.day >= d14 && r.day < d7) prev.set(r.slug, (prev.get(r.slug) ?? 0) + w * r.n);
  }
  const R = SIGNAL_RULES;
  const popularAll = [...cur].filter(([, c]) => c.visitors >= R.popularMinVisitors).map(([slug, c]) => ({ slug, ...c }))
    .sort((a, b) => b.points - a.points || b.visitors - a.visitors || a.slug.localeCompare(b.slug));
  const popular = popularAll.length >= R.minItems ? popularAll.slice(0, R.limit) : [];
  const enoughHistory = days >= 14;
  const risingAll = enoughHistory ? [...cur].map(([slug, c]) => ({ slug, points: c.points, visitors: c.visitors, prev: prev.get(slug) ?? 0 }))
    .filter((x) => x.prev >= R.risingMinPrev && x.points >= x.prev * R.risingMinRatio && x.points - x.prev >= R.risingMinGain && x.visitors >= R.popularMinVisitors)
    .sort((a, b) => (b.points - b.prev!) - (a.points - a.prev!) || a.slug.localeCompare(b.slug)) : [];
  const rising = risingAll.length >= R.minItems ? risingAll.slice(0, R.limit) : [];
  return {
    popular, rising, since, days, totalVisitors,
    reason: {
      popular: popular.length ? null : `Son 7 günde en az ${R.popularMinVisitors} farklı ziyaretçinin baktığı ${R.minItems} mekân oluşunca liste açılır.`,
      rising: rising.length ? null : !enoughHistory ? `Yükseliş için iki tam haftalık veri gerekir; ölçüm ${days ? `${days} gündür` : "yeni"} sürüyor.` : `Önceki haftaya göre belirgin artış gösteren ${R.minItems} mekân henüz yok.`,
    },
  };
}

/** Son 14 günün satırlarını gün × mekân × tür sayısı olarak okur. */
export async function loadSignalRows(db: Db, today = dayOf(new Date())): Promise<SignalRow[]> {
  const rows = await db.select({ slug: signalEvents.slug, kind: signalEvents.kind, day: signalEvents.day, n: sql<number>`count(*)::int` })
    .from(signalEvents).where(and(gte(signalEvents.day, addDays(today, -13)))).groupBy(signalEvents.slug, signalEvents.kind, signalEvents.day);
  return rows.map((r) => ({ ...r, kind: r.kind as SignalKind, n: Number(r.n) }));
}
