/* ==========================================================================
   SERVİS KATMANI (sahte backend)
   --------------------------------------------------------------------------
   Sayfalar ve bileşenler veriye ASLA doğrudan dokunmaz. Gerçek backend
   geldiğinde bu dosyanın gövdesi fetch'e döner; imzalar ve sözleşmeler
   (TopicIntelligence, CreatorProfileView, BusinessDashboardView) aynı kalır.
   ========================================================================== */

import { categories, getCategory, getSchema } from "@/data/categories";
import { entities, getEntity, getEntityById } from "@/data/entities";
import { experiences, visits, type RawExperience } from "@/data/experiences";
import { users, getUser, getUserByHandle, creators } from "@/data/users";
import { lists, getList, listsByAuthor } from "@/data/lists";
import { externalByEntity, enabledProviders } from "@/data/externalSources";
import { universeStats, slugify } from "@/data/universe";
import { timelines, distributions } from "@/data/timelines";
import { aiSummaries, praisedThemes, complaintThemes } from "@/data/insights";
import { indices, expectations } from "@/data/market";

import type {
  BusinessDashboardView, Category, ConfidenceLevel, Consensus, CreatorProfileView,
  ExperienceIndex, ExperienceVolume, Momentum, PeriodChange, TrendPeriod,
  DimensionTrend, Entity, Experience, ExperienceWithAuthor, ExternalSource,
  Perspective, RatingSchema, SearchResults, TimelinePoint, TopicIntelligence,
  TopicView, User, Visit,
} from "@/lib/types";

const round1 = (n: number) => Math.round(n * 10) / 10;
function hashSeed(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const TODAY = new Date("2026-09-01T00:00:00Z");

/* ─────────────────────────────── temel ─────────────────────────────────── */

export function overallOf(e: RawExperience): number {
  const vals = Object.values(e.ratings);
  return vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}
const hydrate = (e: RawExperience): Experience => ({ ...e, overall: overallOf(e) });

const withAuthor = (e: Experience): ExperienceWithAuthor => ({
  ...e,
  author: getUser(e.authorId) as User,
});

export const listCategories = (): Category[] => categories;
export const listEntities = (): Entity[] => entities;
export const listCreators = (): User[] => creators();
export const listVisits = (): Visit[] => visits;

const expByEntity = new Map<string, RawExperience[]>();
for (const e of experiences) { if (e.state !== "published") continue; const a = expByEntity.get(e.entityId) ?? []; a.push(e); expByEntity.set(e.entityId, a); }
function publishedOf(entityId: string): Experience[] {
  return (expByEntity.get(entityId) ?? [])
    .map(hydrate)
    .sort((a, b) => (a.visitedAt < b.visitedAt ? 1 : -1));
}

/** Bir kullanıcı uzman mı? Reputation değil, *bu kategoride* uzmanlık. */
function isExpertFor(user: User, entity: Entity): boolean {
  const facets = entity.facets ?? [];
  const district = entity.location?.district;
  return user.expertise.some(
    (x) =>
      x.level !== "gelişiyor" &&
      (facets.some((f) => f.toLocaleLowerCase("tr") === x.label.toLocaleLowerCase("tr")) ||
        (district && district.toLocaleLowerCase("tr") === x.label.toLocaleLowerCase("tr"))),
  );
}

/* ───────────────────────── ağırlıklandırma ─────────────────────────────── */
/**
 * NOT: Gerçek skor motoru backend'e aittir. Buradaki ağırlıklandırma
 * yalnızca prototipin tutarlı davranması içindir ve production formülü
 * varsaymaz. Kural sabittir: dış kaynaklar bu hesaba GİRMEZ.
 */
function weightOf(e: Experience): number {
  const months = (TODAY.getTime() - new Date(e.visitedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
  const recency = Math.max(0.35, 1 - months / 24);
  const verified = e.verification.verified ? 1.35 : 1;
  const author = getUser(e.authorId);
  const trust = author ? 0.85 + (author.reputation.score / 100) * 0.4 : 1;
  // Ticari ilişkisi beyan edilmiş deneyimler puana daha az etki eder.
  const commercial =
    e.disclosure.relationship === "none" ? 1 :
    e.disclosure.relationship === "unknown" ? 0.6 : 0.5;
  return recency * verified * trust * commercial;
}

/* ───────────────────────────── consensus ───────────────────────────────── */

function consensusOf(entityId: string): Consensus | null {
  const dist = distributions[entityId];
  if (!dist) return null;
  const total = dist.reduce((a, b) => a + b, 0);
  if (!total) return null;

  const mean = dist.reduce((a, c, i) => a + c * (i + 1), 0) / total;
  const variance = dist.reduce((a, c, i) => a + c * Math.pow(i + 1 - mean, 2), 0) / total;
  const sd = Math.sqrt(variance);
  // 1–10 ölçeğinde ~3.0 sd tam dağınık kabul edilir.
  const polarization = Math.min(1, sd / 3);

  const level: Consensus["level"] =
    polarization < 0.42 ? "birlik" : polarization < 0.62 ? "karışık" : "bölünmüş";

  // Uçlardaki yığılma "seven çok seviyor" durumunu ayırır.
  const lowEnd = (dist[0] + dist[1] + dist[2] + dist[3]) / total;
  const highEnd = (dist[7] + dist[8] + dist[9]) / total;

  const note =
    level === "birlik"
      ? "Deneyimler birbirine yakın; herkes aşağı yukarı aynı şeyi anlatıyor."
      : level === "bölünmüş" && lowEnd > 0.25 && highEnd > 0.25
        ? "Deneyimler bölünmüş: bir grup hâlâ çok memnun, bir grup tamamen vazgeçmiş."
        : level === "bölünmüş"
          ? "Deneyimler dağınık; ortalama tek başına yanıltıcı olabilir."
          : "Görüşler çoğunlukla yakın, ama azımsanmayacak bir azınlık ayrışıyor.";

  return { level, polarization: round1(polarization * 100) / 100, distribution: dist, note };
}

/* ──────────────── EXPERIENCE MARKET / TREND KATMANI ────────────────────
   Bir mekân bugünkü puanı değil, bir zaman serisidir.
   Aşağıdaki hesaplar prototip içindir; production motoru backend'e aittir.
   ---------------------------------------------------------------------- */

const PERIOD_STEPS: Array<{ period: TrendPeriod; label: string; months: number }> = [
  { period: "30d", label: "30G", months: 1 },
  { period: "90d", label: "90G", months: 3 },
  { period: "6m", label: "6A", months: 6 },
  { period: "1y", label: "1Y", months: 12 },
  { period: "all", label: "Tümü", months: 999 },
];

function periodChangesOf(tl: TimelinePoint[]): PeriodChange[] {
  if (tl.length < 2) return [];
  const last = tl[tl.length - 1].score;
  return PERIOD_STEPS.map(({ period, label, months }) => {
    const back = Math.min(months, tl.length - 1);
    const sufficient = months === 999 ? tl.length >= 3 : tl.length - 1 >= months;
    const base = tl[tl.length - 1 - back].score;
    const delta = round1(last - base);
    const deltaPct = base ? Math.round(((last - base) / base) * 1000) / 10 : 0;
    return {
      period, label, delta, deltaPct, sufficient,
      direction: delta > 0.1 ? "up" : delta < -0.1 ? "down" : "flat",
    } as PeriodChange;
  });
}

/**
 * Momentum: yalnızca son değişim değil, değişimin hızlanıp hızlanmadığı.
 * Son üç ay ile önceki üç ayın eğimini karşılaştırır.
 */
function momentumOf(tl: TimelinePoint[]): Momentum {
  if (tl.length < 4) return "stable";
  const n = tl.length;
  const recent = tl[n - 1].score - tl[Math.max(0, n - 4)].score;
  const prior = tl[Math.max(0, n - 4)].score - tl[Math.max(0, n - 7)].score;
  const accel = recent - prior;
  if (recent > 0.15 && accel > 0.1) return "strong_up";
  if (recent > 0.15) return "up";
  if (recent < -0.15 && accel < -0.1) return "strong_down";
  if (recent < -0.15) return "down";
  return "stable";
}

function volumeOf(tl: TimelinePoint[]): ExperienceVolume {
  const n = tl.length;
  const count = n ? tl[n - 1].experienceCount : 0;
  const prev = n >= 2 ? tl[n - 2].experienceCount : count;
  const changePct = prev ? Math.round(((count - prev) / prev) * 100) : 0;
  return {
    period: "30d", label: "Son 30 gün", count, changePct,
    direction: changePct > 4 ? "up" : changePct < -4 ? "down" : "flat",
  };
}

export const listIndices = (): ExperienceIndex[] => indices;

function confidenceOf(count: number, verifiedRatio: number): ConfidenceLevel {
  if (count >= 100 && verifiedRatio >= 0.4) return "high";
  if (count >= 30) return "medium";
  return "low";
}

/* ─────────────────────── TOPIC INTELLIGENCE ────────────────────────────── */

const intelCache = new Map<string, TopicIntelligence | null>();
export function getTopicIntelligence(entityId: string): TopicIntelligence | null {
  if (intelCache.has(entityId)) return intelCache.get(entityId)!;
  const v = computeIntelligence(entityId);
  intelCache.set(entityId, v);
  return v;
}
function computeIntelligence(entityId: string): TopicIntelligence | null {
  const entity = getEntityById(entityId);
  if (!entity) return null;
  const category = getCategory(entity.categoryId);
  const schema = category && getSchema(category.ratingSchemaId);
  if (!category || !schema) return null;

  const c = category.compliance;
  const list = publishedOf(entityId);
  const tl: TimelinePoint[] = timelines[entityId] ?? [];

  /* Evren kayıtları: deneyim metni olmayan (C katmanı) varlıklar için üretilmiş istatistik tek kaynaktır. */
  const st = universeStats[entityId];
  const experienceCount = entity.experienceTotal ?? list.length;
  const verifiedRatio = st ? st.verifiedRatio : list.length
    ? list.filter((e) => e.verification.verified).length / list.length
    : 0;

  /* --- alt puanlar + trend --- */
  const ratingDimensions = schema.dimensions.map((d) => {
    const vals = list.filter((e) => e.ratings[d.key] != null);
    const w = vals.reduce((a, e) => a + weightOf(e), 0);
    const value = w
      ? round1(vals.reduce((a, e) => a + e.ratings[d.key] * weightOf(e), 0) / w)
      : 0;

    const recent = vals.filter((e) => e.visitedAt >= "2026-06-01");
    const prior = vals.filter((e) => e.visitedAt < "2026-06-01");
    const avg = (arr: Experience[]) =>
      arr.length ? arr.reduce((a, e) => a + e.ratings[d.key], 0) / arr.length : value;

    const sufficient = recent.length >= 3 && prior.length >= 3;
    const delta = sufficient ? round1(avg(recent) - avg(prior)) : 0;
    const trend: DimensionTrend = {
      key: d.key,
      delta,
      sufficient,
      direction: !sufficient ? "flat" : delta > 0.25 ? "up" : delta < -0.25 ? "down" : "flat",
    };
    if (st) {
      /* Sentetik kayıt: boyut değeri üretilmiş istatistikten; deneyimler varsa küçük bir ağırlıkla karıştırılır. */
      const sv = st.dims[d.key] ?? st.score;
      const mixed = value ? round1((sv * 3 + value) / 4) : sv;
      const sd = round1(Math.abs(st.delta) > 0.3 ? st.delta * (0.6 + (hashSeed(entityId + d.key) % 5) / 10) : (hashSeed(entityId + d.key) % 7 - 3) / 10);
      const st2: DimensionTrend = { key: d.key, delta: sd, sufficient: experienceCount >= 30, direction: experienceCount < 30 ? "flat" : sd > 0.25 ? "up" : sd < -0.25 ? "down" : "flat" };
      return { key: d.key, label: d.label, value: mixed, trend: st2 };
    }
    return { key: d.key, label: d.label, value, trend };
  });

  /* --- manşet puan: sürdürülen aylık toplamın son değeri --- */
  const totalW = list.reduce((a, e) => a + weightOf(e), 0);
  const computed = totalW
    ? round1(list.reduce((a, e) => a + e.overall * weightOf(e), 0) / totalW)
    : 0;
  const overallScore = c.showScores ? (tl.length ? tl[tl.length - 1].score : computed) : null;

  const delta90 = tl.length >= 4 ? round1(tl[tl.length - 1].score - tl[tl.length - 4].score) : 0;

  /* --- perspektifler: kim ne düşünüyor --- */
  const seg = (arr: Experience[]) => {
    if (!arr.length) return st ? null : null;
    const w = arr.reduce((a, e) => a + weightOf(e), 0);
    return round1(arr.reduce((a, e) => a + e.overall * weightOf(e), 0) / w);
  };
  const verifiedList = list.filter((e) => e.verification.verified);
  const expertList = list.filter((e) => {
    const u = getUser(e.authorId);
    return u ? isExpertFor(u, entity) : false;
  });

  const perspectives: Perspective[] = c.showScores
    ? [
        {
          segment: "community", label: "Topluluk", score: st ? st.score : seg(list),
          experienceCount, hint: "Bütün deneyimler",
        },
        {
          segment: "verified", label: "Doğrulanmış ziyaretçiler",
          score: st ? round1(st.score + ((hashSeed(entityId + "v") % 5) - 2) / 10) : seg(verifiedList),
          experienceCount: Math.round(experienceCount * verifiedRatio),
          hint: "Gittiği doğrulanmış kullanıcılar",
        },
        {
          segment: "expert", label: "Uzmanlar", score: seg(expertList),
          experienceCount: expertList.length,
          hint: "Bu konuda Gidenler uzmanlığı olan kullanıcılar",
        },
      ]
    : [];

  return {
    entityId,
    overallScore,
    scoreTrend: {
      period: "90d",
      delta: delta90,
      direction: delta90 > 0.15 ? "up" : delta90 < -0.15 ? "down" : "flat",
    },
    momentum: c.showScores ? momentumOf(tl) : "stable",
    periodChanges: c.showScores ? periodChangesOf(tl) : [],
    volume: volumeOf(tl),
    expectation: c.showScores ? expectations[entityId] ?? null : null,
    ratingDimensions: c.showScores ? ratingDimensions : [],
    returnRate: st ? st.returnRate : list.length
      ? list.filter((e) => e.returnIntent === "evet").length / list.length
      : 0,
    experienceCount,
    verifiedRatio,
    confidence: confidenceOf(experienceCount, verifiedRatio),
    consensus: c.showScores ? consensusOf(entityId) : null,
    perspectives,
    externalSignals: c.mode === "regulated" ? [] : externalOf(entityId),
    positiveThemes: c.showAISummary ? praisedThemes[entityId] ?? [] : [],
    negativeThemes: complaintThemes[entityId] ?? [],
    timeline: c.showScores ? tl : [],
    aiSummary: c.showAISummary ? aiSummaries[entityId] ?? null : null,
  };
}

export function externalOf(entityId: string): ExternalSource[] {
  return externalByEntity(entityId)
    .filter((s) => enabledProviders.includes(s.provider as never))
    .sort(
      (a, b) =>
        enabledProviders.indexOf(a.provider as never) -
        enabledProviders.indexOf(b.provider as never),
    );
}

/* ───────────────────────────── TOPIC VIEW ──────────────────────────────── */

export function getTopic(slug: string): TopicView | null {
  const entity = getEntity(slug);
  if (!entity) return null;
  const category = getCategory(entity.categoryId);
  const schema = category && getSchema(category.ratingSchemaId);
  const intelligence = getTopicIntelligence(entity.id);
  if (!category || !schema || !intelligence) return null;

  const all = publishedOf(entity.id).map(withAuthor);
  const expertExperiences = all.filter((e) => isExpertFor(e.author, entity));

  const nearby = entities
    .filter((e) => e.id !== entity.id && e.location?.district === entity.location?.district && e.categoryId === entity.categoryId)
    .sort((a, b) => ((a.location?.neighborhood === entity.location?.neighborhood ? 0 : 1) - (b.location?.neighborhood === entity.location?.neighborhood ? 0 : 1)) || ((getTopicIntelligence(b.id)?.overallScore ?? 0) - (getTopicIntelligence(a.id)?.overallScore ?? 0)))
    .slice(0, 3)
    .map((e) => {
      const cat = getCategory(e.categoryId) as Category;
      return {
        entity: e,
        category: cat,
        score: cat.compliance.showScores ? getTopicIntelligence(e.id)?.overallScore ?? null : null,
      };
    });

  return { entity, category, schema, intelligence, expertExperiences, experiences: all, nearby };
}

/* ────────────────────────── CREATOR PROFİLİ ────────────────────────────── */

export function getCreatorProfile(handle: string): CreatorProfileView | null {
  const user = getUserByHandle(handle);
  if (!user) return null;

  const mine = experiences
    .filter((e) => e.authorId === user.id && e.state === "published")
    .map(hydrate)
    .sort((a, b) => (a.visitedAt < b.visitedAt ? 1 : -1))
    .map((e) => {
      const entity = getEntityById(e.entityId) as Entity;
      return { ...withAuthor(e), entity, category: getCategory(entity.categoryId) as Category };
    });

  const myLists = listsByAuthor(user.id).map((l) => ({
    ...l,
    entities: l.entityIds.map((id) => {
      const entity = getEntityById(id) as Entity;
      const cat = getCategory(entity.categoryId) as Category;
      return {
        entity,
        score: cat.compliance.showScores ? getTopicIntelligence(id)?.overallScore ?? null : null,
      };
    }),
  }));

  /* Aynı mekâna birden çok ziyaret olabilir (Visit ≠ Experience);
     listelerde mekân tekrar etmesin — en yüksek/en yeni olan kalsın. */
  const bestByEntity = new Map<string, (typeof mine)[number]>();
  mine.forEach((e) => {
    const cur = bestByEntity.get(e.entity.id);
    if (!cur || e.overall > cur.overall) bestByEntity.set(e.entity.id, e);
  });

  const topRated = [...bestByEntity.values()]
    .filter((e) => e.category.compliance.showScores)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 5)
    .map((e) => ({ entity: e.entity, score: e.overall, category: e.category }));

  const returnSeen = new Set<string>();
  const wouldReturn = mine
    .filter((e) => e.returnIntent === "evet" && !returnSeen.has(e.entity.id) && returnSeen.add(e.entity.id))
    .slice(0, 6)
    .map((e) => ({ entity: e.entity, category: e.category }));

  const counts = new Map<string, number>();
  mine.forEach((e) => counts.set(e.category.label, (counts.get(e.category.label) ?? 0) + 1));
  const categoryBreakdown = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return { user, lists: myLists, experiences: mine, topRated, wouldReturn, categoryBreakdown };
}

export function getCuratedList(slug: string) {
  const list = getList(slug);
  if (!list) return null;
  const author = getUser(list.authorId) as User;
  const items = list.entityIds.map((id) => {
    const entity = getEntityById(id) as Entity;
    const category = getCategory(entity.categoryId) as Category;
    const intel = getTopicIntelligence(id);
    const mine = experiences
      .filter((e) => e.entityId === id && e.authorId === list.authorId)
      .map(hydrate)
      .sort((a, b) => (a.visitedAt < b.visitedAt ? 1 : -1))[0];
    return {
      entity, category,
      score: category.compliance.showScores ? intel?.overallScore ?? null : null,
      authorNote: mine?.body,
      authorScore: mine ? mine.overall : null,
    };
  });
  return { list, author, items };
}

/* ────────────────────────── İŞLETME PANELİ ─────────────────────────────── */

export function getBusinessDashboard(slug: string): BusinessDashboardView | null {
  const entity = getEntity(slug);
  if (!entity) return null;
  const category = getCategory(entity.categoryId);
  const schema = category && getSchema(category.ratingSchemaId);
  const intelligence = getTopicIntelligence(entity.id);
  if (!category || !schema || !intelligence) return null;

  const all = publishedOf(entity.id).map(withAuthor);
  const unanswered = all.filter((e) => !e.response);
  const answered = all.filter((e) => !!e.response);

  const expertsList = all.filter((e) => isExpertFor(e.author, entity));
  const avg = (arr: ExperienceWithAuthor[]) =>
    arr.length ? round1(arr.reduce((a, e) => a + e.overall, 0) / arr.length) : null;

  const pos = intelligence.positiveThemes[0]?.label;
  const neg = intelligence.negativeThemes[0]?.label;

  const tl = intelligence.timeline;
  const scoreDelta = tl.length >= 2 ? round1(tl[tl.length - 1].score - tl[tl.length - 2].score) : 0;

  return {
    entity, category, schema, intelligence, unanswered, answered,
    expertSummary: {
      expertCount: expertsList.length,
      expertScore: avg(expertsList),
      communityScore: avg(all),
      mostPraised: pos,
      mostCriticized: neg,
      experts: [...new Map(expertsList.map((e) => [e.author.id, e.author])).values()],
    },
    last30d: {
      newExperiences: tl.length ? tl[tl.length - 1].experienceCount : 0,
      verifiedShare: intelligence.verifiedRatio,
      scoreDelta,
    },
  };
}

/* ─────────────────────────── LİSTE / KEŞİF ─────────────────────────────── */

export interface EntityCard {
  entity: Entity;
  category: Category;
  score: number | null;
  delta90d: number;
  experienceCount: number;
  topComplaint?: string;
  external: ExternalSource[];
  consensus?: Consensus | null;
  /** Puan güveni (kart kanıt satırı için); regüle kategorilerde yok. */
  confidence?: ConfidenceLevel;
}

export function cardOf(entity: Entity): EntityCard {
  const category = getCategory(entity.categoryId) as Category;
  const intel = getTopicIntelligence(entity.id);
  return {
    entity, category,
    score: intel?.overallScore ?? null,
    delta90d: intel?.scoreTrend.delta ?? 0,
    experienceCount: intel?.experienceCount ?? 0,
    topComplaint: intel?.negativeThemes[0]?.label,
    external: intel?.externalSignals ?? [],
    consensus: intel?.consensus ?? null,
    confidence: intel?.confidence,
  };
}

let cardsCache: EntityCard[] | null = null;
export const listCards = (): EntityCard[] => (cardsCache ??= entities.map(cardOf));
export const rising = () => listCards().filter((c) => c.delta90d > 0.15).sort((a, b) => b.delta90d - a.delta90d);
export const falling = () => listCards().filter((c) => c.delta90d < -0.15).sort((a, b) => a.delta90d - b.delta90d);
export const trending = () => [...listCards()].sort((a, b) => b.experienceCount - a.experienceCount);

/* ──────────────────────────── ANA SAYFA KÜRASYONU ─────────────────────────
   Ana sayfa vitrindir, veritabanı değil: yalnızca İstanbul, yalnızca A/B
   katmanı, kategori çorbası yok. Puan/trend modeline dokunmaz; sadece seçer. */
export const inIstanbul = (c: EntityCard) => (c.entity.location?.city ?? "İstanbul") === "İstanbul";
const showsScore = (c: EntityCard) => c.category.compliance.showScores && c.score !== null;
const homeEligible = (c: EntityCard) => inIstanbul(c) && showsScore(c) && (c.entity.tier ?? "A") !== "C";

/** Kategori dengesi: aynı kategoriden en fazla `perCat`; ilk iki farklı kategori. */
function balanced(cards: EntityCard[], limit: number, perCat = 2): EntityCard[] {
  const out: EntityCard[] = [];
  const seen = new Map<string, number>();
  for (const c of cards) {
    const k = c.entity.categoryId;
    const n = seen.get(k) ?? 0;
    if (n >= perCat) continue;
    if (out.length === 1 && out[0].entity.categoryId === k) continue;
    out.push(c); seen.set(k, n + 1);
    if (out.length >= limit) break;
  }
  return out;
}

/** "İstanbul'da bugün konuşulanlar": hacim + hareket. İlk ikisi vitrin, sonrakiler kompakt. */
export function homeAgenda(limit = 5): EntityCard[] {
  const pool = listCards().filter(homeEligible).filter((c) => c.experienceCount >= 80);
  const heat = (c: EntityCard) => c.experienceCount * (1 + Math.min(1, Math.abs(c.delta90d)) * 0.8);
  const ranked = [...pool].sort((a, b) => heat(b) - heat(a));
  const out = balanced(ranked, limit);
  /* Vitrinin iki kartı aynı hikâyeyi anlatmasın: biri geriliyorsa öteki yükselen/istikrarlı olsun. */
  const tone = (c: EntityCard) => (c.delta90d > 0.15 ? "up" : c.delta90d < -0.15 ? "down" : "flat");
  if (out.length >= 2 && tone(out[0]) === tone(out[1])) {
    const alt = ranked.find((c) => !out.includes(c) && c.entity.categoryId !== out[0].entity.categoryId && tone(c) !== tone(out[0]));
    if (alt) { const dropped = out[1]; out[1] = alt; out.splice(2, 0, dropped); }
  }
  return out.slice(0, limit);
}
export const homeRising = (limit = 3) => balanced(rising().filter(homeEligible).filter((c) => c.experienceCount >= 40), limit, 2);
export const homeFalling = (limit = 3) => balanced(falling().filter(homeEligible).filter((c) => c.experienceCount >= 40), limit, 2);

export function latestExperiences(limit = 6, city?: string) {
  return experiences
    .filter((e) => e.state === "published")
    .filter((e) => !city || (getEntityById(e.entityId)?.location?.city ?? "İstanbul") === city)
    .map(hydrate)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit)
    .map((e) => ({
      experience: withAuthor(e),
      card: cardOf(getEntityById(e.entityId) as Entity),
    }));
}

/** Uzmanlardan gelen son deneyimler — ana sayfadaki creator katmanı. */
export function expertExperiences(limit = 4, city?: string) {
  return experiences
    .filter((e) => e.state === "published")
    .filter((e) => !city || (getEntityById(e.entityId)?.location?.city ?? "İstanbul") === city)
    .map(hydrate)
    .map(withAuthor)
    .filter((e) => {
      const entity = getEntityById(e.entityId);
      return entity ? isExpertFor(e.author, entity) : false;
    })
    .sort((a, b) => (a.visitedAt < b.visitedAt ? 1 : -1))
    .slice(0, limit)
    .map((e) => ({ experience: e, card: cardOf(getEntityById(e.entityId) as Entity) }));
}

/** Ana sayfadaki "Gidenler Pulse" — ağın bugünkü nabzı. */
export function pulse(city?: string) {
  const cards = listCards().filter((c) => c.score !== null).filter((c) => !city || (c.entity.location?.city ?? "İstanbul") === city);
  const byDelta = [...cards].sort((a, b) => b.delta90d - a.delta90d);
  const byVolume = [...cards].sort(
    (a, b) =>
      (getTopicIntelligence(b.entity.id)?.volume.count ?? 0) -
      (getTopicIntelligence(a.entity.id)?.volume.count ?? 0),
  );
  const expertPick = expertExperiences(1, city)[0];
  return {
    rising: byDelta[0],
    falling: byDelta[byDelta.length - 1],
    busiest: byVolume[0],
    busiestVolume: byVolume[0] ? getTopicIntelligence(byVolume[0].entity.id)?.volume ?? null : null,
    expertPick,
  };
}

export const featuredLists = (limit = 4) =>
  lists.slice(0, limit).map((l) => ({ ...l, author: getUser(l.authorId) as User }));

/* ──────────────────────────── ARAMA (v2) ───────────────────────────────── */

/** Mekân + uzman + liste, tek sorguda. */
/** Arama dizini — ad, alt tür, kategori, semt, mahalle, şehir, facet, etiket; Türkçe ve ASCII (kadikoy) eşleşir. */
interface SearchDoc { c: EntityCard; hay: string; hayAscii: string; name: string }
let searchIndex: SearchDoc[] | null = null;
function buildIndex(): SearchDoc[] {
  return listCards().map((c) => {
    const parts = [c.entity.name, c.entity.subcategory ?? "", c.category.label, c.entity.location?.district ?? "", c.entity.location?.neighborhood ?? "", c.entity.location?.city ?? "", ...(c.entity.facets ?? []), ...(c.entity.tags ?? [])];
    const hay = parts.join(" ").toLocaleLowerCase("tr");
    return { c, hay, hayAscii: slugify(hay).replace(/-/g, " "), name: c.entity.name.toLocaleLowerCase("tr") };
  });
}
export const searchIndexSize = () => (searchIndex ??= buildIndex()).length;

export function search(q: string): SearchResults {
  const t = q.trim().replace(/@/g, "").toLocaleLowerCase("tr");
  if (!t) return { entities: [], creators: [], lists: [] };
  const words = t.split(/\s+/).filter(Boolean);
  const wordsAscii = words.map((w) => slugify(w).replace(/-/g, " "));
  const hit = (hay: string) => words.filter((w) => hay.toLocaleLowerCase("tr").includes(w)).length;

  const idx = (searchIndex ??= buildIndex());
  const ent = idx
    .map((d) => {
      let score = 0;
      for (let i = 0; i < words.length; i++) {
        if (d.hay.includes(words[i]) || d.hayAscii.includes(wordsAscii[i])) score += 1;
        if (d.name.includes(words[i]) || slugify(d.name).replace(/-/g, " ").includes(wordsAscii[i])) score += 2;
        if (d.name.startsWith(words[i])) score += 1;
      }
      return { d, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.d.c.score ?? 0) - (a.d.c.score ?? 0) || b.d.c.experienceCount - a.d.c.experienceCount)
    .map(({ d }) => ({
      entity: d.c.entity, category: d.c.category, score: d.c.score,
      experienceCount: d.c.experienceCount,
      externalTop: d.c.external.find((s) => s.kind === "score")
        ? `${d.c.external[0].label} ${d.c.external[0].score}`
        : undefined,
    }));

  const cre = users
    .map((u) => ({
      u,
      score: hit([u.handle, u.displayName ?? "", ...u.expertise.map((x) => x.label)].join(" ")),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.u.reputation.score - a.u.reputation.score)
    .map(({ u }) => u);

  const lst = lists
    .map((l) => ({ l, score: hit([l.title, l.subtitle ?? ""].join(" ")) }))
    .filter((x) => x.score > 0)
    .map(({ l }) => ({ ...l, author: getUser(l.authorId) as User }));

  return { entities: ent, creators: cre, lists: lst };
}

/** Header'daki hızlı öneri — yalnızca mekânlar. */
export function quickSearch(q: string) {
  return search(q).entities.slice(0, 6);
}

export { getUser, getUserByHandle, getEntity, getEntityById, getCategory, getSchema, lists };
