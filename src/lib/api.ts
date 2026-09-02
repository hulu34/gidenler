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
import { externalSources, enabledProviders } from "@/data/externalSources";
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

function publishedOf(entityId: string): Experience[] {
  return experiences
    .filter((e) => e.entityId === entityId && e.state === "published")
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

export function getTopicIntelligence(entityId: string): TopicIntelligence | null {
  const entity = getEntityById(entityId);
  if (!entity) return null;
  const category = getCategory(entity.categoryId);
  const schema = category && getSchema(category.ratingSchemaId);
  if (!category || !schema) return null;

  const c = category.compliance;
  const list = publishedOf(entityId);
  const tl: TimelinePoint[] = timelines[entityId] ?? [];

  const experienceCount = entity.experienceTotal ?? list.length;
  const verifiedRatio = list.length
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
    if (!arr.length) return null;
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
          segment: "community", label: "Topluluk", score: seg(list),
          experienceCount, hint: "Bütün deneyimler",
        },
        {
          segment: "verified", label: "Doğrulanmış ziyaretçiler",
          score: seg(verifiedList),
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
    returnRate: list.length
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
  return externalSources
    .filter((s) => s.entityId === entityId)
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
    .filter((e) => e.id !== entity.id && e.location?.district === entity.location?.district)
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
  };
}

export const listCards = (): EntityCard[] => entities.map(cardOf);
export const rising = () => listCards().filter((c) => c.delta90d > 0.15).sort((a, b) => b.delta90d - a.delta90d);
export const falling = () => listCards().filter((c) => c.delta90d < -0.15).sort((a, b) => a.delta90d - b.delta90d);
export const trending = () => listCards().sort((a, b) => b.experienceCount - a.experienceCount);

export function latestExperiences(limit = 6) {
  return experiences
    .filter((e) => e.state === "published")
    .map(hydrate)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit)
    .map((e) => ({
      experience: withAuthor(e),
      card: cardOf(getEntityById(e.entityId) as Entity),
    }));
}

/** Uzmanlardan gelen son deneyimler — ana sayfadaki creator katmanı. */
export function expertExperiences(limit = 4) {
  return experiences
    .filter((e) => e.state === "published")
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
export function pulse() {
  const cards = listCards().filter((c) => c.score !== null);
  const byDelta = [...cards].sort((a, b) => b.delta90d - a.delta90d);
  const byVolume = [...cards].sort(
    (a, b) =>
      (getTopicIntelligence(b.entity.id)?.volume.count ?? 0) -
      (getTopicIntelligence(a.entity.id)?.volume.count ?? 0),
  );
  const expertPick = expertExperiences(1)[0];
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
export function search(q: string): SearchResults {
  const t = q.trim().toLocaleLowerCase("tr");
  if (!t) return { entities: [], creators: [], lists: [] };
  const words = t.split(/\s+/);
  const hit = (hay: string) => words.filter((w) => hay.toLocaleLowerCase("tr").includes(w)).length;

  const ent = listCards()
    .map((c) => ({
      c,
      score: hit(
        [
          c.entity.name, c.entity.location?.district ?? "", c.entity.location?.city ?? "",
          c.category.label, ...(c.entity.facets ?? []), ...(c.entity.tags ?? []),
        ].join(" "),
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.c.score ?? 0) - (a.c.score ?? 0))
    .map(({ c }) => ({
      entity: c.entity, category: c.category, score: c.score,
      experienceCount: c.experienceCount,
      externalTop: c.external.find((s) => s.kind === "score")
        ? `${c.external[0].label} ${c.external[0].score}`
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
