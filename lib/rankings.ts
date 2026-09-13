import { experiences } from "@/data/experiences";
import { getUser } from "@/data/users";
import { getEntityById } from "@/data/entities";
import { getCategory } from "@/data/categories";
import { getTopicIntelligence, listCards, type EntityCard } from "@/lib/api";
import { changeInsight, talkInsight } from "@/lib/editorial";
import { getPersonalMatch, getDecision } from "@/lib/decision";
import { CONFIDENCE_LABEL } from "@/lib/semantic";
import { nf } from "@/lib/format";
import type { Entity, User } from "@/lib/types";

/* ──────────────────────────────────────────────────────────────────────────
   ANA SAYFA SIRALAMALARI — "Ne arıyorsun? Bunlara bak."
   Beş omurga: Haftanın popülerleri · En yüksek puanlılar · En çok konuşulanlar ·
   Yükselişteler · Uzmanların seçtikleri (+ Sana göre). Her biri TOP 5.
   Puan modeline dokunmaz; yalnızca seçer ve sıralar. Eşikler tek yerde.
   ────────────────────────────────────────────────────────────────────────── */

export const RANK_CONFIG = {
  /** En yüksek puanlılar: bu kadar deneyimden azı ve "sınırlı veri" güveni listeye giremez. */
  topRated: { minExperiences: 60, minConfidence: "medium" as "medium" | "high" },
  /** Yükselişteler: az veriden büyük hareket üretilmez. */
  rising: { minExperiences: 40, minDelta: 0.2, maxDelta: 1.6, window: "Son 90 gün" },
  /** En çok konuşulanlar: son dönem deneyim etkinliği. */
  talked: { minExperiences: 20, window: "Son 30 gün" },
  /** Haftanın popülerleri: son 7 gün etkileşim (demo sinyali). */
  popular: { minExperiences: 20, window: "Son 7 gün" },
  /** Uzmanların seçtikleri: en az bu kadar uzman deneyimi. */
  experts: { minExpertExperiences: 1 },
  /** Uzman deneyiminin düşük sayılmaması için alt puan. */
  expertMinScore: 7.0,
  limit: 5,
};

/* ───── kategori aileleri (seçici) ───── */
export type HomeCategoryKey = "all" | "restaurant" | "cafe" | "hotel" | "culture" | "travel" | "other";
export type OtherKey = "bar" | "kuafor" | "spor" | "spa" | "cowork" | "physician" | "dentist" | "lawyer";

export const HOME_CATEGORIES: Array<{ key: HomeCategoryKey; label: string; cats: string[] }> = [
  { key: "all", label: "Tümü", cats: [] },
  { key: "restaurant", label: "Restoran", cats: ["cat.restaurant"] },
  { key: "cafe", label: "Kahve", cats: ["cat.cafe"] },
  { key: "hotel", label: "Otel", cats: ["cat.hotel"] },
  { key: "culture", label: "Kültür", cats: ["cat.culture", "cat.show", "cat.venue", "cat.film"] },
  { key: "travel", label: "Gezi", cats: ["cat.travel", "cat.place"] },
  { key: "other", label: "Diğer", cats: [] },
];

/** "Diğer" altındaki ikincil seçici — yalnızca evrende verisi olanlar. */
export const OTHER_CATEGORIES: Array<{ key: OtherKey; label: string; cats: string[]; subcategory?: string; regulated?: boolean }> = [
  { key: "bar", label: "Barlar", cats: ["cat.bar"] },
  { key: "kuafor", label: "Kuaför & Berber", cats: ["cat.service"], subcategory: "Kuaför|Berber" },
  { key: "spor", label: "Spor Salonları", cats: ["cat.service"], subcategory: "Spor salonu" },
  { key: "spa", label: "Spa & Hamam", cats: ["cat.service"], subcategory: "Spa / Hamam" },
  { key: "cowork", label: "Coworking", cats: ["cat.service"], subcategory: "Coworking" },
  { key: "physician", label: "Doktorlar", cats: ["cat.physician"], regulated: true },
  { key: "dentist", label: "Diş Hekimleri", cats: ["cat.dentist"], regulated: true },
  { key: "lawyer", label: "Avukatlar", cats: ["cat.lawyer"], regulated: true },
];

const inIstanbul = (c: EntityCard) => (c.entity.location?.city ?? "İstanbul") === "İstanbul";
const CONF_RANK = { low: 0, medium: 1, high: 2 } as const;

function matchesSelector(c: EntityCard, sel: { cats: string[]; subcategory?: string }): boolean {
  if (sel.cats.length && !sel.cats.includes(c.entity.categoryId)) return false;
  if (sel.subcategory) {
    const re = new RegExp(`^(${sel.subcategory})$`);
    if (!re.test(c.entity.subcategory ?? "")) return false;
  }
  return true;
}

/* ───── kart verisi: serileştirilebilir, küçük ───── */
export interface RankItem {
  slug: string; name: string; kind: string; where: string; categoryId: string;
  /** Konum bağlamı "Semt · İl" (semt yoksa yalnızca il; ikisi de yoksa boş — başlıkta gösterilmez). */
  place: string;
  score: number | null; delta: number; count: number; confidence?: string;
  /** Tek neden — kartın cümlesi. */
  reason: string;
  /** Uzman/popüler gibi bölümlere özel küçük kanıt ("3 uzman deneyimi", "son 7 günde 41 kaydetme"). */
  evidence?: string;
  /** Kompakt board için TEK destekleyici sinyal — sıralamanın nedenini söyler ("125 etkileşim", "Yüksek güven"). */
  signal?: string;
  match?: number;
}

/** "Kadıköy · İstanbul" — filmler gibi konumsuz kayıtlarda boş kalır, "· İstanbul" gibi kırık parça üretmez. */
export function placeOf(loc: Entity["location"] | undefined): string {
  if (!loc) return "";
  return [loc.district, loc.city].filter((x): x is string => !!x && x.trim() !== "").join(" · ");
}

function itemOf(c: EntityCard, reason: string, evidence?: string, signal?: string): RankItem {
  const loc = c.entity.location;
  const where = loc?.district ? `${loc.city && loc.city !== "İstanbul" ? `${loc.city} · ` : ""}${loc.district}` : loc?.city && loc.city !== "İstanbul" ? loc.city : "";
  return {
    slug: c.entity.slug, name: c.entity.name, kind: c.entity.subcategory ?? c.category.label, where, place: placeOf(loc), categoryId: c.entity.categoryId,
    score: c.score, delta: c.delta90d, count: c.experienceCount,
    confidence: c.confidence && c.score !== null ? CONFIDENCE_LABEL[c.confidence] : undefined,
    reason, evidence, signal,
  };
}

/**
 * Kategori dengesi ("Tümü"nde aynı kategoriden en fazla iki) + veri zenginliği:
 * önce A/B katmanı (deneyim metni olanlar), yetmezse keşif kayıtları (C) tamamlar.
 */
function balanced(cards: EntityCard[], limit: number, all: boolean): EntityCard[] {
  const rich = cards.filter((c) => c.entity.tier !== "C"); const rest = cards.filter((c) => c.entity.tier === "C");
  const ordered = [...rich, ...rest];
  if (!all) return ordered.slice(0, limit);
  const out: EntityCard[] = []; const seen = new Map<string, number>();
  for (const c of ordered) {
    const k = c.entity.categoryId; const n = seen.get(k) ?? 0;
    if (n >= 2) continue;
    out.push(c); seen.set(k, n + 1);
    if (out.length >= limit) break;
  }
  return out;
}

/* ───── sinyaller ───── */
function hash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }

/** Son 30 gün deneyim sayısı — zaman çizelgesinin son dönemi. */
function last30(c: EntityCard): number {
  const it = getTopicIntelligence(c.entity.id);
  const tl = it?.timeline ?? [];
  return tl.length ? tl[tl.length - 1].experienceCount : Math.round(c.experienceCount / 12);
}

/**
 * Son 7 gün etkileşimi — DEMO SİNYALİ. Prototipte gerçek telemetri yok; kaydetme / gitmek istiyorum /
 * liste ekleme sayıları kimlikten deterministik türetilir ve son 30 gün deneyim etkinliğiyle harmanlanır.
 * Popülerlik kalite değildir: 7,4 puanlı bir yer çok popüler olabilir.
 */
export function weeklySignal(entityId: string, count30: number, score = 7): { saves: number; wants: number; lists: number; experiences7: number; total: number } {
  const h = hash("week:" + entityId);
  const experiences7 = Math.max(1, Math.round(count30 / 4));
  /* Kaydetme/niyet puanla ilişkili (kötü yer az kaydedilir); deneyim yazımı değildir — ikisi ayrı sinyal. */
  const q = Math.max(0.35, Math.min(1.3, score / 8));
  const saves = Math.round(experiences7 * (0.8 + ((h >>> 0) % 100) / 60) * q);
  const wants = Math.round(experiences7 * (0.5 + ((h >>> 8) % 100) / 80) * q);
  const lists = Math.round(experiences7 * (0.1 + ((h >>> 16) % 100) / 400));
  return { saves, wants, lists, experiences7, total: experiences7 * 2 + saves + wants * 1.5 + lists * 3 };
}

/* ───── uzman deneyimleri: entity → uzman yazarlar ───── */
function isExpertFor(user: User, entity: Entity): boolean {
  const facets = (entity.facets ?? []).map((f) => f.toLocaleLowerCase("tr"));
  const cat = getCategory(entity.categoryId)?.label.toLocaleLowerCase("tr");
  return user.expertise.some((x) => {
    if (x.level === "gelişiyor") return false;
    const l = x.label.toLocaleLowerCase("tr");
    /* Semt uzmanlığı tek başına yetmez: kahve uzmanı kahveciyi, yemek uzmanı restoranı seçer. */
    if (x.scope === "location") return false;
    if (x.scope === "category") return l === cat || facets.includes(l);
    if (x.scope === "facet_location") return facets.includes(l.split(" · ")[0]) || facets.includes(l);
    return facets.includes(l);
  });
}

let expertIndex: Map<string, { authors: Set<string>; n: number; sum: number }> | null = null;
/** Karar motoru için: bir kaydın uzman deneyim sinyali (uzman sayısı, deneyim sayısı, uzman ortalaması). */
export function expertSignal(entityId: string): { authors: number; n: number; avg: number } | null {
  const x = expertsByEntity().get(entityId); if (!x) return null;
  return { authors: x.authors.size, n: x.n, avg: Math.round((x.sum / x.n) * 10) / 10 };
}
function expertsByEntity() {
  if (expertIndex) return expertIndex;
  expertIndex = new Map();
  for (const e of experiences) {
    if (e.state !== "published") continue;
    const entity = getEntityById(e.entityId); const u = getUser(e.authorId);
    if (!entity || !u || !isExpertFor(u, entity)) continue;
    const dims = Object.values(e.ratings); const overall = dims.length ? dims.reduce((a, b) => a + b, 0) / dims.length : 0;
    const cur = expertIndex.get(e.entityId) ?? { authors: new Set<string>(), n: 0, sum: 0 };
    cur.authors.add(u.id); cur.n += 1; cur.sum += overall;
    expertIndex.set(e.entityId, cur);
  }
  return expertIndex;
}

/* ───── bölümler ───── */
export interface RankSection {
  key: string; title: string; hint: string; window?: string; items: RankItem[]; seeAll?: string;
  /** Sinyal bir trend ise (Yükselişteler) trend rengiyle basılır; puan rengiyle karışmaz. */
  signalKind?: "trend" | "match" | "text";
}

export interface HomeRankings {
  regulated: false;
  sections: RankSection[];
}
export interface RegulatedHome {
  regulated: true;
  label: string;
  mostShared: RankItem[];
  latest: Array<{ slug: string; name: string; kind: string; where: string; body: string; date: string; verified: boolean }>;
  branches: Array<{ label: string; count: number; href: string }>;
  districts: Array<{ label: string; count: number; href: string }>;
  note: string;
}

/** "Tümünü gör →": tek kategori → kategori sayfası (sıralama + İstanbul + alt tür); karma → Keşfet. */
const seeAll = (sel: { cats: string[]; subcategory?: string }, sort: string) => {
  if (sel.cats.length !== 1) return "/kesfet/";
  const slug = getCategory(sel.cats[0])?.slug; if (!slug) return "/kesfet/";
  const alt = sel.subcategory && !sel.subcategory.includes("|") ? `&alt=${encodeURIComponent(sel.subcategory)}` : "";
  return `/kategori/${slug}/?sirala=${sort}&sehir=${encodeURIComponent("İstanbul")}${alt}`;
};

export function buildRankings(sel: { cats: string[]; subcategory?: string }, opts: { all: boolean } = { all: false }): HomeRankings {
  const L = RANK_CONFIG.limit;
  const pool = listCards().filter(inIstanbul).filter((c) => c.category.compliance.showScores && c.score !== null).filter((c) => matchesSelector(c, sel));

  /* 1 · Haftanın popülerleri */
  const popular = balanced(
    [...pool].filter((c) => c.experienceCount >= RANK_CONFIG.popular.minExperiences)
      .map((c) => ({ c, w: weeklySignal(c.entity.id, last30(c), c.score ?? 7) }))
      .sort((a, b) => b.w.total - a.w.total).map((x) => x.c),
    L, opts.all,
  ).map((c) => {
    const w = weeklySignal(c.entity.id, last30(c), c.score ?? 7);
    return itemOf(c, talkInsight(c, getTopicIntelligence(c.entity.id)), `${nf(w.saves)} kaydetme · ${nf(w.wants)} gitme niyeti · ${nf(w.experiences7)} yeni deneyim`, `${nf(Math.round(w.total))} etkileşim`);
  });

  /* 2 · En yüksek puanlılar — kanıt eşiği */
  const top = balanced(
    [...pool].filter((c) => c.experienceCount >= RANK_CONFIG.topRated.minExperiences && CONF_RANK[c.confidence ?? "low"] >= CONF_RANK[RANK_CONFIG.topRated.minConfidence])
      .sort((a, b) => (b.score! - a.score!) || (b.experienceCount - a.experienceCount)),
    L, opts.all,
  ).map((c) => itemOf(c, talkInsight(c, getTopicIntelligence(c.entity.id)), undefined, c.confidence ? CONFIDENCE_LABEL[c.confidence] : undefined));

  /* 3 · En çok konuşulanlar — son 30 gün deneyim etkinliği */
  const talked = balanced(
    [...pool].filter((c) => c.experienceCount >= RANK_CONFIG.talked.minExperiences)
      .sort((a, b) => last30(b) - last30(a) || b.experienceCount - a.experienceCount),
    L, opts.all,
  ).map((c) => {
    const it = getTopicIntelligence(c.entity.id);
    const verified = Math.round(last30(c) * (it?.verifiedRatio ?? 0));
    return itemOf(c, talkInsight(c, it), `son 30 günde ${nf(last30(c))} deneyim · ${nf(verified)} doğrulanmış`, `${nf(last30(c))} yeni deneyim`);
  });

  /* 4 · Yükselişteler — en anlamlı pozitif hareket */
  const rising = balanced(
    [...pool].filter((c) => c.experienceCount >= RANK_CONFIG.rising.minExperiences && c.delta90d >= RANK_CONFIG.rising.minDelta && c.delta90d <= RANK_CONFIG.rising.maxDelta)
      .sort((a, b) => (b.delta90d * Math.log10(b.experienceCount)) - (a.delta90d * Math.log10(a.experienceCount))),
    L, opts.all,
  ).map((c) => itemOf(c, changeInsight(getTopicIntelligence(c.entity.id), "up"), undefined, `↑ +${c.delta90d.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`));

  /* 5 · Uzmanların seçtikleri — takipçi değil, uzmanlık + gerçek deneyim */
  const ex = expertsByEntity();
  const experts = balanced(
    [...pool].filter((c) => (ex.get(c.entity.id)?.n ?? 0) >= RANK_CONFIG.experts.minExpertExperiences && (ex.get(c.entity.id)!.sum / ex.get(c.entity.id)!.n) >= RANK_CONFIG.expertMinScore)
      .sort((a, b) => { const A = ex.get(a.entity.id)!, B = ex.get(b.entity.id)!; return (B.authors.size - A.authors.size) || (B.sum / B.n - A.sum / A.n); }),
    L, opts.all,
  ).map((c) => {
    const x = ex.get(c.entity.id)!;
    const avg = (x.sum / x.n).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return itemOf(c, talkInsight(c, getTopicIntelligence(c.entity.id)), `${x.authors.size} uzman · ${x.n} uzman deneyimi · uzman ortalaması ${avg}`, `${x.authors.size} uzman · ${avg}`);
  });

  const sections: RankSection[] = [
    { key: "populer", title: "Haftanın popülerleri", hint: "Son 7 günün etkileşimi: kaydetme, gitme niyeti, yeni deneyim. Popülerlik puan değildir.", window: RANK_CONFIG.popular.window, items: popular, seeAll: seeAll(sel, "konusulan") },
    { key: "en-yuksek", title: "En yüksek puanlılar", hint: `Gidenler puanına göre; en az ${RANK_CONFIG.topRated.minExperiences} deneyim ve orta güven şartı. Az veriyle 9,8 burada görünmez.`, items: top, seeAll: seeAll(sel, "puan") },
    { key: "konusulan", title: "En çok konuşulanlar", hint: "Son 30 günde en çok deneyim yazılanlar; sayfa görüntüleme değil.", window: RANK_CONFIG.talked.window, items: talked, seeAll: seeAll(sel, "konusulan") },
    { key: "yukselen", title: "Yükselişteler", hint: `${RANK_CONFIG.rising.window}de en anlamlı pozitif hareket; en az ${RANK_CONFIG.rising.minExperiences} deneyim.`, window: RANK_CONFIG.rising.window, items: rising, seeAll: seeAll(sel, "yukselen"), signalKind: "trend" as const },
    { key: "uzman", title: "Uzmanların seçtikleri", hint: "Bu alanda uzmanlığı kanıtlanmış kişilerin yazdığı deneyimler. Takipçi sayısı ölçü değildir.", items: experts },
  ]; /* boş bölüm de kolon olarak kalır (board sabit 3+3); UI "yeterli veri yok" yazar */

  return { regulated: false, sections };
}

/** Sana göre — Zevk profili varsa. Sunum/demo profili çağıran yüzey karar verir. */
export function forYouRanking(sel: { cats: string[]; subcategory?: string }, limit = RANK_CONFIG.limit): RankItem[] {
  return listCards().filter(inIstanbul).filter((c) => c.score !== null && c.entity.tier !== "C").filter((c) => matchesSelector(c, sel))
    .map((c) => ({ c, m: getPersonalMatch(c.entity.id), d: getDecision(c.entity.id) }))
    .filter((x) => x.m && x.d)
    .sort((a, b) => b.m!.score - a.m!.score)
    .slice(0, limit)
    .map(({ c, m, d }) => ({ ...itemOf(c, d!.reasons[0]?.text ?? talkInsight(c, getTopicIntelligence(c.entity.id)), d!.verdictText ?? d!.verdict, `%${m!.score} sana göre`), match: m!.score }));
}

/* ───── regüle: doktor / diş hekimi / avukat — sıralama yok, yalnızca deneyim ───── */
export function buildRegulated(sel: { key: OtherKey; label: string; cats: string[] }): RegulatedHome {
  const cards = listCards().filter(inIstanbul).filter((c) => sel.cats.includes(c.entity.categoryId));
  const branchOf = (e: Entity) => (e.name.match(/\(([^·)]+) ·/)?.[1] ?? e.facets?.[0] ?? e.subcategory ?? "").trim();
  const mostShared = [...cards].sort((a, b) => b.experienceCount - a.experienceCount).slice(0, RANK_CONFIG.limit).map((c) => {
    const it = getTopicIntelligence(c.entity.id);
    const verified = Math.round(c.experienceCount * (it?.verifiedRatio ?? 0));
    const item = itemOf(c, "", `${nf(c.experienceCount)} deneyim · ${nf(verified)} doğrulanmış`);
    return { ...item, kind: `${branchOf(c.entity)}`.replace(/^./, (ch) => ch.toLocaleUpperCase("tr")), score: null, reason: "" };
  });
  const ids = new Set(cards.map((c) => c.entity.id));
  const latest = experiences.filter((e) => e.state === "published" && ids.has(e.entityId)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 3).map((e) => {
    const en = getEntityById(e.entityId)!;
    return { slug: en.slug, name: en.name, kind: branchOf(en), where: en.location?.district ?? "", body: e.body, date: e.visitedAt, verified: e.verification.verified };
  });
  const byBranch = new Map<string, number>(); const byDistrict = new Map<string, number>();
  for (const c of cards) {
    const b = branchOf(c.entity); if (b) byBranch.set(b, (byBranch.get(b) ?? 0) + 1);
    const d = c.entity.location?.district; if (d) byDistrict.set(d, (byDistrict.get(d) ?? 0) + 1);
  }
  const cat = sel.cats[0];
  const branches = [...byBranch].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count, href: `/ara/?kategori=${cat}&q=${encodeURIComponent(label)}` }));
  const districts = [...byDistrict].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count, href: `/ara/?kategori=${cat}&sehir=İstanbul&semt=${encodeURIComponent(label)}` }));
  return {
    regulated: true, label: sel.label, mostShared, latest, branches, districts,
    note: "Bu kategoride puan, sıralama, 'en iyi' listesi, kişisel uyum ve reklam yoktur. Deneyimler nötr sayımla gösterilir; karar hekimle/avukatla görüşerek verilir.",
  };
}
