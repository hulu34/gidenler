import { cardOf, getEntityById, getTopicIntelligence, listCards, type EntityCard } from "@/lib/api";
import { contextFit, ambientSignals } from "@/data/taste";
import { askAI, type AIStructured, type FollowUp } from "@/lib/decisionEngine";
import { searchV3 } from "@/lib/search";
import type { DecisionContextKey, TasteEdits } from "@/lib/types";
import { sanitizeDeep } from "./sanitize";

/* ──────────────────────────────────────────────────────────────────────────
   GİDENLER ARAÇLARI — modelin veriye SALT OKUNUR erişimi.
   · Her araç deterministik motorun/arama motorunun sarmalayıcısıdır; model işletme UYDURAMAZ,
     yalnızca bu araçların döndürdüğü entityId'leri kullanabilir (orchestrator kapısı).
   · Çıktılar: PII yok (kullanıcı/yazar kimliği, ad yok), tüm serbest metin sanitize edilir, boyut sınırlı.
   · Yazma yok: puan, kullanıcı, veri değişmez. Bu dosyada import edilen hiçbir fonksiyon yazma yapmaz.
   ────────────────────────────────────────────────────────────────────────── */

export type ToolName = "search_places" | "get_place_candidates" | "rank_candidates" | "get_place_details" | "get_category_results" | "get_context_fit" | "get_experience_signals";

export interface ToolContext { taste?: TasteEdits; structured?: AIStructured; followUp?: FollowUp | null }

const MAX_ITEMS = 8;
const str = (v: unknown, max = 120) => (typeof v === "string" ? v.slice(0, max) : "");
const int = (v: unknown, d: number, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : d; };

function placeOf(c: EntityCard) {
  const e = c.entity;
  return {
    entityId: e.id, slug: e.slug, name: e.name, kind: e.subcategory ?? c.category.label,
    district: e.location?.district ?? null, city: e.location?.city ?? "İstanbul",
    priceLevel: e.priceLevel ?? null, score: c.category.compliance.showScores ? c.score : null,
    experienceCount: c.experienceCount, confidence: c.confidence ?? "low", trend90d: Math.round(c.delta90d * 100) / 100,
    topComplaint: c.topComplaint ?? null, tags: (e.tags ?? []).slice(0, 6), regulated: !c.category.compliance.showScores,
  };
}
export type PlaceSummary = ReturnType<typeof placeOf>;

/* ───── araçlar ───── */

/** Serbest metin arama (lib/search v3). */
function search_places(args: Record<string, unknown>) {
  const q = str(args.query, 200);
  if (!q) return { error: "query gerekli", items: [] };
  const r = searchV3(q, { limit: MAX_ITEMS, categoryId: str(args.categoryId, 40) || undefined });
  return {
    understood: r.query.understood.slice(0, 6), corrections: r.query.corrections.slice(0, 3),
    items: [...r.exact, ...r.adjacent].slice(0, MAX_ITEMS).map((h) => ({ ...placeOf(h.card), tier: h.tier, reason: h.reason })),
  };
}

/** Deterministik karar motorundan aday listesi (niyet + uygunluk + bağlam uyumu). Modelin BAŞLANGIÇ noktası. */
function get_place_candidates(args: Record<string, unknown>, ctx: ToolContext) {
  const q = str(args.query, 400);
  if (!q) return { error: "query gerekli", items: [] };
  const a = askAI(q, ctx.structured ?? {}, { taste: ctx.taste, personalized: !!ctx.taste, followUp: ctx.followUp ?? null, limit: int(args.limit, MAX_ITEMS, 1, MAX_ITEMS) });
  return {
    intent: { content: a.intent.content, locations: a.intent.locations, qualifiers: a.intent.qualifiers, day: a.intent.dayLabel ?? null, hour: a.intent.hour ?? null, party: a.intent.party ?? null, context: a.intent.context, regulated: a.intent.regulated },
    pipeline: a.pipeline, overallConfidence: a.overallConfidence, note: a.note,
    items: a.items.map((i) => ({ entityId: i.entityId, slug: i.slug, name: i.name, kind: i.kind, place: i.place, engineMatch: i.match, score: i.score, confidence: i.confidence, reasons: i.reasons.slice(0, 3), cautions: i.cautions.slice(0, 2), hoursNote: i.hoursNote, matchParts: i.matchParts.map((p) => ({ label: p.label, value: p.value, max: p.max })) })),
    regulated: a.regulated ? { note: a.regulated.note, items: a.regulated.items.slice(0, 5) } : null,
  };
}

/** Verilen adayları motorun ölçütleriyle yeniden sıralar (model kendi listesini doğrulatır). */
function rank_candidates(args: Record<string, unknown>, ctx: ToolContext) {
  const ids = Array.isArray(args.entityIds) ? args.entityIds.map((x) => str(x, 64)).filter(Boolean).slice(0, MAX_ITEMS) : [];
  const q = str(args.query, 400);
  if (!ids.length || !q) return { error: "entityIds ve query gerekli", items: [] };
  const a = askAI(q, ctx.structured ?? {}, { taste: ctx.taste, personalized: !!ctx.taste, followUp: ctx.followUp ?? null, limit: 40 });
  const known = new Set(ids);
  const ranked = a.items.filter((i) => known.has(i.entityId)).map((i, idx) => ({ rank: idx + 1, entityId: i.entityId, name: i.name, engineMatch: i.match, confidence: i.confidence }));
  const unknown = ids.filter((id) => !getEntityById(id));
  const notEligible = ids.filter((id) => getEntityById(id) && !ranked.some((r) => r.entityId === id));
  return { items: ranked, notEligible, unknown };
}

/** Tek mekân ayrıntısı: saat, fiyat, temalar, güven. Yazar/kullanıcı bilgisi YOK. */
function get_place_details(args: Record<string, unknown>) {
  const id = str(args.entityId, 64);
  const e = getEntityById(id);
  if (!e) return { error: "unknown_entity", entityId: id };
  const c = cardOf(e); const it = getTopicIntelligence(e.id);
  const show = c.category.compliance.showScores;
  return {
    ...placeOf(c), hours: e.hours ?? null, address: e.address ?? null, isDemo: e.isDemo, facets: (e.facets ?? []).slice(0, 6),
    dimensions: show ? (it?.ratingDimensions ?? []).slice(0, 6).map((d) => ({ key: d.key, label: d.label, value: Math.round(d.value * 10) / 10 })) : [],
    positiveThemes: (it?.positiveThemes ?? []).slice(0, 4).map((t) => ({ label: t.label, count: t.count })),
    negativeThemes: (it?.negativeThemes ?? []).slice(0, 4).map((t) => ({ label: t.label, count: t.count })),
    returnRate: show && it ? Math.round(it.returnRate * 100) / 100 : null, verifiedRatio: it ? Math.round(it.verifiedRatio * 100) / 100 : null,
    consensus: show && it?.consensus ? { level: it.consensus.level, polarization: it.consensus.polarization } : null,
    summary: show && it?.aiSummary ? it.aiSummary.lines.slice(0, 3).map((l) => str(l, 160)) : null,
  };
}

/** Kategori/alt-kategori listesi (ör. "kahve", "meyhane"). */
function get_category_results(args: Record<string, unknown>) {
  const cat = str(args.categoryId, 40); const sub = str(args.subcategory, 40).toLocaleLowerCase("tr"); const district = str(args.district, 40).toLocaleLowerCase("tr");
  let cards = listCards();
  if (cat) cards = cards.filter((c) => c.category.id === cat || c.category.slug === cat);
  if (sub) cards = cards.filter((c) => (c.entity.subcategory ?? "").toLocaleLowerCase("tr").includes(sub) || (c.entity.facets ?? []).some((f) => f.toLocaleLowerCase("tr").includes(sub)));
  if (district) cards = cards.filter((c) => (c.entity.location?.district ?? "").toLocaleLowerCase("tr").includes(district));
  const sorted = cards.filter((c) => c.category.compliance.showScores).sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.experienceCount - a.experienceCount);
  return { total: cards.length, items: sorted.slice(0, MAX_ITEMS).map(placeOf) };
}

/** Bağlam uyumu (date/friends/business/family/solo/quick) + ortam sinyalleri. */
function get_context_fit(args: Record<string, unknown>) {
  const ids = Array.isArray(args.entityIds) ? args.entityIds.map((x) => str(x, 64)).filter(Boolean).slice(0, MAX_ITEMS) : [];
  const ctxKey = (["default", "date", "friends", "business", "family", "solo", "quick"] as DecisionContextKey[]).find((k) => k === str(args.context, 20)) ?? "default";
  return {
    context: ctxKey,
    items: ids.map((id) => {
      const e = getEntityById(id); if (!e) return { entityId: id, error: "unknown_entity" };
      const fit = contextFit[id]?.[ctxKey]; const amb = ambientSignals[id];
      return { entityId: id, name: e.name, contextFit: fit != null ? Math.round(fit * 100) / 100 : null, quiet: amb ? Math.round(amb.quiet * 100) / 100 : null, speed: amb ? Math.round(amb.speed * 100) / 100 : null };
    }),
  };
}

/** Deneyim sinyalleri: hacim, trend, momentum, tekrar gidiş, olumsuz tema. Yorum METNİ yok (yalnızca sayısal/etiket). */
function get_experience_signals(args: Record<string, unknown>) {
  const ids = Array.isArray(args.entityIds) ? args.entityIds.map((x) => str(x, 64)).filter(Boolean).slice(0, MAX_ITEMS) : [];
  return {
    items: ids.map((id) => {
      const e = getEntityById(id); const it = getTopicIntelligence(id);
      if (!e || !it) return { entityId: id, error: "unknown_entity" };
      const show = cardOf(e).category.compliance.showScores;
      return {
        entityId: id, name: e.name, experienceCount: it.experienceCount, verifiedRatio: Math.round(it.verifiedRatio * 100) / 100,
        returnRate: show ? Math.round(it.returnRate * 100) / 100 : null, trend: show ? { direction: it.scoreTrend.direction, delta: Math.round(it.scoreTrend.delta * 100) / 100 } : null,
        momentum: show ? it.momentum : null, confidence: it.confidence,
        topNegative: it.negativeThemes.slice(0, 2).map((t) => t.label), topPositive: it.positiveThemes.slice(0, 2).map((t) => t.label),
      };
    }),
  };
}

const TOOLS: Record<ToolName, (args: Record<string, unknown>, ctx: ToolContext) => unknown> = {
  search_places, get_place_candidates, rank_candidates, get_place_details, get_category_results, get_context_fit, get_experience_signals,
};

export const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  search_places: "Serbest metin arama. args: {query, categoryId?}",
  get_place_candidates: "Gidenler karar motorundan niyet+uygunluk süzgecinden geçmiş aday listesi. args: {query, limit?}. ÖNCE BUNU ÇAĞIR.",
  rank_candidates: "Verdiğin entityId'leri motorun ölçütleriyle sıralar; uygun olmayanları söyler. args: {query, entityIds[]}",
  get_place_details: "Tek mekân: saat, fiyat, boyutlar, temalar. args: {entityId}",
  get_category_results: "Kategoriye/alt türe/ilçeye göre liste. args: {categoryId?, subcategory?, district?}",
  get_context_fit: "Bağlam uyumu (date|friends|business|family|solo|quick) ve sakinlik/hız. args: {entityIds[], context}",
  get_experience_signals: "Deneyim hacmi, trend, tekrar gidiş, temalar. args: {entityIds[]}",
};

/** Aracı çalıştırır; çıktı sanitize edilmiş, boyut sınırlı veri. Bilinmeyen araç → hata nesnesi (istisna değil). */
export function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): { ok: boolean; result: unknown } {
  const fn = TOOLS[name as ToolName];
  if (!fn) return { ok: false, result: { error: "unknown_tool", tool: name } };
  try {
    const raw = fn(args ?? {}, ctx);
    const clean = sanitizeDeep(raw, 300);
    const json = JSON.stringify(clean);
    /* boyut kapağı: model bağlamını şişirme */
    if (json.length > 12000) return { ok: true, result: { truncated: true, note: "Çıktı kısaltıldı; daha dar sorgu kullan.", items: (clean as { items?: unknown[] }).items?.slice(0, 4) ?? [] } };
    return { ok: true, result: clean };
  } catch (e) {
    return { ok: false, result: { error: "tool_failed", message: e instanceof Error ? e.message.slice(0, 120) : "hata" } };
  }
}

/** Orchestrator kapısı: model yanıtındaki entityId gerçekten veri kümesinde ve regüle değilse geçer. */
export function isKnownEntity(id: string): boolean {
  const e = getEntityById(id);
  return !!e;
}
export function isRegulatedEntity(id: string): boolean {
  const e = getEntityById(id);
  return e ? !cardOf(e).category.compliance.showScores : false;
}
