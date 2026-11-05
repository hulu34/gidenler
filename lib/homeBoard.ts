import { unstable_cache } from "next/cache";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditLog, menuItems, places, reviews, user } from "@/lib/db/schema";
import { realEntities } from "@/data/real";
import { DEMO_VISIBLE } from "@/data/demoFlag";
import { liveCovers, publishedScores, recentlyReviewed } from "@/lib/live";
import { coverOf } from "@/lib/media/cover";
import { computeBoards, dayOf, loadSignalRows, SIGNAL_RULES, type Boards } from "@/lib/signals";
import type { RankItem, RankSection } from "@/lib/rankings";
import { placeOf } from "@/lib/rankings";
import { HOME_EXCLUDE } from "@/components/home/HomeDiscover";

/* ──────────────────────────────────────────────────────────────────────────
   GERÇEK ANA SAYFA PANOSU — demodaki "board" tasarımı, gerçek veriyle.
   Her kolon yalnız kendi gerçek kaynağını okur; veri yetmezse kolon liste UYDURMAZ, nedenini yazar.
   · Haftanın Popülerleri / Yükselenler → lib/signals (gerçek Gidenler etkileşimi; Google sayısı değil)
   · En Yüksek Puanlılar → yalnız yayımlanmış GİDENLER puanı (10 üzerinden). Google puanı buraya karışmaz.
   · En Çok Konuşulanlar → son 30 günde yayımlanan gerçek deneyim sayısı (test/işletme hesabı hariç)
   · Kaynaklı profiller → kaynağı kayıtlı tanıtım/menü bilgisi olan mekânlar (editoryal keşif; sıralama değil)
   Ana sayfa vitrin kuralı: kurucuyla ilişkili mekân (HOME_EXCLUDE) panoda da öne çıkarılmaz.
   ────────────────────────────────────────────────────────────────────────── */

const BY_SLUG = new Map(realEntities.map((e) => [e.slug, e]));
const itemOf = (slug: string, signal: string, score: number | null = null, count = 0): RankItem | null => {
  const e = BY_SLUG.get(slug);
  if (!e || HOME_EXCLUDE.has(slug)) return null;
  return { slug, name: e.name, kind: e.subcategory ?? "Restoran", where: e.location?.district ?? "", place: [e.subcategory, e.location?.district].filter(Boolean).join(" · ") || placeOf(e.location), categoryId: e.categoryId, score, delta: 0, count, reason: signal, signal };
};
const ok = <T,>(x: T | null): x is T => x !== null;

const signalBoards = unstable_cache(async (): Promise<Boards | null> => {
  const db = getDb();
  if (!db || DEMO_VISIBLE) return null;
  try { return computeBoards(await loadSignalRows(db), dayOf(new Date()), (s) => BY_SLUG.has(s) && !HOME_EXCLUDE.has(s)); } catch { return null; }
}, ["home-signal-boards-v1"], { revalidate: 600 });

const talked30 = unstable_cache(async (): Promise<Array<{ slug: string; n: number }>> => {
  const db = getDb();
  if (!db || DEMO_VISIBLE) return [];
  try {
    const since = new Date(Date.now() - 30 * 864e5);
    const rows = await db.select({ slug: places.slug, n: sql<number>`count(*)::int` }).from(reviews)
      .innerJoin(places, eq(places.id, reviews.placeId)).innerJoin(user, eq(user.id, reviews.userId))
      .where(and(eq(reviews.status, "published"), eq(user.kind, "user"), gte(reviews.createdAt, since))).groupBy(places.slug);
    return rows.map((r) => ({ slug: r.slug, n: Number(r.n) })).sort((a, b) => b.n - a.n || a.slug.localeCompare(b.slug));
  } catch { return []; }
}, ["home-talked-30-v1"], { revalidate: 600 });

/* kaynaklı profil = yönetimden kaynağıyla uygulanmış restoran profili (profile_apply denetim kaydı); menü kalemi sayısı derinliktir */
const sourcedProfiles = unstable_cache(async (): Promise<Array<{ slug: string; fields: number }>> => {
  const db = getDb();
  if (!db || DEMO_VISIBLE) return [];
  try {
    const applied = await db.selectDistinct({ id: auditLog.refId }).from(auditLog).where(eq(auditLog.action, "profile_apply"));
    const ids = new Set(applied.map((r) => r.id));
    const menu = await db.select({ placeId: menuItems.placeId, n: sql<number>`count(*)::int` }).from(menuItems).groupBy(menuItems.placeId);
    const depth = new Map(menu.map((m) => [m.placeId, Number(m.n)]));
    const rows = await db.select({ id: places.id, slug: places.slug }).from(places);
    return rows.filter((r) => ids.has(r.id)).map((r) => ({ slug: r.slug, fields: depth.get(r.id) ?? 0 }));
  } catch { return []; }
}, ["home-sourced-profiles-v2"], { revalidate: 3600 });

/** Kaynaklı profillerden tür ve semt dengeli, deterministik seçim (sıralama değil). */
function balancedProfiles(list: Array<{ slug: string; fields: number }>, n: number) {
  const sorted = [...list].filter((x) => BY_SLUG.has(x.slug) && !HOME_EXCLUDE.has(x.slug)).sort((a, b) => b.fields - a.fields || a.slug.localeCompare(b.slug));
  const out: string[] = [], kinds = new Set<string>(), ds = new Set<string>();
  for (const strict of [true, false]) for (const x of sorted) {
    if (out.length >= n || out.includes(x.slug)) continue;
    const e = BY_SLUG.get(x.slug)!; const k = e.subcategory ?? "", d = e.location?.district ?? "";
    if (strict && (kinds.has(k) || ds.has(d))) continue;
    out.push(x.slug); kinds.add(k); ds.add(d);
  }
  return out;
}

/* Kaynaklı keşif seçkisi (veri yetmeyen kolonun yerine): bir türden, her biri farklı semtte gerçek mekânlar.
   Sıralama değildir; kapağı olan önce, sonra kayıt sırası. Sosyal tesis ve kurucuyla ilişkili mekân alınmaz. */
const KIND_THEMES: Array<{ title: string; re: RegExp }> = [
  { title: "Esnaf lokantaları · farklı semtlerden", re: /^Lokanta$/ },
  { title: "Balık · farklı semtlerden", re: /^Balık restoranı$/ },
  { title: "Kebap ve ocakbaşı · farklı semtlerden", re: /^Kebapçı \/ Ocakbaşı$/ },
  { title: "Meyhaneler · farklı semtlerden", re: /^Meyhane$/ },
  { title: "Kahvaltı · farklı semtlerden", re: /^Kahvaltı$/ },
];
function themed(i: number, covers: Record<string, unknown>, n = 4): { title: string; items: RankItem[] } {
  const t = KIND_THEMES[i % KIND_THEMES.length];
  const pool = realEntities.filter((e) => e.categoryId === "cat.restaurant" && t.re.test(e.subcategory ?? "") && !HOME_EXCLUDE.has(e.slug) && !/sosyal tesis/i.test(e.name));
  const ordered = [...pool.filter((e) => coverOf(e, covers[e.slug] as never)), ...pool.filter((e) => !coverOf(e, covers[e.slug] as never))];
  const out: RankItem[] = [], ds = new Set<string>();
  for (const e of ordered) { const d = e.location?.district ?? ""; if (out.length >= n || ds.has(d)) continue; ds.add(d); const it = itemOf(e.slug, ""); if (it) out.push({ ...it, signal: undefined }); }
  return { title: t.title, items: out };
}

export interface RealBoard { sections: Array<RankSection & { note?: string | null; fallback?: { title: string; items: RankItem[] } }>; measuredDays: number }

export async function realBoard(): Promise<RealBoard> {
  const [b, scores, talked, profiles, recent, covers] = await Promise.all([signalBoards(), publishedScores(), talked30(), sourcedProfiles(), recentlyReviewed(), liveCovers()]);
  const recentItems = recent.map((s) => itemOf(s, "deneyim yazıldı")).filter(ok).slice(0, 4);
  const L = SIGNAL_RULES.limit;
  const profilePick = balancedProfiles(profiles, L).map((s) => itemOf(s, "kaynaklı profil")).filter(ok);
  const popular = (b?.popular ?? []).map((x) => itemOf(x.slug, `${x.visitors} ziyaretçi`, scores[x.slug]?.score ?? null)).filter(ok);
  const rising = (b?.rising ?? []).map((x) => itemOf(x.slug, `▲ ${x.points - (x.prev ?? 0)} sinyal`, scores[x.slug]?.score ?? null)).filter(ok);
  const top = Object.entries(scores).filter(([s, v]) => v?.score != null && BY_SLUG.has(s) && !HOME_EXCLUDE.has(s))
    .sort((a, b) => b[1].score! - a[1].score! || b[1].reviewCount - a[1].reviewCount).slice(0, L)
    .map(([s, v]) => itemOf(s, `${v.reviewCount} deneyim`, v.score, v.reviewCount)).filter(ok);
  const talk = talked.filter((x) => x.n >= 2).slice(0, L).map((x) => itemOf(x.slug, `${x.n} deneyim · 30 gün`, scores[x.slug]?.score ?? null, x.n)).filter(ok);
  return {
    measuredDays: b?.days ?? 0,
    sections: [
      { key: "popular", title: "Haftanın popülerleri", window: "Son 7 gün", hint: "Gidenler'deki gerçek ziyaret, kaydetme ve yönlendirmeler; aynı kişinin tekrarı tek sayılır.", items: popular, signalKind: "text",
        note: popular.length ? null : b?.reason.popular ?? "Etkileşim ölçümü bu sürümle başlıyor; yeterli gerçek veri oluşunca liste açılır.",
        fallback: popular.length ? undefined : themed(0, covers) },
      { key: "top", title: "En yüksek puanlılar", window: "Gidenler puanı", hint: "Yalnız gerçek deneyimlerden, yayın eşiğini geçen Gidenler puanı (10 üzerinden). Google puanı buraya katılmaz.", items: top, signalKind: "text",
        note: top.length ? null : "Henüz yayın eşiğini geçen Gidenler puanı yok. Google puanı mekân profilinde, kaynağıyla ayrı gösterilir.",
        fallback: top.length ? undefined : recentItems.length >= 2 ? { title: "Son deneyim yazılanlar", items: recentItems } : themed(1, covers) },
      { key: "talked", title: "En çok konuşulanlar", window: "Son 30 gün", hint: "Son 30 günde yayımlanan gerçek Gidenler deneyimi sayısı.", items: talk, signalKind: "text",
        note: talk.length ? null : "Son 30 günde iki ya da daha çok deneyim yazılan mekân henüz yok.",
        fallback: talk.length ? undefined : themed(2, covers) },
      { key: "rising", title: "Yükselenler", window: "7 gün ↔ önceki 7", hint: "Son 7 günün etkileşimi, önceki 7 günle karşılaştırılır; az veriden yükseliş üretilmez.", items: rising, signalKind: "text",
        note: rising.length ? null : b?.reason.rising ?? "Yükseliş için iki tam haftalık gerçek veri gerekir.",
        fallback: rising.length ? undefined : themed(3, covers) },
      { key: "profiles", title: "Kaynaklı profiller", window: "Editoryal keşif", hint: "Tanıtımı, menüsü ya da kuralları kaynağıyla kayıtlı mekânlar. Sıralama değildir; reklam değildir.", items: profilePick, signalKind: "text",
        note: profilePick.length ? null : "Kaynaklı profil henüz yok.",
        fallback: profilePick.length ? undefined : themed(4, covers) },
    ],
  };
}
