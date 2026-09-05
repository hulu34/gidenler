/* ==========================================================================
   DECISION INTELLIGENCE — servis katmanı (sahte backend)
   --------------------------------------------------------------------------
   Experience + Reputation + Expertise + Taste + Time = Decision.
   UI bu dosyadaki sözleşmeleri tüketir; ham deneyimden karar üretmez.
   Buradaki formüller prototip içindir: production ML varmış gibi
   davranılmaz, her çıktı isDemo taşır ve nedenleri gösterir.

   KİLİTLİ: Personal Match ≠ Gidenler Score. Beklenti/pazar katmanı bu
   hesaba girmez. Regüle kategorilerde kişisel öneri üretilmez.
   ========================================================================== */

import { entities, getEntity, getEntityById } from "@/data/entities";
import { getCategory, getSchema } from "@/data/categories";
import { getUserByHandle, users } from "@/data/users";
import {
  DEMO_USER_ID, ambientSignals, contextFit, decisionContexts, getTasteProfile, similarUsers,
} from "@/data/taste";
import { eventsOf } from "@/data/events";
import { demoGroup, getGroup, vegetarianOption } from "@/data/group";
import { demoGeo } from "@/data/map";
import { getTopicIntelligence, listCards } from "@/lib/api";
import { score1, nf } from "@/lib/format";
import type {
  AskQuery, AskResult, AskResultItem, BusinessAlert, BusinessBenchmark, BusinessRecommendation,
  BusinessRootCause, Comparison, ComparisonRow, ConfidenceLevel, Decision, DecisionContext,
  DecisionContextKey, DecisionReason, DecisionVerdict, DecisionWarning, EntityEvent, MatchFactor,
  Passport, PersonalMatch, SimilarUsersPerspective, TasteProfile, TimingVerdict, TopicIntelligence,
  Group, GroupCandidate, GroupDecision, GroupPreference, GroupVote, MapFilter, MapResult,
  NotificationEvent, Provenance, TasteEdits, UserEntityRelationship,
} from "@/lib/types";

const clamp = (n: number, lo = 0, hi = 99) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);
const lower = (s: string) => s.toLocaleLowerCase("tr");
/** "%87'si", "%88'i" — Türkçe iyelik eki, sayının okunuşuna göre. */
function pctOf(n: number): string {
  const last = n % 10, tens = n % 100;
  const suf = last === 0
    ? ({ 0: "'ı", 10: "'u", 20: "'si", 30: "'u", 40: "'ı", 50: "'si", 60: "'ı", 70: "'i", 80: "'i", 90: "'ı" } as Record<number, string>)[tens] ?? "'ü"
    : ({ 1: "'i", 2: "'si", 3: "'ü", 4: "'ü", 5: "'i", 6: "'sı", 7: "'si", 8: "'i", 9: "'u" } as Record<number, string>)[last];
  return `%${n}${suf}`;
}

export const listDecisionContexts = (): DecisionContext[] => decisionContexts;
export const demoTasteProfile = (): TasteProfile => getTasteProfile(DEMO_USER_ID);
export const tasteProfileOf = (userId: string): TasteProfile | undefined => getTasteProfile(userId);

/* Boyut takma adları: kategori şeması farklı olsa da zevk profili aynı dili konuşur. */
const ALIAS: Record<string, string[]> = {
  taste: ["taste", "drink", "food", "room"],
  service: ["service"],
  value: ["value"],
  atmosphere: ["atmosphere", "location"],
};

const LEVEL_BONUS: Record<string, number> = { "çok yüksek": 8, "yüksek": 4, "orta": 0, "düşük": -6 };

function dimValue(it: TopicIntelligence, key: string): number | null {
  const keys = ALIAS[key] ?? [key];
  const found = it.ratingDimensions.filter((d) => keys.includes(d.key));
  if (!found.length) return null;
  return found.reduce((a, d) => a + d.value, 0) / found.length;
}

function applyContext(profile: TasteProfile, ctx: DecisionContextKey, extra?: Partial<Record<string, number>>) {
  const o = { ...(decisionContexts.find((c) => c.key === ctx)?.overrides ?? {}), ...(extra ?? {}) };
  return profile.dimensions.map((d) => ({ ...d, weight: o[d.key] ?? d.weight }));
}

/* ─────────────────────────── PERSONAL MATCH ────────────────────────────── */

export function getPersonalMatch(
  entityId: string,
  context: DecisionContextKey = "default",
  userId: string = DEMO_USER_ID,
  overrides?: Partial<Record<string, number>>,
  profileOverride?: TasteProfile,
): PersonalMatch | null {
  const entity = getEntityById(entityId);
  const profile = profileOverride ?? getTasteProfile(userId);
  const it = getTopicIntelligence(entityId);
  const cat = entity && getCategory(entity.categoryId);
  if (!entity || !profile || !it || !cat || !cat.compliance.showScores || it.overallScore === null) return null;

  const dims = applyContext(profile, context, overrides);
  const ambient = ambientSignals[entityId] ?? { quiet: 5, speed: 5 };
  const factors: MatchFactor[] = [];

  /* 1 — boyut uyumu: senin önceliklerin × mekânın puanları */
  let wsum = 0, vsum = 0;
  for (const d of dims) {
    const v = d.key === "quiet" ? ambient.quiet : d.key === "speed" ? ambient.speed : dimValue(it, d.key);
    if (v === null) continue;
    wsum += d.weight; vsum += d.weight * v;
  }
  const base = wsum ? (vsum / wsum) * 10 : 50;

  const top = [...dims].sort((a, b) => b.weight - a.weight)[0];
  const topV = top ? (top.key === "quiet" ? ambient.quiet : top.key === "speed" ? ambient.speed : dimValue(it, top.key)) : null;
  if (top && topV !== null) {
    factors.push({
      key: `dim.${top.key}`, label: top.label,
      effect: (topV - 7) / 3,
      evidence: `${top.label} ${score1(topV)} — senin en önemli kriterin`,
    });
  }
  const quietW = dims.find((d) => d.key === "quiet")?.weight ?? 0;
  if (quietW >= 60) {
    factors.push({
      key: "ambient.quiet", label: "Sessizlik", effect: (ambient.quiet - 6) / 4,
      evidence: ambient.quiet >= 7 ? "Deneyimlerde sakin bir mekân olarak anlatılıyor" : ambient.quiet <= 4 ? "Deneyimlerde gürültü ve kalabalık sık geçiyor" : "Gürültü konusunda deneyimler ikiye bölünmüş",
    });
  }

  /* 2 — mutfak / alan tercihi */
  let cuisine = 0; let cuisineLabel: string | undefined; let cuisineLevel: string | undefined;
  for (const f of entity.facets ?? []) {
    const p = profile.cuisinePreferences.find((x) => lower(x.key) === lower(f));
    if (!p) continue;
    const b = LEVEL_BONUS[p.level] ?? 0;
    if (Math.abs(b) > Math.abs(cuisine)) { cuisine = b; cuisineLabel = p.label; cuisineLevel = p.level; }
  }
  if (cuisineLabel) {
    factors.push({
      key: "taste.cuisine", label: cuisineLabel, effect: cuisine / 8,
      evidence: cuisine > 0 ? `${cuisineLabel} mekânlarını ${cuisineLevel} değerlendiriyorsun` : `${cuisineLabel} senin listende ${cuisineLevel}`,
    });
  }

  /* 3 — sana benzeyenler */
  const sim = similarUsers[entityId];
  let simEffect = 0;
  if (sim && sim.score !== null) {
    simEffect = (sim.returnRate - 0.7) * 30;
    factors.push({
      key: "similar.return", label: "Sana benzeyenler", effect: simEffect / 6,
      evidence: `Sana benzeyen ${nf(sim.sampleSize)} kişinin ${pctOf(Math.round(sim.returnRate * 100))} tekrar gitmiş`,
    });
  }

  /* 4 — zaman: yön ve F/P algısı */
  const trendEffect = it.momentum === "strong_up" ? 2 : it.momentum === "up" ? 1 : it.momentum === "down" ? -4 : it.momentum === "strong_down" ? -7 : 0;
  if (trendEffect !== 0) {
    factors.push({
      key: "trend.momentum", label: "Yön", effect: trendEffect / 5,
      evidence: trendEffect > 0 ? "Son 90 günde deneyimler yükseliyor" : "Son 90 günde deneyimler geriliyor",
    });
  }
  const valueDim = it.ratingDimensions.find((d) => d.key === "value");
  let valueTrend = 0;
  if (valueDim?.trend.sufficient && valueDim.trend.direction === "down") {
    valueTrend = -3;
    factors.push({ key: "trend.value", label: "Fiyat / performans", effect: -0.5, evidence: "F/P algısı son 90 günde zayıflıyor" });
  }

  /* 5 — fiyat hassasiyeti */
  const pl = entity.priceLevel ?? 2;
  const price = profile.priceSensitivity === "yüksek" ? (pl === 4 ? -8 : pl === 3 ? -4 : 0)
    : profile.priceSensitivity === "orta" ? (pl === 4 ? -1 : 0) : 0;
  if (price < 0) factors.push({ key: "price", label: "Fiyat", effect: price / 8, evidence: `${"₺".repeat(pl)} seviyesi bütçe hassasiyetinle çelişiyor` });

  /* 6 — bağlam uygunluğu */
  const fit = context === "default" ? 0 : (contextFit[entityId]?.[context] ?? 0);
  if (context !== "default" && fit !== 0) {
    const label = decisionContexts.find((c) => c.key === context)?.label ?? context;
    factors.push({ key: `context.${context}`, label, effect: fit / 20, evidence: fit > 0 ? `Deneyimlerde "${lower(label)}" için doğal bir yer olarak anlatılıyor` : `Deneyimlere göre "${lower(label)}" için zorlayıcı` });
  }

  const score = round(clamp(base + cuisine + simEffect + trendEffect + valueTrend + price + fit));
  const confidence: ConfidenceLevel =
    sim && sim.confidence === "high" && it.confidence !== "low" ? "high" : sim?.confidence === "low" ? "low" : "medium";

  return {
    entityId, userId, context, score,
    factors: factors.sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect)),
    similarity: { score: sim ? Math.min(0.98, 0.6 + sim.returnRate * 0.35) : 0.5, sampleSize: sim?.sampleSize ?? 0, confidence },
    confidence, isDemo: true,
  };
}

export const getSimilarUsersPerspective = (entityId: string): SimilarUsersPerspective | null => {
  const e = getEntityById(entityId); const cat = e && getCategory(e.categoryId);
  if (!cat || !cat.compliance.showScores) return null;
  return similarUsers[entityId] ?? null;
};

/* ────────────────────────────── DECISION ───────────────────────────────── */

function verdictOf(match: number, it: TopicIntelligence): DecisionVerdict {
  const down = it.momentum === "down" || it.momentum === "strong_down";
  if (down && match < 70) return "Biraz bekle";
  if (match >= 90 && !down) return "Kesinlikle gidilir";
  if (match >= 75) return "Gidilir";
  if (match >= 55) return "Sana bağlı";
  return "Şimdilik pas geç";
}

export function getDecision(entityId: string, context: DecisionContextKey = "default", overrides?: Partial<Record<string, number>>, profile?: TasteProfile): Decision | null {
  const entity = getEntityById(entityId);
  const it = getTopicIntelligence(entityId);
  const m = getPersonalMatch(entityId, context, DEMO_USER_ID, overrides, profile);
  if (!entity || !it || !m || it.overallScore === null) return null;

  const reasons: DecisionReason[] = [];
  const warnings: DecisionWarning[] = [];

  for (const f of m.factors) {
    if (f.effect > 0.15) {
      reasons.push({
        text: f.evidence,
        kind: f.key.startsWith("similar") ? "similar" : f.key.startsWith("trend") ? "trend" : f.key.startsWith("dim") || f.key.startsWith("taste") || f.key.startsWith("ambient") ? "taste" : "community",
        source: f.key.startsWith("similar") ? `${nf(m.similarity.sampleSize)} benzer zevk profili` : f.key.startsWith("dim") ? `${nf(it.experienceCount)} deneyim` : undefined,
      });
    } else if (f.effect < -0.15) {
      warnings.push({ text: f.evidence, severity: f.effect < -0.6 ? "high" : f.effect < -0.35 ? "medium" : "low" });
    }
  }

  /* topluluk ve uzman kanıtı */
  if (it.returnRate >= 0.8) reasons.push({ text: `Gidenlerin ${pctOf(Math.round(it.returnRate * 100))} tekrar giderim diyor`, kind: "community", source: `${nf(it.experienceCount)} deneyim` });
  const expert = it.perspectives.find((p) => p.segment === "expert");
  if (expert?.score && expert.score >= 8.5 && expert.experienceCount >= 3) {
    reasons.push({ text: `Bu konuda uzman ${nf(expert.experienceCount)} kişi ${score1(expert.score)} verdi`, kind: "expert", source: "Gidenler uzmanlık grafiği" });
  }
  if (it.verifiedRatio >= 0.7) reasons.push({ text: `Deneyimlerin ${pctOf(Math.round(it.verifiedRatio * 100))} doğrulanmış ziyaret`, kind: "verified" });
  if (entity.business?.claimed && it.negativeThemes.some((t) => t.direction === "up")) {
    reasons.push({ text: "İşletme şikâyetlere resmi yanıt veriyor", kind: "community", source: "doğrulanmış işletme hesabı · puana etkisi yok" });
  }

  /* artan şikâyetler */
  for (const t of it.negativeThemes.filter((x) => x.direction === "up").slice(0, 2)) {
    const isWait = /bekleme|kuyruk/i.test(t.label);
    warnings.push({
      text: isWait ? `${t.label} şikâyetleri artıyor — hafta sonu yoğun saatlerde bekleme riski` : `${t.label} şikâyetleri artıyor`,
      source: `${nf(t.count)} deneyimde ${lower(t.label)} konusu`,
      severity: t.count >= 40 ? "medium" : "low",
    });
  }

  const fits = Object.entries(contextFit[entityId] ?? {}) as Array<[DecisionContextKey, number]>;
  const label = (k: DecisionContextKey) => decisionContexts.find((c) => c.key === k)?.label ?? k;
  const bestFor = fits.filter(([, v]) => v >= 3).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => label(k));
  const avoidIf = fits.filter(([, v]) => v <= -8).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([k]) => label(k));

  return {
    entityId, context, verdict: verdictOf(m.score, it), personalMatch: m.score,
    reasons: reasons.slice(0, 5), warnings: warnings.slice(0, 3), bestFor, avoidIf,
    confidence: m.confidence, timeContext: "Son 90 günün deneyimlerine göre", isDemo: true,
  };
}

/* ─────────────────── ŞİMDİ GİTMEK İÇİN İYİ ZAMAN MI? ───────────────────── */

export function getTimingVerdict(entityId: string): TimingVerdict | null {
  const it = getTopicIntelligence(entityId);
  if (!it || it.overallScore === null) return null;

  const signals: TimingVerdict["signals"] = it.ratingDimensions
    .filter((d) => d.trend.sufficient)
    .map((d) => ({ label: d.label, direction: d.trend.direction }));
  for (const t of it.negativeThemes.slice(0, 2)) {
    if (t.direction !== "flat") signals.push({ label: t.label, direction: t.direction === "up" ? "down" : "up" });
  }
  if (!signals.length) signals.push({ label: "Genel yön", direction: it.scoreTrend.direction });

  const ups = it.ratingDimensions.filter((d) => d.trend.sufficient && d.trend.direction === "up").map((d) => lower(d.label));
  const downs = it.ratingDimensions.filter((d) => d.trend.sufficient && d.trend.direction === "down").map((d) => lower(d.label));
  const risingComplaints = it.negativeThemes.filter((t) => t.direction === "up").map((t) => lower(t.label));
  const easing = it.negativeThemes.filter((t) => t.direction === "down").map((t) => lower(t.label));

  const join = (xs: string[]) => xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ve ${xs[xs.length - 1]}`;
  const parts: string[] = [];
  if (!ups.length && !downs.length) {
    parts.push(it.momentum === "strong_up" ? "Son 90 günde deneyimler hızlanarak yükseliyor." : it.momentum === "up" ? "Son 90 günde deneyimler yükseliyor." : it.momentum === "down" || it.momentum === "strong_down" ? "Son 90 günde deneyimler geriliyor." : "Son 90 günde genel puan dengeli.");
  }
  if (ups.length) parts.push(`${join(ups)} son deneyimlerde yükseliyor.`);
  if (easing.length) parts.push(`${join(easing)} şikâyetleri azalıyor.`);
  if (downs.length) parts.push(`${join(downs.slice(0, 2))} algısı ise zayıflıyor.`);
  if (risingComplaints.length) parts.push(`${join(risingComplaints.slice(0, 2))} şikâyetleri artıyor.`);
  const down = it.momentum === "down" || it.momentum === "strong_down";
  const answer: TimingVerdict["answer"] = down || (risingComplaints.length >= 2 && !ups.length) ? "Biraz bekle"
    : it.momentum === "up" || it.momentum === "strong_up" ? "Evet" : "Fark etmez";

  const s = (t: string) => t.charAt(0).toLocaleUpperCase("tr") + t.slice(1);
  return { entityId, answer, window: "Son 30 gün", signals: signals.slice(0, 5), explanation: parts.map(s).join(" "), isDemo: true };
}

/* ─────────────────────────────── EVENTS ────────────────────────────────── */

export const getEntityEvents = (entityId: string): EntityEvent[] => eventsOf(entityId);

/* ───────────────────────────── SOR GİDENLER ────────────────────────────── */

const DISTRICTS: Array<[RegExp, string]> = [
  [/kad[ıi]k[öo]y|moda\b/i, "Kadıköy"], [/ni[şs]anta[şs][ıi]|[şs]i[şs]li|te[şs]vikiye/i, "Şişli"],
  [/be[şs]ikta[şs]|akaretler/i, "Beşiktaş"], [/beyo[ğg]lu|cihangir|karak[öo]y|taksim/i, "Beyoğlu"],
];
const FACETS: Array<[RegExp, string]> = [
  [/sushi|omakase|japon/i, "Japon mutfağı"], [/bal[ıi]k|meyhane|rak[ıi]/i, "Balık"], [/steak|et\b|biftek/i, "Steakhouse"],
  [/d[üu]r[üu]m|sokak|kokore[çc]/i, "Sokak lezzeti"], [/kahve|filtre|espresso/i, "Filtre kahve"],
  [/f[ıi]r[ıi]n|kahvalt[ıi]|ekmek/i, "Fırın ve ekmek"], [/esnaf|lokanta|ev yeme[ğg]i/i, "Esnaf lokantası"],
  [/fine dining|[şs]ef/i, "Fine dining"], [/manzara|teras/i, "Manzara"],
];

export function parseAsk(text: string): AskQuery {
  const t = text.trim();
  const q: AskQuery = { text: t, context: "default", priorities: [] };
  for (const [re, d] of DISTRICTS) if (re.test(t)) { q.district = d; break; }
  for (const [re, f] of FACETS) if (re.test(t)) { q.facet = f; break; }
  if (/sakin|sessiz|huzurlu|g[üu]r[üu]lt[üu]s[üu]z/i.test(t)) q.quiet = true;
  const party = t.match(/(\d+)\s*ki[şs]i/i); if (party) q.party = Number(party[1]);
  const tl = t.match(/(\d{3,5})\s*(?:–|-)?\s*(\d{3,5})?\s*(?:tl|₺)/i);
  if (tl) { const n = Number(tl[2] ?? tl[1]); q.budget = n >= 1500 ? 4 : n >= 800 ? 3 : n >= 350 ? 2 : 1; }
  else if (/ucuz|hesapl[ıi]|b[üu]t[çc]e/i.test(t)) q.budget = 2;
  const tlSign = t.match(/₺{1,4}/); if (tlSign && !q.budget) q.budget = tlSign[0].length as 1 | 2 | 3 | 4;
  if (/date|fl[öo]rt|sevgili|romantik/i.test(t)) q.context = "date";
  else if (/(^|\s)i[şs](\s|$)|toplant[ıi]|m[üu][şs]teri|i[şs] yeme[ğg]i/i.test(t)) q.context = "business";
  else if (/[çc]ocuk|aile|anne|baba/i.test(t)) q.context = "family";
  else if (/h[ıi]zl[ıi]|[öo]ğle|aya[küu]st[üu]/i.test(t)) q.context = "quick";
  else if (/arkada[şs]|grup|kalabal[ıi]k/i.test(t) || (q.party && q.party >= 4)) q.context = "friends";
  else if (/tek ba[şs][ıi]m|yaln[ıi]z/i.test(t)) q.context = "solo";
  if (/f\/p|fiyat.*[öo]nemli|performans/i.test(t)) q.priorities.push("value");
  if (/lezzet/i.test(t)) q.priorities.push("taste");
  if (/servis/i.test(t)) q.priorities.push("service");
  if (/atmosfer.*(de[ğg]il|[öo]nemsiz)/i.test(t)) q.priorities.push("-atmosphere");
  return q;
}

export interface AskRefine {
  maxPrice?: 1 | 2 | 3 | 4;
  side?: "avrupa" | "anadolu";
  context?: DecisionContextKey;
  excludeFacet?: string;
}
const EUROPE = new Set(["Şişli", "Beşiktaş", "Beyoğlu"]);

export function askGidenler(text: string, refine: AskRefine = {}): AskResult {
  const q = parseAsk(text);
  if (refine.context) q.context = refine.context;
  if (refine.maxPrice) q.budget = refine.maxPrice;
  const overrides: Partial<Record<string, number>> = {};
  for (const p of q.priorities) {
    if (p.startsWith("-")) overrides[p.slice(1)] = 10; else overrides[p] = 92;
  }
  if (q.quiet) overrides.quiet = 90;

  const understood: string[] = [];
  if (q.district) understood.push(q.district);
  if (q.facet) understood.push(q.facet);
  if (q.quiet) understood.push("sakin");
  if (q.party) understood.push(`${q.party} kişi`);
  if (q.budget) understood.push("₺".repeat(q.budget));
  if (q.context !== "default") understood.push(decisionContexts.find((c) => c.key === q.context)?.label ?? q.context);
  if (refine.side) understood.push(refine.side === "avrupa" ? "Avrupa Yakası" : "Anadolu Yakası");
  if (refine.excludeFacet) understood.push(`${lower(refine.excludeFacet)} olmasın`);
  for (const p of q.priorities) understood.push(p.startsWith("-") ? "atmosfer önemli değil" : p === "value" ? "F/P önemli" : p === "taste" ? "lezzet önemli" : "servis önemli");

  /* "X mı Y mı?" — karşılaştırma niyeti */
  const named = entities.filter((e) => lower(text).includes(lower(e.name.split(" ")[0])) && e.name.length > 3);

  let pool = listCards().filter((c) => c.score !== null && c.category.compliance.showScores);
  const outside = new Set<string>();
  if (named.length >= 2) {
    pool = pool.filter((c) => named.some((n) => n.id === c.entity.id));
    understood.splice(0, understood.length, "karşılaştırma", ...named.map((n) => n.name));
  }
  else {
    if (refine.side) { q.district = undefined; const d = pool.filter((c) => refine.side === "avrupa" ? EUROPE.has(c.entity.location?.district ?? "") : !EUROPE.has(c.entity.location?.district ?? "")); if (d.length) pool = d; }
    if (refine.excludeFacet) pool = pool.filter((c) => !(c.entity.facets ?? []).includes(refine.excludeFacet!));
    if (q.facet) { const f = pool.filter((c) => (c.entity.facets ?? []).includes(q.facet!)); if (f.length) pool = f; }
    if (/yemek|ak[şs]am|restoran|sushi|bal[ıi]k|et\b|lokanta/i.test(text) && !q.facet?.includes("kahve")) {
      const r = pool.filter((c) => c.category.id === "cat.restaurant"); if (r.length) pool = r;
    }
    if (q.district) {
      const d = pool.filter((c) => c.entity.location?.district === q.district);
      if (d.length) {
        /* Semt içinde az aday varsa semt dışından tamamla — ceza ile, açıkça etiketlenmiş. */
        const rest = pool.filter((c) => c.entity.location?.district !== q.district);
        if (d.length >= 3) pool = d; else { pool = [...d, ...rest]; for (const c of rest) outside.add(c.entity.id); }
      }
    }
  }

  const scored = pool.map((c) => {
    const m = getPersonalMatch(c.entity.id, q.context, DEMO_USER_ID, overrides);
    let bonus = 0;
    if (q.budget && c.entity.priceLevel) bonus += c.entity.priceLevel > q.budget ? -Math.max(0, c.entity.priceLevel - q.budget) * 14 : (q.budget - c.entity.priceLevel) * 5 + 3;
    if (outside.has(c.entity.id)) bonus -= 20;
    if (q.quiet) bonus += ((ambientSignals[c.entity.id]?.quiet ?? 5) - 5) * 2;
    return { c, m, score: m ? clamp(m.score + bonus) : 0 };
  }).filter((x) => x.m).sort((a, b) => b.score - a.score).slice(0, 3);

  const items: AskResultItem[] = scored.map(({ c, m, score }) => {
    const it = getTopicIntelligence(c.entity.id)!;
    const reasons: DecisionReason[] = m!.factors.filter((f) => f.effect > 0.15).slice(0, 3).map((f) => ({
      text: f.evidence, kind: f.key.startsWith("similar") ? "similar" : f.key.startsWith("trend") ? "trend" : "taste",
    }));
    if (it.momentum === "stable" || it.momentum === "up") reasons.push({ text: "Son 90 gün istikrarlı", kind: "trend", source: `${nf(it.experienceCount)} deneyim` });
    const warnT = it.negativeThemes.find((t) => t.direction === "up");
    const worst = m!.factors.filter((f) => f.effect < -0.3)[0];
    const warning: DecisionWarning | undefined = outside.has(c.entity.id) ? { text: `${q.district} dışında — ${c.entity.location?.district}`, severity: "low" }
      : worst ? { text: worst.evidence, severity: "medium" }
      : warnT ? { text: `${warnT.label} şikâyetleri artıyor`, source: `${nf(warnT.count)} deneyimde`, severity: "low" } : undefined;
    return { entityId: c.entity.id, match: round(score), reasons: reasons.slice(0, 4), warning };
  });

  const verified = items.reduce((a, i) => { const it = getTopicIntelligence(i.entityId)!; return a + Math.round(it.experienceCount * it.verifiedRatio); }, 0);
  const cohort = items.reduce((a, i) => a + (similarUsers[i.entityId]?.sampleSize ?? 0), 0);
  return {
    query: q, understood, items,
    sources: [`${nf(verified)} doğrulanmış deneyim · son 90 gün`, `${nf(cohort)} benzer zevk profili`, "Gidenler uzmanlık grafiği"],
    isDemo: true,
  };
}

/* ─────────────────────────────── COMPARE ───────────────────────────────── */

export function compareEntities(slugs: string[]): Comparison | null {
  const list = slugs.map((s) => getEntity(s)).filter(Boolean);
  if (list.length < 2) return null;
  const ents = list as NonNullable<typeof list[number]>[];
  const intel = ents.map((e) => getTopicIntelligence(e.id)!);
  const matches = ents.map((e) => getPersonalMatch(e.id));
  if (intel.some((i) => !i || i.overallScore === null) || matches.some((m) => !m)) return null;

  const dim = (i: TopicIntelligence, k: string) => i.ratingDimensions.find((d) => d.key === k)?.value ?? null;
  const rows: ComparisonRow[] = [
    { key: "score", label: "Gidenler puanı", values: intel.map((i) => i.overallScore), higherIsBetter: true, format: "score" },
    { key: "trend", label: "90 günlük değişim", values: intel.map((i) => i.scoreTrend.delta), higherIsBetter: true, format: "delta" },
    { key: "match", label: "Sana göre", values: matches.map((m) => m!.score), higherIsBetter: true, format: "pct" },
    { key: "taste", label: "Lezzet", values: intel.map((i) => dim(i, "taste")), higherIsBetter: true, format: "score" },
    { key: "service", label: "Servis", values: intel.map((i) => dim(i, "service")), higherIsBetter: true, format: "score" },
    { key: "value", label: "Fiyat / performans", values: intel.map((i) => dim(i, "value")), higherIsBetter: true, format: "score" },
    { key: "atmosphere", label: "Atmosfer", values: intel.map((i) => dim(i, "atmosphere")), higherIsBetter: true, format: "score" },
    { key: "return", label: "Tekrar gider", values: intel.map((i) => Math.round(i.returnRate * 100)), higherIsBetter: true, format: "pct" },
    { key: "verified", label: "Doğrulanmış oran", values: intel.map((i) => Math.round(i.verifiedRatio * 100)), higherIsBetter: true, format: "pct" },
    { key: "expert", label: "Uzman puanı", values: intel.map((i) => i.perspectives.find((p) => p.segment === "expert")?.score ?? null), higherIsBetter: true, format: "score" },
    { key: "similar", label: "Sana benzeyenler", values: ents.map((e) => similarUsers[e.id]?.score ?? null), higherIsBetter: true, format: "score" },
    { key: "momentum", label: "Yön", values: intel.map((i) => ({ strong_up: "Hızlanarak yükseliyor", up: "Yükseliyor", stable: "Dengeli", down: "Geriliyor", strong_down: "Hızlanarak geriliyor" }[i.momentum])), higherIsBetter: true, format: "text" },
    { key: "price", label: "Fiyat seviyesi", values: ents.map((e) => "₺".repeat(e.priceLevel ?? 2)), higherIsBetter: false, format: "text" },
  ];

  const wi = matches.reduce((best, m, i) => (m!.score > matches[best]!.score ? i : best), 0);
  const winner = ents[wi];
  const reasons: DecisionReason[] = matches[wi]!.factors.filter((f) => f.effect > 0.15).slice(0, 3).map((f) => ({ text: f.evidence, kind: "taste" }));
  const others = ents.filter((_, i) => i !== wi);
  const simW = similarUsers[winner.id]?.score ?? 0;
  if (others.every((o) => (similarUsers[o.id]?.score ?? 0) < simW)) reasons.push({ text: "Sana benzeyenlerin puanı burada daha yüksek", kind: "similar", source: `${nf(similarUsers[winner.id]?.sampleSize ?? 0)} benzer profil` });
  const warnings: DecisionWarning[] = [];
  if ((winner.priceLevel ?? 2) > Math.max(...others.map((o) => o.priceLevel ?? 2))) warnings.push({ text: "Daha pahalı", severity: "low" });
  const wv = dim(intel[wi], "value"); const ov = Math.max(...others.map((_, i) => dim(intel.filter((__, j) => j !== wi)[i], "value") ?? 0));
  if (wv !== null && wv < ov) warnings.push({ text: "Fiyat / performans diğerinde daha iyi", severity: "low" });

  const ctxWinner = (ctx: DecisionContextKey) => {
    const ms = ents.map((e) => getPersonalMatch(e.id, ctx)?.score ?? 0);
    return ents[ms.indexOf(Math.max(...ms))].id;
  };
  const dimWinner = (k: string) => { const vs = intel.map((i) => dim(i, k) ?? 0); return ents[vs.indexOf(Math.max(...vs))].id; };
  const byContext = [
    { label: "Date için", entityId: ctxWinner("date") },
    { label: "F/P için", entityId: dimWinner("value") },
    { label: "Hızlı öğle için", entityId: ctxWinner("quick") },
    { label: "Yemek deneyimi için", entityId: dimWinner("taste") },
    { label: "İş yemeği için", entityId: ctxWinner("business") },
  ];

  return { entityIds: ents.map((e) => e.id), winnerId: winner.id, headline: `Senin için: ${winner.name}`, reasons, warnings, byContext, rows, isDemo: true };
}

/* ─────────────────────────────── PASSPORT ──────────────────────────────── */

export function getPassport(handle: string): Passport | null {
  const u = getUserByHandle(handle);
  if (!u) return null;
  const facets = u.expertise.filter((x) => x.scope === "facet").sort((a, b) => b.experienceCount - a.experienceCount);
  const topDistrict = u.homeLocation?.district ?? u.expertise.find((x) => x.scope === "location")?.label ?? "İstanbul";
  const ret = Math.round(72 + (u.reputation.score / 100) * 12);
  const all = {
    key: "2026", label: "2026 Gidenler'im",
    entityCount: u.stats.entitiesVisited,
    districtCount: Math.max(3, Math.min(14, Math.round(u.stats.entitiesVisited / 14))),
    cuisineCount: Math.max(2, Math.min(9, facets.length + 4)),
    topFacets: (facets.length ? facets : [{ label: "Yeme-içme", experienceCount: u.stats.experiences }]).slice(0, 3).map((f) => ({ label: f.label, count: f.experienceCount })),
    topDistrict, returnRate: ret / 100, verifiedVisits: u.stats.verifiedExperiences,
  };
  const scale = (p: number, n: number) => Math.max(1, Math.round(n * p));
  const sub = (key: string, label: string, p: number) => ({
    ...all, key, label,
    entityCount: scale(p, all.entityCount), districtCount: Math.max(1, Math.round(all.districtCount * Math.sqrt(p))),
    cuisineCount: Math.max(1, Math.round(all.cuisineCount * Math.sqrt(p))),
    topFacets: all.topFacets.map((f) => ({ ...f, count: scale(p, f.count) })),
    verifiedVisits: scale(p, all.verifiedVisits),
  });
  return {
    userId: u.id, handle: u.handle, shareable: u.kind === "creator",
    periods: [all, sub("yaz-2026", "Bu yaz Gidenler'im", 0.21), sub("2026-08", "Ağustos'ta Gidenler'im", 0.07),
      { ...sub(lower(topDistrict), `${topDistrict} Gidenler'im`, 0.34), districtCount: 1, topDistrict }],
    isDemo: true,
  };
}

/* ─────────────────────── BUSINESS INTELLIGENCE ─────────────────────────── */

const ROOT_NOTES: Record<string, BusinessRootCause[]> = {
  "ent.asma-teras": [
    { dimensionKey: "taste", label: "Lezzet", delta: -0.8, theme: "Mutfak kalitesi", themeChangePct: 34, note: "Şef değişiminin ardından mutfak tutarlılığı eleştirileri arttı." },
    { dimensionKey: "value", label: "Fiyat / performans", delta: -0.6, theme: "Pahalı", themeChangePct: 22, note: "Fiyat artışı, düşen lezzet algısıyla aynı döneme denk geldi." },
    { dimensionKey: "atmosphere", label: "Atmosfer", delta: 0.1, note: "Manzara ve mekân hâlâ övülüyor; değişmeyen tek boyut." },
  ],
};

export function getBusinessRootCauses(slug: string): { window: string; from: number; to: number; causes: BusinessRootCause[] } | null {
  const e = getEntity(slug); const it = e && getTopicIntelligence(e.id);
  if (!e || !it || it.overallScore === null) return null;
  const tl = it.timeline; const n = tl.length;
  const from = n >= 3 ? tl[n - 3].score : it.overallScore; const to = it.overallScore;
  const sufficient = it.ratingDimensions.filter((d) => d.trend.sufficient);
  const causes: BusinessRootCause[] = sufficient.length
    ? [...sufficient].sort((a, b) => a.trend.delta - b.trend.delta).slice(0, 3).map((d) => {
      const re = d.key === "value" ? /fiyat|pahal/i : d.key === "service" ? /bekleme|servis/i : d.key === "taste" ? /mutfak|lezzet|yemek/i : d.key === "atmosphere" ? /g[üu]r[üu]lt[üu]|masa|atmosfer/i : /$^/;
      const theme = it.negativeThemes.find((t) => re.test(t.label));
      return {
        dimensionKey: d.key, label: d.label, delta: d.trend.delta,
        theme: theme?.label, themeChangePct: theme ? (theme.direction === "up" ? 22 + (theme.count % 17) : undefined) : undefined,
        note: d.trend.direction === "down" ? `${d.label} algısı son 90 günde zayıfladı.` : d.trend.direction === "up" ? `${d.label} yükseliyor; koru.` : "Stabil.",
      };
    })
    : ROOT_NOTES[e.id] ?? [{ dimensionKey: "overall", label: "Genel", delta: to - from, note: "Boyut bazında yeterli yeni deneyim yok; genel yön gösteriliyor." }];
  return { window: "Son 60 gün", from, to, causes };
}

export function getBusinessRecommendations(slug: string): BusinessRecommendation[] {
  const e = getEntity(slug); const it = e && getTopicIntelligence(e.id);
  if (!e || !it) return [];
  const out: BusinessRecommendation[] = [];
  const wait = it.negativeThemes.find((t) => /bekleme|kuyruk/i.test(t.label));
  if (wait && wait.direction === "up") out.push({
    title: "Hafta sonu servis akışı",
    body: `Son 60 gündeki bekleme eleştirilerinin %43'ü cuma ve cumartesi yoğun saatlerdeki deneyimlerden geliyor. En yüksek etki alanı burası.`,
    impactArea: "Servis", source: `${nf(wait.count)} deneyimde bekleme konusu`, isDemo: true,
  });
  const price = it.negativeThemes.find((t) => /fiyat|pahal/i.test(t.label));
  if (price && price.direction === "up") out.push({
    title: "Fiyat algısını yönet",
    body: "Fiyat eleştirileri yükselirken lezzet puanı düşmüyor; sorun ürün değil, beklenti. Menüde porsiyon ve fiyat ilişkisini görünür kılmak eleştirileri azaltabilir.",
    impactArea: "Fiyat / performans", source: `${nf(price.count)} deneyimde ${lower(price.label)}`, isDemo: true,
  });
  const kitchen = it.negativeThemes.find((t) => /mutfak|lezzet/i.test(t.label));
  if (kitchen && kitchen.direction === "up") out.push({
    title: "Mutfak tutarlılığı",
    body: "Şef değişiminin ardından yazılan deneyimlerde tutarsızlık teması öne çıkıyor. Deneyimler, aynı yemeğin farklı akşamlarda farklı geldiğini anlatıyor.",
    impactArea: "Lezzet", source: `${nf(kitchen.count)} deneyimde ${lower(kitchen.label)}`, isDemo: true,
  });
  if (!out.length) out.push({ title: "Koru", body: "Son 60 günde artan bir şikâyet teması yok. En çok övülen konuyu (" + (it.positiveThemes[0]?.label ?? "lezzet") + ") görünür kılmaya devam et.", impactArea: "Genel", source: `${nf(it.experienceCount)} deneyim`, isDemo: true });
  return out.slice(0, 2);
}

export function getBusinessBenchmarks(slug: string): BusinessBenchmark[] {
  const e = getEntity(slug); const it = e && getTopicIntelligence(e.id);
  if (!e || !it || it.overallScore === null) return [];
  const peers = entities.filter((p) => p.id !== e.id && p.categoryId === e.categoryId).map((p) => getTopicIntelligence(p.id)!).filter((p) => p.overallScore !== null);
  if (!peers.length) return [];
  const avg = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
  const cat = getCategory(e.categoryId)!; const group = `${cat.label} · ${peers.length} benzer mekân`;
  const out: BusinessBenchmark[] = [];
  const svc = it.ratingDimensions.find((d) => d.key === "service");
  if (svc) out.push({ label: "Servis", you: svc.value, peers: avg(peers.map((p) => p.ratingDimensions.find((d) => d.key === "service")?.value ?? 0)), format: "score", peerGroup: group });
  const val = it.ratingDimensions.find((d) => d.key === "value");
  if (val) out.push({ label: "Fiyat / performans", you: val.value, peers: avg(peers.map((p) => p.ratingDimensions.find((d) => d.key === "value")?.value ?? 0)), format: "score", peerGroup: group });
  out.push({ label: "Tekrar gider", you: Math.round(it.returnRate * 100), peers: Math.round(avg(peers.map((p) => p.returnRate)) * 100), format: "pct", peerGroup: group });
  out.push({ label: "Doğrulanmış oran", you: Math.round(it.verifiedRatio * 100), peers: Math.round(avg(peers.map((p) => p.verifiedRatio)) * 100), format: "pct", peerGroup: group });
  return out;
}

export function getBusinessAlerts(slug: string): BusinessAlert[] {
  const e = getEntity(slug); const it = e && getTopicIntelligence(e.id);
  if (!e || !it || it.overallScore === null) return [];
  const out: BusinessAlert[] = [];
  for (const t of it.negativeThemes.filter((x) => x.direction === "up"))
    out.push({ id: `al.${t.key}`, title: `${t.label} şikâyetlerinde anlamlı artış`, detail: `${nf(t.count)} deneyimde; son 30 günde yükselen tema.`, severity: t.count >= 40 ? "action" : "watch", at: "2026-08-30" });
  const val = it.ratingDimensions.find((d) => d.key === "value");
  if (val?.trend.sufficient && val.trend.direction === "down") out.push({ id: "al.value", title: "F/P algısı 90 günlük ortalamanın altında", detail: `Fiyat / performans ${score1(val.value)} — değişim ${val.trend.delta > 0 ? "+" : ""}${score1(val.trend.delta)}.`, severity: "watch", at: "2026-08-28" });
  const expert = it.perspectives.find((p) => p.segment === "expert"); const comm = it.perspectives.find((p) => p.segment === "community");
  if (expert?.score && comm?.score && Math.abs(expert.score - comm.score) >= 0.4) out.push({ id: "al.expert", title: "Uzman puanı topluluk puanından ayrışıyor", detail: `Uzmanlar ${score1(expert.score)}, topluluk ${score1(comm.score)}.`, severity: "info", at: "2026-08-25" });
  if (it.returnRate < 0.6) out.push({ id: "al.return", title: "Tekrar gitme niyeti düşüyor", detail: `Son deneyimlerin yalnızca ${pctOf(Math.round(it.returnRate * 100))} tekrar giderim diyor.`, severity: "action", at: "2026-08-30" });
  return out;
}

/* ─────────────────────────────── NOW ───────────────────────────────────── */

function closesAfter(hours: string | undefined, h: number) {
  if (!hours) return true;
  const m = hours.match(/–\s*(\d{2})[.:](\d{2})/); if (!m) return true;
  const end = Number(m[1]); return end >= h || end <= 4;
}

export function gidenlerNow(context: DecisionContextKey = "default") {
  const evening = listCards().filter((c) => c.score !== null && c.category.id !== "cat.hotel" && closesAfter(c.entity.hours, 21));
  return evening
    .map((c) => ({ card: c, match: getPersonalMatch(c.entity.id, context), decision: getDecision(c.entity.id, context) }))
    .filter((x) => x.match && x.decision)
    .sort((a, b) => b.match!.score - a.match!.score)
    .slice(0, 3);
}

/** Ana sayfa "Sana göre" — demo kişiye en uygun üç yer. */
export function forYou(limit = 3) {
  return listCards()
    .filter((c) => c.score !== null)
    .map((c) => ({ card: c, match: getPersonalMatch(c.entity.id), decision: getDecision(c.entity.id) }))
    .filter((x) => x.match && x.decision)
    .sort((a, b) => b.match!.score - a.match!.score)
    .slice(0, limit);
}

export const demoUserExists = () => users.some((u) => u.id === DEMO_USER_ID);
export { getSchema };


/* ══════════════════════════════════════════════════════════════════════════
   V4 — zevk düzenlemeleri · zevk benzerliği · grup · harita · bildirim
   ══════════════════════════════════════════════════════════════════════════ */

/** Kullanıcının kendi düzenlemeleri çıkarımın üstüne yazar. Kalıcı profil (demo) değişmez. */
export function effectiveProfile(edits?: TasteEdits, userId: string = DEMO_USER_ID): TasteProfile {
  const base = getTasteProfile(userId);
  if (!edits) return base;
  const dims = base.dimensions.map((d) => ({ ...d, weight: edits.dimensions[d.key] ?? d.weight }));
  const bump = (key: string, min: number) => { const d = dims.find((x) => x.key === key); if (d && d.weight < min) d.weight = min; };
  if (edits.dislikes.includes("kalabalık") || edits.dislikes.includes("gürültü")) bump("quiet", 85);
  if (edits.dislikes.includes("ilgisiz servis")) bump("service", 90);
  if (edits.dislikes.includes("uzun bekleme")) bump("speed", 70);
  const cuisines = base.cuisinePreferences.map((c) => ({ ...c, level: edits.cuisines[c.key] ?? c.level }));
  return { ...base, dimensions: dims, cuisinePreferences: cuisines, lowTolerance: [...new Set([...base.lowTolerance, ...edits.dislikes])] };
}

/** Hangi tercih kullanıcının kendi seçimi, hangisi deneyimlerden çıkarım? */
export function tasteSourceOf(edits: TasteEdits | undefined, kind: "dimension" | "cuisine", key: string): "explicit" | "inferred" {
  if (!edits) return "inferred";
  return kind === "dimension" ? (key in edits.dimensions ? "explicit" : "inferred") : (key in edits.cuisines ? "explicit" : "inferred");
}

const LEVEL_NUM: Record<string, number> = { "çok yüksek": 3, "yüksek": 2, "orta": 1, "düşük": 0 };

/** Zevk benzerliği (0–100): öncelik ağırlıkları + mutfak tercihleri. */
export function tasteSimilarity(a: TasteProfile, b: TasteProfile): { score: number; shared: string[] } {
  const keys = ["taste", "service", "value", "atmosphere", "quiet", "speed"];
  const wa = keys.map((k) => a.dimensions.find((d) => d.key === k)?.weight ?? (k === "taste" ? (a.dimensions.find((d) => d.key === "drink")?.weight ?? 50) : 50));
  const wb = keys.map((k) => b.dimensions.find((d) => d.key === k)?.weight ?? (k === "taste" ? (b.dimensions.find((d) => d.key === "drink")?.weight ?? 50) : 50));
  const dist = Math.sqrt(wa.reduce((acc, x, i) => acc + Math.pow((x - wb[i]) / 100, 2), 0) / keys.length);
  const dimSim = 1 - dist;
  const all = new Set([...a.cuisinePreferences.map((c) => c.key), ...b.cuisinePreferences.map((c) => c.key)]);
  let agree = 0, n = 0; const shared: string[] = [];
  for (const k of all) {
    const pa = a.cuisinePreferences.find((c) => c.key === k); const pb = b.cuisinePreferences.find((c) => c.key === k);
    if (!pa || !pb) continue; // sinyal yoksa yargı yok
    const la = LEVEL_NUM[pa.level], lb = LEVEL_NUM[pb.level];
    agree += 1 - Math.abs(la - lb) / 4; n++;
    if (la >= 2 && lb >= 2) shared.push(k);
  }
  const cuisineSim = n ? agree / n : 0.5;
  const score = Math.round((dimSim * 0.55 + cuisineSim * 0.45) * 100);
  return { score: Math.min(98, score), shared };
}

/** Zevkine yakın uzmanlar — takipçiye göre değil, benzerliğe göre. */
export function similarCreators(profile: TasteProfile, limit = 4) {
  return users
    .filter((u) => u.id !== profile.userId && getTasteProfile(u.id) && getTasteProfile(u.id).visibility === "public")
    .map((u) => ({ user: u, ...tasteSimilarity(profile, getTasteProfile(u.id)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ─────────────────────────── BİRLİKTE NEREYE? ──────────────────────────── */

export const getDemoGroup = (): Group => demoGroup;
export const getGroupById = (id: string): Group | undefined => getGroup(id);

export function getGroupDecision(group: Group, votes: GroupVote[] = [], myEdits?: TasteEdits): GroupDecision {
  const pool = listCards().filter((c) => c.score !== null && c.category.compliance.showScores && c.category.id === "cat.restaurant");
  const needsVeg = group.members.some((m) => m.needsVegetarian);
  const minBudget = Math.min(...group.members.map((m) => m.budget ?? 4));

  const candidates: GroupCandidate[] = pool.map((c) => {
    const memberMatches = group.members.map((m) => {
      const prof = m.isYou ? effectiveProfile(myEdits) : getTasteProfile(m.tasteUserId);
      const pm = getPersonalMatch(c.entity.id, group.context, m.tasteUserId, undefined, prof);
      let s = pm?.score ?? 50;
      if (m.budget && (c.entity.priceLevel ?? 2) > m.budget) s -= ((c.entity.priceLevel ?? 2) - m.budget) * 10;
      if (m.needsVegetarian && !vegetarianOption[c.entity.id]) s -= 25;
      return { memberId: m.id, score: Math.max(0, Math.round(s)) };
    });
    const mean = memberMatches.reduce((a, x) => a + x.score, 0) / memberMatches.length;
    const min = Math.min(...memberMatches.map((x) => x.score));
    /* Ortalama tek başına yetmez: en mutsuz üye de sayılır. */
    let groupScore = Math.round(mean * 0.7 + min * 0.3);
    if (group.district && c.entity.location?.district !== group.district) groupScore -= 6;
    const myVotes = votes.filter((v) => v.entityId === c.entity.id && v.memberId.startsWith(`${group.id}|`));
    groupScore += myVotes.reduce((a, v) => a + (v.choice === "olur" ? 3 : v.choice === "istemiyorum" ? -6 : 0), 0);
    groupScore = Math.max(0, Math.min(99, groupScore));

    const strong = memberMatches.filter((x) => x.score >= 75).length;
    const reasons: DecisionReason[] = [];
    if (strong >= Math.ceil(group.members.length / 2)) reasons.push({ text: `${group.members.length} kişinin ${strong}'${strong === 1 ? "ine" : strong === 2 || strong === 3 ? "üne" : "üne"} güçlü eşleşme`, kind: "taste" });
    const fit = contextFit[c.entity.id]?.[group.context] ?? 0;
    if (fit > 0) reasons.push({ text: `${decisionContexts.find((x) => x.key === group.context)?.label ?? "Grup"} bağlamına uygun`, kind: "community" });
    const it = getTopicIntelligence(c.entity.id)!;
    const taste = it.ratingDimensions.find((d) => d.key === "taste");
    if (taste && taste.value >= 8.5) reasons.push({ text: `Yemek kalitesi güçlü — lezzet ${score1(taste.value)}`, kind: "community", source: `${nf(it.experienceCount)} deneyim` });
    if (needsVeg && vegetarianOption[c.entity.id]) reasons.push({ text: "Vejetaryen seçenek deneyimlerde anlatılıyor", kind: "community" });
    if (group.district && c.entity.location?.district === group.district) reasons.push({ text: `Herkesin istediği semtte — ${group.district}`, kind: "community" });

    const warnings: DecisionWarning[] = [];
    const over = group.members.filter((m) => m.budget && (c.entity.priceLevel ?? 2) > m.budget);
    if (over.length) warnings.push({ text: `Grubun ${over.length} üyesinin bütçe tercihinin üzerinde (${over.map((m) => m.name).join(", ")})`, severity: over.length >= 2 ? "medium" : "low" });
    if (needsVeg && !vegetarianOption[c.entity.id]) warnings.push({ text: `Vejetaryen seçenek zayıf — ${group.members.find((m) => m.needsVegetarian)?.name} için sorun`, severity: "medium" });
    const unhappy = memberMatches.filter((x) => x.score < 55);
    if (unhappy.length) warnings.push({ text: `${unhappy.map((x) => group.members.find((m) => m.id === x.memberId)?.name).join(", ")} için zayıf eşleşme`, severity: "low" });
    if (group.district && c.entity.location?.district !== group.district) warnings.push({ text: `${c.entity.location?.district} — grubun istediği semt dışında`, severity: "low" });
    return { entityId: c.entity.id, groupScore, memberMatches, reasons: reasons.slice(0, 4), warnings: warnings.slice(0, 2) };
  }).sort((a, b) => b.groupScore - a.groupScore).slice(0, 3);

  const total = group.members.length;
  const likes = (facet: string) => group.members.filter((m) => { const p = m.isYou ? effectiveProfile(myEdits) : getTasteProfile(m.tasteUserId); return LEVEL_NUM[p.cuisinePreferences.find((c) => c.key === facet)?.level ?? "orta"] >= 2; }).length;
  const preferences: GroupPreference[] = [
    { label: "Japon mutfağı seviyor", count: likes("Japon mutfağı"), total },
    { label: "fiyat / performansa hassas", count: group.members.filter((m) => (m.budget ?? 4) <= 2 || (m.isYou ? false : getTasteProfile(m.tasteUserId).priceSensitivity === "yüksek")).length, total },
    { label: "vejetaryen seçenek istiyor", count: group.members.filter((m) => m.needsVegetarian).length, total },
    { label: `${group.district ?? "aynı semt"} istiyor`, count: group.members.filter((m) => m.district === group.district).length, total },
  ].filter((p) => p.count > 0);
  void minBudget;
  return { groupId: group.id, candidates, preferences, isDemo: true };
}

/* ─────────────────────────── HARİTADA GİDENLER ─────────────────────────── */

export const mapFilters: Array<{ key: MapFilter; label: string }> = [
  { key: "sana_gore", label: "Sana göre" }, { key: "en_iyi", label: "En iyi" }, { key: "yukselen", label: "Yükselen" },
  { key: "uzman", label: "Uzmanların seçimi" }, { key: "fp", label: "F/P" }, { key: "sessiz", label: "Sessiz" },
  { key: "date", label: "Date" }, { key: "aile", label: "Aile" },
];

function insightOf(it: TopicIntelligence): string {
  const taste = it.ratingDimensions.find((d) => ["taste", "drink"].includes(d.key));
  const rising = it.negativeThemes.find((t) => t.direction === "up");
  const parts: string[] = [];
  if (taste && taste.value >= 8.5) parts.push("Lezzet güçlü");
  else if (taste && taste.value < 6.5) parts.push("Lezzet zayıf");
  if (it.momentum === "stable") parts.push("son 90 gün stabil");
  else if (it.momentum === "up" || it.momentum === "strong_up") parts.push("son 90 gün yükseliyor");
  else parts.push("son 90 gün geriliyor");
  if (rising) parts.push(`${lower(rising.label)} şikâyetleri artıyor`);
  return parts.join(", ") + ".";
}

export function getMapRecommendations(filter: MapFilter = "sana_gore", edits?: TasteEdits): MapResult[] {
  const prof = effectiveProfile(edits);
  const rows = Object.entries(demoGeo).map(([id, g]) => {
    const it = getTopicIntelligence(id)!; const e = getEntityById(id)!;
    const ctx: DecisionContextKey = filter === "date" ? "date" : filter === "aile" ? "family" : "default";
    const m = getPersonalMatch(id, ctx, DEMO_USER_ID, filter === "sessiz" ? { quiet: 95 } : filter === "fp" ? { value: 95 } : undefined, prof);
    const expert = it.perspectives.find((p) => p.segment === "expert");
    const key = filter === "en_iyi" ? (it.overallScore ?? 0) * 10
      : filter === "yukselen" ? it.scoreTrend.delta * 100 + (it.overallScore ?? 0)
      : filter === "uzman" ? (expert?.score ?? 0) * 10 + (expert?.experienceCount ?? 0)
      : filter === "fp" ? (it.ratingDimensions.find((d) => d.key === "value")?.value ?? 0) * 10
      : filter === "sessiz" ? (ambientSignals[id]?.quiet ?? 5) * 10
      : (m?.score ?? 0);
    return { entityId: id, lat: g.lat, lng: g.lng, score: it.overallScore, direction: it.scoreTrend.direction, match: m?.score ?? null, insight: insightOf(it), key, e };
  }).sort((a, b) => b.key - a.key);
  return rows.map((r, i) => ({ entityId: r.entityId, lat: r.lat, lng: r.lng, score: r.score, direction: r.direction, match: r.match, insight: r.insight, rank: i + 1 }));
}

/* ───────────────────────────── BİLDİRİM ────────────────────────────────── */

export function getNotifications(relationships: Record<string, UserEntityRelationship>): NotificationEvent[] {
  const out: NotificationEvent[] = [];
  for (const rel of Object.values(relationships)) {
    const e = getEntityById(rel.entityId); const it = getTopicIntelligence(rel.entityId);
    if (!e || !it) continue;
    if (rel.state === "want_to_go") {
      if (it.momentum === "up" || it.momentum === "strong_up") out.push({ id: `n.up.${e.id}`, kind: "want_to_go_rising", entityId: e.id, title: `Gitmek istediğin ${e.name} son 30 günde yükseliyor`, body: `Gidenler ${score1(it.overallScore ?? 0)} · ${it.scoreTrend.delta > 0 ? "+" : ""}${score1(it.scoreTrend.delta)} son 90 gün`, at: "2026-09-02", basedOn: "want_to_go" });
      out.push({ id: `n.went.${e.id}`, kind: "went_yet", entityId: e.id, title: `${e.name}'a gittin mi?`, body: "Gitmek istiyorum demiştin. Gittiysen nasıl geçtiğini iki dokunuşla söyle.", at: "2026-09-02", basedOn: "want_to_go" });
    }
    if (rel.state === "saved") {
      const t = it.negativeThemes.find((x) => x.direction === "up");
      if (t) out.push({ id: `n.cmp.${e.id}`, kind: "saved_complaints_up", entityId: e.id, title: `Kaydettiğin ${e.name}'da ${lower(t.label)} şikâyetleri arttı`, body: `${nf(t.count)} deneyimde; son 30 günde yükselen tema.`, at: "2026-09-01", basedOn: "saved" });
    }
    if (rel.state === "visited") out.push({ id: `n.write.${e.id}`, kind: "visited_write_experience", entityId: e.id, title: `${e.name} için deneyimini yaz`, body: "Gittiğini söyledin. Yazdığın deneyim bir sonraki kararı besler.", at: "2026-09-02", basedOn: "visited" });
  }
  return out;
}

/* ───────────────────────────── PROVENANCE ──────────────────────────────── */

export function decisionProvenance(entityId: string, m: PersonalMatch | null): Provenance | null {
  const it = getTopicIntelligence(entityId);
  if (!it) return null;
  const expert = it.perspectives.find((p) => p.segment === "expert");
  return {
    sourceCount: it.experienceCount,
    verifiedCount: Math.round(it.experienceCount * it.verifiedRatio),
    timeWindow: "Son 90 gün",
    confidence: m?.confidence ?? it.confidence,
    lastUpdated: "2026-09-01",
    derivedFrom: [
      "Zevk profilin",
      `${nf(m?.similarity.sampleSize ?? 0)} benzer kullanıcı`,
      `${nf(it.experienceCount)} deneyim · son 90 gün`,
      `${nf(Math.round(it.experienceCount * it.verifiedRatio))} doğrulanmış ziyaret`,
      expert && expert.experienceCount ? `${nf(expert.experienceCount)} uzman deneyimi` : "Uzmanlık grafiği",
    ],
  };
}
