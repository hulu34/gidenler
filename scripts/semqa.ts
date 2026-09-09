/**
 * SEMANTİK QA — üretilmiş/seed veri üzerinde otomatik tutarlılık denetimi (V6 · P27).
 * Çalıştır: npx tsx scripts/semqa.ts   (çıkış kodu 1 = en az bir hata)
 *
 * Denetimler: tekrar niyeti ↔ metin çelişkisi · kategori–dil sızıntısı (restoran↔film, tiyatro↔konser)
 * · geçersiz bağlam · geçersiz boyut · boş konum · NaN/aralık dışı puan · imkânsız trend
 * · geçersiz güven · yinelenen slug · yinelenen anlam etiketi (aynı cümlede) · yinelenen kimlik.
 */
import { entities } from "../data/entities";
import { experiences } from "../data/experiences";
import { getCategory, getSchema, categories } from "../data/categories";
import { decisionContexts } from "../data/taste";
import { getTopicIntelligence } from "../lib/api";
import { verbsFor } from "../lib/verbs";

type Fail = { check: string; id: string; detail: string };
const fails: Fail[] = [];
const F = (check: string, id: string, detail: string) => fails.push({ check, id, detail });
const lower = (s: string) => s.toLocaleLowerCase("tr");

/* ─── 1 · tekrar niyeti ↔ metin ─── */
const NO_RETURN = /(bir kez yeter|bir daha (gitmem|kalmam|uğramam|izlemem|katılmam)|bir kez görmek yeter|bir kez yeterdi|bir kez yeterli)/i;
const YES_RETURN = /(tekrar (giderim|kalırım|izlerim|katılırım|gelirim)|yine (giderim|gelirim|izlerim|katılırım)|ikinci kez izlerim|ilk tercihim oldu|seneye yine)/i;
for (const e of experiences) {
  const t = e.body;
  if (e.returnIntent === "evet" && NO_RETURN.test(t) && !YES_RETURN.test(t)) F("return-contradiction", e.id, `evet ↔ "${t.match(NO_RETURN)?.[0]}"`);
  if (e.returnIntent === "hayır" && YES_RETURN.test(t)) F("return-contradiction", e.id, `hayır ↔ "${t.match(YES_RETURN)?.[0]}"`);
}

/* ─── 2 · kategori–dil sızıntısı ─── */
const LEAK: Record<string, RegExp> = {
  "cat.film": /\b(servis|porsiyon|garson|menü|masa|mutfak|meze|rezervasyon|oda|kahvaltı|koltuk aralığı)\b/i,
  "cat.restaurant": /\b(senaryo|oyunculuk|perde|final|fragman|sahneleme|setlist|bis)\b/i,
  "cat.cafe": /\b(senaryo|oyunculuk|perde|final|setlist|oda servisi)\b/i,
  "cat.hotel": /\b(senaryo|oyunculuk|perde|setlist|ana yemek|meze)\b/i,
};
const THEATRE_TERMS = /\b(oyunculuk|metin|ikinci perde|replik)\b/i;
for (const e of experiences) {
  const en = entities.find((x) => x.id === e.entityId); if (!en) { F("orphan-experience", e.id, e.entityId); continue; }
  const re = LEAK[en.categoryId]; if (re && re.test(e.body)) F("category-leak", e.id, `${en.categoryId} · "${e.body.match(re)?.[0]}"`);
  if (en.categoryId === "cat.show" && (en.subcategory === "Konser" || en.subcategory === "Festival") && THEATRE_TERMS.test(e.body)) F("theatre-in-concert", e.id, `${en.subcategory} · "${e.body.match(THEATRE_TERMS)?.[0]}"`);
}

/* ─── 3 · bağlam & boyut ─── */
const ctxKeys = new Set(decisionContexts.map((c) => c.key));
for (const c of categories) {
  const V = verbsFor({ categoryId: c.id });
  for (const k of V.contexts) if (!ctxKeys.has(k as never)) F("invalid-context", c.id, k);
  if (c.id === "cat.film" && V.contexts.includes("quick")) F("invalid-context", c.id, "film · quick (hızlı yemek)");
}
for (const e of experiences) {
  const en = entities.find((x) => x.id === e.entityId)!; const cat = getCategory(en.categoryId)!; const schema = getSchema(cat.ratingSchemaId)!;
  const dims = new Set(schema.dimensions.map((d) => d.key));
  for (const k of Object.keys(e.ratings)) if (!dims.has(k)) F("invalid-dimension", e.id, `${k} ∉ ${schema.id}`);
  for (const v of Object.values(e.ratings)) if (!(v >= 1 && v <= 10)) F("rating-range", e.id, String(v));
}

/* ─── 4 · konum & kimlik ─── */
const slugs = new Map<string, number>();
for (const en of entities) {
  slugs.set(en.slug, (slugs.get(en.slug) ?? 0) + 1);
  const l = en.location;
  if (l) {
    if (l.city === "") F("empty-location", en.id, "city ''");
    if (l.district === "") F("empty-location", en.id, "district ''");
    if (l.neighborhood === "") F("empty-location", en.id, "neighborhood ''");
    if (l.neighborhood && l.district && l.neighborhood === l.district) F("hood-eq-district", en.id, l.district);
  }
  if (/\s(\S+)\s\1$/.test(en.name)) F("dup-word-name", en.id, en.name);
  if (!getCategory(en.categoryId)) F("unknown-category", en.id, en.categoryId);
}
for (const [s, n] of slugs) if (n > 1) F("duplicate-slug", s, String(n));

/* ─── 5 · puan / trend / güven ─── */
const CONF = new Set(["low", "medium", "high"]);
for (const en of entities) {
  const it = getTopicIntelligence(en.id); if (!it) { F("no-intelligence", en.id, ""); continue; }
  const cat = getCategory(en.categoryId)!;
  if (it.overallScore !== null) {
    if (Number.isNaN(it.overallScore)) F("nan-score", en.id, "");
    else if (it.overallScore < 1 || it.overallScore > 10) F("score-range", en.id, String(it.overallScore));
    if (!cat.compliance.showScores) F("regulated-has-score", en.id, String(it.overallScore));
  }
  if (Number.isNaN(it.scoreTrend.delta)) F("nan-trend", en.id, "");
  if (Math.abs(it.scoreTrend.delta) > 1.6) F("impossible-trend", en.id, String(it.scoreTrend.delta));
  if (Math.abs(it.scoreTrend.delta) > 1.0 && it.experienceCount < 40) F("trend-low-evidence", en.id, `${it.scoreTrend.delta} / ${it.experienceCount}`);
  if (!CONF.has(it.confidence)) F("invalid-confidence", en.id, String(it.confidence));
  for (const d of it.ratingDimensions) if (Number.isNaN(d.value) || d.value < 1 || d.value > 10) F("dimension-range", en.id, `${d.key}=${d.value}`);
  /* aynı özet satırında yinelenen anlam etiketi */
  for (const line of it.aiSummary?.lines ?? []) if (/\b(olağanüstü|çok iyi|iyi|ortalama|zayıf|kötü)\s+\1\b/i.test(line)) F("dup-semantic-label", en.id, line);
}

/* ─── rapor ─── */
const byCheck = new Map<string, Fail[]>();
for (const f of fails) byCheck.set(f.check, [...(byCheck.get(f.check) ?? []), f]);
console.log(`SEMANTİK QA · ${entities.length} kayıt · ${experiences.length} deneyim · ${fails.length} bulgu`);
for (const [k, xs] of byCheck) { console.log(`  ✗ ${k}: ${xs.length}`); for (const x of xs.slice(0, 5)) console.log(`      ${x.id} — ${x.detail}`); }
if (!fails.length) console.log("  ✓ çelişki yok, sızıntı yok, aralık dışı değer yok.");
process.exit(fails.length ? 1 : 0);
