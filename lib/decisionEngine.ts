import { experiences } from "@/data/experiences";
import { ambientSignals, contextFit } from "@/data/taste";
import { getTopicIntelligence, type EntityCard } from "@/lib/api";
import { getPersonalMatch, effectiveProfile } from "@/lib/decision";
import { expertSignal } from "@/lib/rankings";
import { CONFIDENCE_LABEL } from "@/lib/semantic";
import { nf, score1 } from "@/lib/format";
import { display, fold, parseQuery, searchV3, type ParsedQuery, type Qualifier, type SearchHit } from "@/lib/search";
import type { DecisionContextKey, TasteEdits } from "@/lib/types";

/* ──────────────────────────────────────────────────────────────────────────
   GİDENLER AI — KARAR MOTORU. "Koşullarıma göre hangisini seçmeliyim?"
   LLM sarmalayıcı değil: deneyim grafiği üzerinde deterministik bir boru hattı.
     SORGU → NİYET AYRIŞTIRMA → ARAMA MOTORUNDAN ADAY (lib/search) → UYGUNLUK →
     BAĞLAM UYUMU → GİDENLER SİNYALLERİ → YENİDEN SIRALAMA → AÇIKLAMA
   Veri dürüstlüğü: canlı uygunluk / masa / "açık" üretilmez; çalışma saati demo veridir ve öyle etiketlenir.
   Regüle kategoriler (hekim/diş/avukat): puan, uyum, "en iyi" yok — nötr keşif yanıtı.
   ────────────────────────────────────────────────────────────────────────── */

export interface AIStructured {
  location?: string; day?: string; time?: string; party?: number; category?: "yemek" | "kahve" | "gece" | "konaklama" | "kultur" | "hepsi";
}
export type FollowUp = "quiet" | "value" | "near" | "expert" | "late";

export interface AIIntent {
  text: string;
  content: string[]; locations: string[]; qualifiers: Qualifier[];
  day?: string; dayLabel?: string; weekend: boolean; time?: string; hour?: number; party?: number;
  context: DecisionContextKey; budget?: 1 | 2 | 3 | 4;
  categoryIds: string[] | null;
  region?: "bogaz";
  understood: string[];
  regulated: boolean;
}

export interface MatchPart { label: string; value: number; max: number; note?: string }

export interface AIRecommendation {
  entityId: string; slug: string; name: string; kind: string; place: string;
  score: number | null; delta: number; confidence: "low" | "medium" | "high";
  match: number; matchParts: MatchPart[];
  reasons: string[]; cautions: string[]; hoursNote: string; provenance: string;
  outside: boolean;
}

export interface AIAnswer {
  intent: AIIntent;
  items: AIRecommendation[];
  pipeline: { retrieved: number; eligible: number; ranked: number; fallback: boolean };
  overallConfidence: "Yüksek" | "Orta" | "Sınırlı";
  provenance: string;
  note: string;
  regulated?: { label: string; items: Array<{ slug: string; name: string; branch: string; place: string; count: number; verified: number }>; note: string };
  followUps: Array<{ key: FollowUp; label: string }>;
}

/* ───── 1 · niyet ayrıştırma ───── */

const DAYS: Array<[RegExp, string, boolean]> = [
  [/\bbug[üu]n\b/i, "Bugün", false], [/\byar[ıi]n\b/i, "Yarın", false],
  [/\bpazartesi\b/i, "Pazartesi", false], [/\bsal[ıi]\b/i, "Salı", false], [/\b[çc]ar[şs]amba\b/i, "Çarşamba", false], [/\bper[şs]embe\b/i, "Perşembe", false],
  [/\bcuma\b(?!rtesi)/i, "Cuma", true], [/\bcumartesi\b/i, "Cumartesi", true], [/\bpazar\b(?!\s*(yeri|pazar[ıi]))/i, "Pazar", true], [/\bhafta\s*sonu\b/i, "Hafta sonu", true],
];
const BOGAZ = ["besiktas", "sariyer", "uskudar", "beykoz"];
const REGULATED_WORDS = /\b(doktor|hekim|di[şs](\s|$|ci|çi|hekimi)|avukat|hukuk|dava|muayene|dermatolog|kardiyolog|ortodonti|implant)/i;

export function parseIntent(text: string, s: AIStructured = {}): AIIntent {
  const t = text.toLocaleLowerCase("tr");
  /* gün / saat / kişi ifadeleri arama metnine girmez ("pazar kahvaltısı" → pazar günü, pazar yeri değil) */
  const cleaned = t.replace(/\b(bug[üu]n|yar[ıi]n|pazartesi|sal[ıi]|[çc]ar[şs]amba|per[şs]embe|cumartesi|cuma|pazar|hafta\s*sonu)('?[a-zçğıöşü]*)?\b/g, " ").replace(/\b([01]?\d|2[0-3])[.:][0-5]\d('?[a-zçğıöşü]*)?\b/g, " ").replace(/\b\d+\s*ki[şs]i(yiz|lik)?\b/g, " ");
  const q: ParsedQuery = parseQuery([cleaned, s.location ?? ""].join(" "));
  const intent: AIIntent = { text, content: q.content, locations: q.locations, qualifiers: [...q.qualifiers], weekend: false, context: "default", categoryIds: null, understood: [], regulated: REGULATED_WORDS.test(text) };

  /* gün + saat */
  const dayRe = DAYS.find(([re]) => re.test(t));
  if (s.day) { const d = DAYS.find(([, label]) => label.toLocaleLowerCase("tr") === s.day!.toLocaleLowerCase("tr")); intent.day = s.day; intent.dayLabel = d?.[1] ?? s.day; intent.weekend = d?.[2] ?? /cumartesi|pazar|hafta sonu/i.test(s.day); }
  else if (dayRe) { intent.day = dayRe[1]; intent.dayLabel = dayRe[1]; intent.weekend = dayRe[2]; }
  const tm = s.time ?? t.match(/\b([01]?\d|2[0-3])[.:]([0-5]\d)\b/)?.[0]?.replace(".", ":") ?? (t.match(/\bsaat\s+(\d{1,2})\b/)?.[1] ? `${t.match(/\bsaat\s+(\d{1,2})\b/)![1].padStart(2, "0")}:00` : undefined);
  if (tm) { intent.time = tm; intent.hour = Number(tm.split(":")[0]); }
  else if (/ak[şs]am/.test(t)) intent.hour = 20; else if (/[öo]ğle/.test(t)) intent.hour = 12; else if (/kahvalt[ıi]|sabah/.test(t)) intent.hour = 10; else if (/gece|ge[çc] saat/.test(t)) intent.hour = 23;

  /* kişi */
  const party = s.party ?? (t.match(/(\d+)\s*ki[şs]i/)?.[1] ? Number(t.match(/(\d+)\s*ki[şs]i/)![1]) : undefined);
  if (party) intent.party = party;

  /* bağlam */
  if (/date|fl[öo]rt|sevgili|romantik/.test(t)) intent.context = "date";
  else if (/i[şs] yeme[ğg]i|toplant[ıi]|m[üu][şs]teri|(^|\s)i[şs](\s|$)/.test(t)) intent.context = "business";
  else if (/[çc]ocuk|aile|anne|baba/.test(t)) intent.context = "family";
  else if (/h[ıi]zl[ıi]|aya[küu]st[üu]|pratik/.test(t) || (intent.hour === 12 && /[öo]ğle/.test(t))) intent.context = "quick";
  else if (/arkada[şs]|grup|ekip/.test(t) || (party && party >= 4)) intent.context = "friends";
  else if (/tek ba[şs][ıi]m|yaln[ıi]z/.test(t)) intent.context = "solo";
  if (intent.context === "quick" && !intent.qualifiers.includes("fast")) intent.qualifiers.push("fast");

  /* bütçe */
  if (/ucuz|hesapl[ıi]|b[üu]t[çc]e|ekonomik/.test(t)) intent.budget = 2;
  const tl = t.match(/₺{1,4}/); if (tl) intent.budget = tl[0].length as 1 | 2 | 3 | 4;

  /* bölge: "Boğaz tarafı" → dört ilçe; manzara niteliği zaten parseQuery'de */
  if (/bo[ğg]az/.test(t) && !intent.locations.length) { intent.region = "bogaz"; intent.content = intent.content.filter((c) => c !== "bogaz"); }

  /* kategori: yapısal seçim > metin ipucu */
  const catOf: Record<string, string[]> = { yemek: ["cat.restaurant"], kahve: ["cat.cafe"], gece: ["cat.bar"], konaklama: ["cat.hotel"], kultur: ["cat.culture", "cat.show", "cat.venue", "cat.film"] };
  if (s.category && s.category !== "hepsi") intent.categoryIds = catOf[s.category];
  else if (/kahvalt[ıi]/.test(t)) intent.categoryIds = ["cat.restaurant", "cat.cafe"];
  else if (/yemek|ak[şs]am|[öo]ğle|restoran|lokanta|yiyelim|yemeye/.test(t) && !/kahve/.test(t)) intent.categoryIds = ["cat.restaurant"];
  else if (/kahve|kafe/.test(t) && !/yemek/.test(t)) intent.categoryIds = ["cat.cafe"];
  else if (/bar|kokteyl|bira|i[çc]ki/.test(t)) intent.categoryIds = ["cat.bar"];
  else if (/otel|konakla|kalacak/.test(t)) intent.categoryIds = ["cat.hotel"];

  /* anlaşılan özet */
  intent.understood = [
    ...intent.content.map(display),
    ...intent.locations.map(display), ...(intent.region === "bogaz" ? ["Boğaz tarafı"] : []),
    ...(intent.dayLabel ? [intent.dayLabel] : []), ...(intent.time ? [intent.time] : []),
    ...(intent.party ? [`${intent.party} kişi`] : []),
    ...intent.qualifiers.filter((k) => k !== "fast" || intent.context !== "quick").map((k) => ({ quality: "iyi", value: "F/P", quiet: "sakin", fast: "hızlı", date: "romantik", lively: "canlı", view: "manzara", rising: "yükselen", verified: "doğrulanmış", late: "geç saat", work: "çalışılır" }[k])),
    ...(intent.context !== "default" ? [{ date: "Date", friends: "Arkadaş grubu", business: "İş", family: "Aile", solo: "Tek başına", quick: "Hızlı" }[intent.context]!] : []),
    ...(intent.budget ? ["₺".repeat(intent.budget)] : []),
  ];
  return intent;
}

/* ───── 2 · aday getirme (arama motoru) ───── */

function retrieve(intent: AIIntent): { hits: SearchHit[]; fallback: boolean } {
  const parts = [...intent.content, ...intent.locations];
  const qualWords = intent.qualifiers.map((k) => ({ quality: "iyi", value: "ucuz", quiet: "sakin", fast: "hızlı", date: "romantik", lively: "canlı", view: "manzara", rising: "yükselen", verified: "doğrulanmış", late: "gece", work: "çalışılır" }[k]));
  const raw = [...parts.map(display), ...qualWords].join(" ");
  let hits: SearchHit[] = []; let fallback = false;
  if (parts.length) {
    const r = searchV3(raw, { limit: 80 });
    hits = r.exact;
    if (hits.length < 3) { hits = [...hits, ...r.adjacent]; fallback = r.exact.length === 0; }
  } else {
    /* içerik yok ("bu akşam iyi bir yer"): kategoriye göre İstanbul havuzu — arama motoru nitelik sıralamasıyla */
    const r = searchV3(intent.qualifiers.length ? intent.qualifiers.map((k) => ({ quality: "iyi", value: "ucuz", quiet: "sakin", fast: "hızlı", date: "romantik", lively: "canlı", view: "manzara", rising: "yükselen", verified: "doğrulanmış", late: "gece", work: "çalışılır" }[k])).join(" ") : "iyi", { limit: 120, city: "İstanbul" });
    hits = [...r.exact, ...r.adjacent];
  }
  if (intent.region === "bogaz") hits = hits.filter((h) => BOGAZ.includes(fold(h.card.entity.location?.district ?? "")));
  return { hits, fallback };
}

/* ───── 3 · uygunluk ───── */

function eligible(h: SearchHit, intent: AIIntent): boolean {
  const c = h.card;
  if (!c.category.compliance.showScores) return false;             /* regüle → ayrı yol */
  if (c.score === null) return false;
  if (intent.categoryIds && !intent.categoryIds.includes(c.entity.categoryId)) return false;
  if (!intent.categoryIds && intent.content.length === 0 && !["cat.restaurant", "cat.cafe", "cat.bar"].includes(c.entity.categoryId)) return false;
  if (!intent.locations.length && intent.region !== "bogaz" && (c.entity.location?.city ?? "İstanbul") !== "İstanbul") return false;
  return true;
}

/* ───── 4 · bağlam uyumu + Gidenler sinyalleri ───── */

const WAIT_RE = /bekleme|sıra|kalabalık|rezervasyon/i;

/** Demo çalışma saati penceresi: "11.30 – 00.00" → [11.5, 24]. Ayrıştırılamazsa null (iddia yok). */
export function hoursWindow(hours?: string): [number, number] | null {
  const m = hours?.match(/(\d{1,2})[.:](\d{2})\s*[–-]\s*(\d{1,2})[.:](\d{2})/);
  if (!m) return null;
  const a = Number(m[1]) + Number(m[2]) / 60; let b = Number(m[3]) + Number(m[4]) / 60;
  if (b <= a) b += 24;
  return [a, b];
}
const inWindow = (w: [number, number] | null, hour: number) => w ? (hour >= w[0] && hour <= w[1]) || (hour + 24 >= w[0] && hour + 24 <= w[1]) : null;
const WEEKEND_RE = /cumartesi|hafta sonu|cuma (ak[şs]am|gece)|pazar (öğle|sabah)/i;

function waitEvidence(entityId: string): { count: number; rising: boolean; weekend: number; label?: string } {
  const it = getTopicIntelligence(entityId);
  const theme = it?.negativeThemes.find((x) => WAIT_RE.test(x.label));
  const weekend = experiences.filter((e) => e.entityId === entityId && e.state === "published" && WEEKEND_RE.test(e.body) && /s[ıi]ra|bekle|masa bul|dolu/i.test(e.body)).length;
  return { count: theme?.count ?? 0, rising: theme?.direction === "up", weekend, label: theme?.label };
}

function scoreCandidate(h: SearchHit, intent: AIIntent, personal: ReturnType<typeof getPersonalMatch> | null): { match: number; parts: MatchPart[]; wait: ReturnType<typeof waitEvidence> } {
  const c = h.card; const it = getTopicIntelligence(c.entity.id)!;
  const amb = ambientSignals[c.entity.id] ?? { quiet: 5, speed: 5 };
  const parts: MatchPart[] = [];
  const hasContent = intent.content.length > 0;
  const hasPersonal = !!personal;

  /* alaka (arama metin puanı, 0–4+ → 0–1) */
  const relMax = hasPersonal ? 24 : 30;
  const rel = hasContent ? Math.min(1, h.text / 3.2) : 0.7;
  parts.push({ label: "İstek uyumu", value: Math.round(rel * relMax), max: relMax, note: hasContent ? `${intent.content.map(display).join(", ")} eşleşmesi` : "genel istek" });

  /* konum */
  const locMax = 20;
  const locV = intent.locations.length || intent.region ? (h.loc === "district" || h.loc === "neighborhood" || intent.region ? 1 : h.loc === "city" ? 0.4 : 0) : 0.75;
  parts.push({ label: "Konum", value: Math.round(locV * locMax), max: locMax, note: intent.locations.length ? (locV === 1 ? c.entity.location?.district : `${display(intent.locations[0])} dışında`) : "konum belirtilmedi" });

  /* kalite + güven */
  const qMax = hasPersonal ? 18 : 24;
  parts.push({ label: "Gidenler puanı", value: Math.round(((c.score ?? 0) / 10) * qMax), max: qMax, note: `${score1(c.score ?? 0)} · ${CONFIDENCE_LABEL[it.confidence]}` });
  parts.push({ label: "Güven", value: it.confidence === "high" ? 8 : it.confidence === "medium" ? 5 : 2, max: 8, note: `${nf(it.experienceCount)} deneyim · %${Math.round(it.verifiedRatio * 100)} doğrulanmış` });

  /* kişisel uyum (yalnızca profil varsa) */
  if (hasPersonal) parts.push({ label: "Zevk profili", value: Math.round((personal!.score / 100) * 12), max: 12, note: `%${personal!.score} kişisel uyum` });

  /* nitelikler */
  const qual = intent.qualifiers;
  const value = it.ratingDimensions.find((d) => d.key === "value")?.value ?? null;
  if (qual.includes("value") || intent.budget) parts.push({ label: "F/P", value: Math.round(((value ?? 6) / 10) * 8) - (intent.budget && c.entity.priceLevel && c.entity.priceLevel > intent.budget ? 4 : 0), max: 8, note: value !== null ? `F/P boyutu ${score1(value)}` : "F/P verisi yok" });
  if (qual.includes("quiet") || intent.context === "date") parts.push({ label: "Sakinlik", value: Math.round((amb.quiet / 10) * 8), max: 8, note: amb.quiet >= 7 ? "sessizlik deneyimlerde güçlü" : amb.quiet <= 4 ? "gürültü/kalabalık sık geçiyor" : "sessizlik karışık" });
  if (qual.includes("lively")) parts.push({ label: "Canlılık", value: Math.round(((10 - amb.quiet) / 10) * 8), max: 8 });
  if (qual.includes("fast") || intent.context === "quick") parts.push({ label: "Tempo", value: Math.round((amb.speed / 10) * 8), max: 8, note: amb.speed >= 7 ? "servis hızı deneyimlerde güçlü" : "tempo orta" });
  if (qual.includes("view")) parts.push({ label: "Manzara", value: (c.entity.facets ?? []).includes("Manzara") || it.positiveThemes.some((x) => /manzara/i.test(x.label)) ? 8 : 2, max: 8 });

  /* bağlam / grup */
  const fit = intent.context !== "default" ? contextFit[c.entity.id]?.[intent.context] ?? 0 : 0;
  if (intent.context !== "default") parts.push({ label: { date: "Date", friends: "Grup", business: "İş", family: "Aile", solo: "Tek başına", quick: "Hızlı" }[intent.context]!, value: Math.round(Math.max(-6, Math.min(6, fit / 2))), max: 6, note: fit > 2 ? "bu bağlamda deneyimler olumlu" : fit < -2 ? "bu bağlamda deneyimler zayıf" : "bağlam verisi nötr" });

  /* zaman sinyali: hafta sonu akşamı + bekleme teması; istenen saat demo çalışma penceresinin dışındaysa düşür (iddia değil, demo veri) */
  const wait = waitEvidence(c.entity.id);
  const evening = intent.hour !== undefined && intent.hour >= 19 && intent.hour <= 22;
  if (intent.weekend && evening && wait.count > 0) parts.push({ label: "Zaman", value: -Math.min(8, Math.round(wait.count / Math.max(20, it.experienceCount) * 40) + (wait.rising ? 2 : 0)), max: 0, note: `${wait.label} şikâyeti ${wait.count} deneyimde` });
  if (intent.hour !== undefined) { const ok = inWindow(hoursWindow(c.entity.hours), intent.hour); if (ok === false) parts.push({ label: "Saat", value: -12, max: 0, note: `istenen saat demo çalışma saatinin dışında (${c.entity.hours})` }); }

  /* trend */
  parts.push({ label: "Trend", value: c.delta90d >= 0.3 ? 4 : c.delta90d <= -0.3 ? -4 : 0, max: 4, note: `son 90 gün ${c.delta90d >= 0 ? "+" : ""}${score1(c.delta90d)}` });

  const total = parts.reduce((a, p) => a + p.value, 0);
  const max = parts.reduce((a, p) => a + Math.max(0, p.max), 0);
  return { match: Math.max(0, Math.min(99, Math.round((total / max) * 100))), parts, wait };
}

/* ───── 5 · açıklama ───── */

function explain(h: SearchHit, intent: AIIntent, sc: ReturnType<typeof scoreCandidate>, personal: ReturnType<typeof getPersonalMatch> | null): AIRecommendation {
  const c = h.card; const it = getTopicIntelligence(c.entity.id)!; const e = c.entity;
  const reasons: string[] = []; const cautions: string[] = [];
  const dishTok = intent.content.find((t) => h.matched.some((m) => m.startsWith(t + ":") && /:(etiket|tür|mutfak)$/.test(m)));
  const dishTheme = dishTok ? it.positiveThemes.find((x) => fold(x.label).includes(dishTok)) : undefined;
  if (dishTheme) reasons.push(`${dishTheme.label} konusunda ${nf(dishTheme.count)} olumlu deneyim`);
  else if (dishTok) reasons.push(`${e.subcategory ?? c.category.label} · ${nf(it.experienceCount)} deneyim, ${display(dishTok)} eşleşmesi`);
  else if (it.positiveThemes[0]) reasons.push(`En çok övülen: ${it.positiveThemes[0].label.toLocaleLowerCase("tr")} (${nf(it.positiveThemes[0].count)} deneyim)`);

  const value = it.ratingDimensions.find((d) => d.key === "value");
  const taste = it.ratingDimensions.find((d) => d.key === "taste" || d.key === "coffee" || d.key === "room");
  if ((intent.qualifiers.includes("value") || intent.budget) && value) reasons.push(`F/P boyutu ${score1(value.value)}${value.trend.direction === "up" && value.trend.sufficient ? ", son dönemde yükseliyor" : ""}`);
  else if (taste && taste.value >= 8.5) reasons.push(`${taste.label} ${score1(taste.value)} — ${nf(it.experienceCount)} deneyim`);
  const amb = ambientSignals[e.id];
  if ((intent.qualifiers.includes("quiet") || intent.context === "date") && amb) reasons.push(amb.quiet >= 7 ? `Sessizlik deneyimlerde güçlü (${score1(amb.quiet)}/10)` : amb.quiet <= 4 ? `Gürültü deneyimlerde sık geçiyor (${score1(amb.quiet)}/10)` : `Sessizlik deneyimlerde karışık (${score1(amb.quiet)}/10)`);
  if (intent.context === "friends" && intent.party && (contextFit[e.id]?.friends ?? 0) > 2) reasons.push(`${intent.party} kişilik gruplar için deneyimler olumlu`);
  if (intent.context === "family" && (contextFit[e.id]?.family ?? 0) > 2) reasons.push("Aile bağlamında deneyimler olumlu");
  if (intent.context === "quick" && amb && amb.speed >= 7) reasons.push(`Servis hızı deneyimlerde güçlü (${score1(amb.speed)}/10)`);
  if (c.delta90d >= 0.3) reasons.push(`Son 90 günde +${score1(c.delta90d)} (${nf(it.experienceCount)} deneyim)`);
  const ex = expertSignal(e.id);
  if (ex && ex.authors >= 1 && reasons.length < 4) reasons.push(`${ex.authors} uzman deneyimi · uzman ortalaması ${score1(ex.avg)}`);
  if (it.returnRate >= 0.7 && reasons.length < 4) reasons.push(`Tekrar gitme niyeti %${Math.round(it.returnRate * 100)}`);
  if (personal && personal.score >= 80 && reasons.length < 4) reasons.push(`Zevk profilinle %${personal.score} uyum`);

  /* dikkat */
  const evening = intent.hour !== undefined && intent.hour >= 19 && intent.hour <= 22;
  if (intent.hour !== undefined && inWindow(hoursWindow(e.hours), intent.hour) === false) cautions.push(`İstenen saat (${intent.time ?? intent.hour + ":00"}) demo çalışma saatinin dışında: ${e.hours} — doğrulanmadı`);
  if (sc.wait.count > 0 && (intent.weekend || evening)) {
    const when = intent.dayLabel ? `${intent.dayLabel}${evening ? " akşamı" : ""}` : "Akşam saatleri";
    cautions.push(`${when} için: ${sc.wait.label?.toLocaleLowerCase("tr")} şikâyeti ${nf(sc.wait.count)} deneyimde${sc.wait.rising ? ", artıyor" : ""}${sc.wait.weekend ? `; ${sc.wait.weekend}'i hafta sonunu anlatıyor` : ""}`);
  } else if (sc.wait.rising) cautions.push(`${sc.wait.label} şikâyetleri artıyor (${nf(sc.wait.count)} deneyim)`);
  if (h.loc === "none" && intent.locations.length) cautions.push(`${display(intent.locations[0])} dışında — ${e.location?.district ?? e.location?.city}`);
  if (intent.budget && e.priceLevel && e.priceLevel > intent.budget) cautions.push(`Fiyat seviyesi bütçenin üstünde · ${"₺".repeat(e.priceLevel)}`);
  if (it.confidence === "low") cautions.push(`Sınırlı veri: ${nf(it.experienceCount)} deneyim`);
  const neg = it.negativeThemes.find((x) => x.direction === "up" && !WAIT_RE.test(x.label));
  if (neg && cautions.length < 2) cautions.push(`${neg.label} şikâyetleri artıyor (${nf(neg.count)} deneyim)`);
  if (c.delta90d <= -0.3 && cautions.length < 2) cautions.push(`Son 90 günde ${score1(c.delta90d)}`);

  const verified = Math.round(it.experienceCount * it.verifiedRatio);
  const hoursNote = e.hours ? `Çalışma saati (demo veri): ${e.hours} · canlı uygunluk doğrulanmadı` : "Çalışma saati / canlı uygunluk doğrulanmadı";
  return {
    entityId: e.id, slug: e.slug, name: e.name, kind: e.subcategory ?? c.category.label,
    place: [e.location?.district, e.location?.city].filter(Boolean).join(" · "),
    score: c.score, delta: c.delta90d, confidence: it.confidence,
    match: sc.match, matchParts: sc.parts, reasons: reasons.slice(0, 4), cautions: cautions.slice(0, 2), hoursNote,
    provenance: `${nf(it.experienceCount)} deneyim, ${nf(verified)} doğrulanmış ziyaret ve son 90 günlük trend analiz edildi.`,
    outside: h.loc === "none" && intent.locations.length > 0,
  };
}

/* ───── 6 · ana akış ───── */

export function askAI(text: string, structured: AIStructured = {}, opts: { taste?: TasteEdits; personalized?: boolean; followUp?: FollowUp | null; limit?: number } = {}): AIAnswer {
  const intent = parseIntent(text, structured);
  if (opts.followUp === "quiet" && !intent.qualifiers.includes("quiet")) intent.qualifiers.push("quiet");
  if (opts.followUp === "value" && !intent.qualifiers.includes("value")) intent.qualifiers.push("value");
  if (opts.followUp === "late" && !intent.qualifiers.includes("late")) intent.qualifiers.push("late");
  const followUps: AIAnswer["followUps"] = [{ key: "quiet", label: "Daha sakin olsun" }, { key: "value", label: "Daha ucuz" }, { key: "near", label: "Daha yakın" }, { key: "expert", label: "Uzmanların seçtikleri" }, { key: "late", label: "Geç saate uygun" }];

  /* regüle: nötr keşif */
  if (intent.regulated) {
    const r = searchV3([...intent.content, ...intent.locations].map(display).join(" ") || "doktor", { limit: 40 });
    const pool = [...r.exact, ...r.adjacent].filter((h) => !h.card.category.compliance.showScores).slice(0, 5);
    const items = pool.map((h) => { const it = getTopicIntelligence(h.card.entity.id); const e = h.card.entity; return { slug: e.slug, name: e.name, branch: (e.name.match(/\(([^·)]+) ·/)?.[1] ?? e.subcategory ?? "").trim(), place: [e.location?.district, e.location?.city].filter(Boolean).join(" · "), count: it?.experienceCount ?? 0, verified: Math.round((it?.experienceCount ?? 0) * (it?.verifiedRatio ?? 0)) }; });
    return {
      intent, items: [], pipeline: { retrieved: r.exact.length + r.adjacent.length, eligible: pool.length, ranked: 0, fallback: false }, overallConfidence: "Orta",
      provenance: "Regüle kategori: puan, uyum ve sıralama üretilmez; yalnızca branş, konum ve deneyim sayısı.",
      note: "Hekim, diş hekimi ve avukat için Gidenler öneri ya da 'en iyi' listesi vermez. Aşağıdakiler nötr keşif bilgisidir; karar hekimle/avukatla görüşerek verilir.",
      regulated: { label: "Nötr keşif", items, note: "Deneyim sayısı kalite sıralaması değildir." }, followUps: [],
    };
  }

  const { hits, fallback } = retrieve(intent);
  let cands = hits.filter((h) => eligible(h, intent));
  if (opts.followUp === "near" && intent.locations.length) cands = cands.filter((h) => h.loc === "district" || h.loc === "neighborhood");
  if (opts.followUp === "expert") { const withEx = cands.filter((h) => expertSignal(h.card.entity.id)); if (withEx.length) cands = withEx; }
  const profile = opts.personalized ? effectiveProfile(opts.taste) : undefined;

  const scored = cands.map((h) => {
    const personal = profile ? getPersonalMatch(h.card.entity.id, intent.context, undefined, undefined, profile) : null;
    const sc = scoreCandidate(h, intent, personal);
    return { h, sc, personal };
  }).sort((a, b) => b.sc.match - a.sc.match || (b.h.card.score ?? 0) - (a.h.card.score ?? 0) || b.h.card.experienceCount - a.h.card.experienceCount);

  const limit = opts.limit ?? 3;
  const items = scored.slice(0, limit).map(({ h, sc, personal }) => explain(h, intent, sc, personal));
  const top = items[0];
  const overallConfidence: AIAnswer["overallConfidence"] = !top ? "Sınırlı" : fallback || top.confidence === "low" || top.match < 55 ? "Sınırlı" : top.confidence === "high" && top.match >= 70 ? "Yüksek" : "Orta";
  const totalExp = items.reduce((a, i) => a + (getTopicIntelligence(i.entityId)?.experienceCount ?? 0), 0);
  const totalVer = items.reduce((a, i) => { const it = getTopicIntelligence(i.entityId); return a + Math.round((it?.experienceCount ?? 0) * (it?.verifiedRatio ?? 0)); }, 0);
  return {
    intent, items,
    pipeline: { retrieved: hits.length, eligible: cands.length, ranked: scored.length, fallback },
    overallConfidence,
    provenance: items.length ? `${hits.length} aday arama motorundan geldi, ${cands.length} uygunluk filtresini geçti; ilk ${items.length} için ${nf(totalExp)} deneyim, ${nf(totalVer)} doğrulanmış ziyaret ve son 90 günlük trend analiz edildi.` : "Uygun aday bulunamadı.",
    note: fallback ? "Tam eşleşme yok; en yakın adaylar gösteriliyor." : "",
    followUps,
  };
}
