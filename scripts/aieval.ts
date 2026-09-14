/**
 * GİDENLER AI — DEĞERLENDİRME HATTI (offline)
 * Çalıştır: npx tsx scripts/aieval.ts [--llm] [--out dosya.json]
 *
 * eval/gidenler-eval-set.json içindeki sorguları çalıştırır; her biri için:
 *   intent      · niyet çıkarımı beklentilerle uyuşuyor mu (konum, niteleyici, gün, kişi, kategori, bağlam)
 *   retrieval   · sonuç var mı, ilçe eşleşti mi
 *   hallucination · tüm entityId'ler veri kümesinde mi (LLM modunda kritik)
 *   explanation · her öneride en az bir veriye dayalı gerekçe (sayı/tema/trend) var mı
 *   latency / cost · ms ve USD (deterministik: 0)
 * Varsayılan: deterministik motor (sağlayıcı gerekmez). --llm: yapılandırılmış sağlayıcıyla orchestrator (anahtar env'de olmalı).
 * Sonuç: özet tablo + isteğe bağlı JSON raporu. Bu rapor insan onayı öncesi karşılaştırma (benchmark) içindir.
 */
import fs from "node:fs";

interface Case { id: string; query: string; expect: { locations?: string[]; content?: string[]; qualifiers?: string[]; category?: string; day?: string; party?: number; context?: string; region?: string; minResults?: number; districtMatch?: boolean; timeSensitive?: boolean } }

async function main() {
  const args = process.argv.slice(2); const useLLM = args.includes("--llm"); const outIdx = args.indexOf("--out");
  const set = JSON.parse(fs.readFileSync("eval/gidenler-eval-set.json", "utf8")) as { cases: Case[] };
  const { askAI, parseIntent } = await import("../lib/decisionEngine");
  const { getEntityById } = await import("../lib/api");
  const { isTimeSensitive } = await import("../lib/ai/cache");
  const orch = useLLM ? await import("../lib/ai/orchestrator") : null;
  const budget = useLLM ? await import("../lib/ai/budget") : null;

  const rows: Array<Record<string, unknown>> = [];
  for (const c of set.cases) {
    const e = c.expect; const t0 = Date.now();
    const intent = parseIntent(c.query);
    const checks: Record<string, boolean> = {};
    if (e.locations) checks.locations = e.locations.every((l) => intent.locations.includes(l));
    if (e.content) checks.content = e.content.every((w) => intent.content.some((x) => x.includes(w)));
    if (e.qualifiers) checks.qualifiers = e.qualifiers.every((q) => (intent.qualifiers as string[]).includes(q));
    if (e.day) checks.day = intent.dayLabel === e.day;
    if (e.party) checks.party = intent.party === e.party;
    if (e.context) checks.context = intent.context === e.context;
    if (e.region) checks.region = intent.region === e.region;
    if (e.category) checks.category = (intent.categoryIds ?? []).length > 0 || e.category === "hepsi";
    if (e.timeSensitive) checks.timeSensitive = isTimeSensitive(c.query);

    let ids: string[] = []; let reasons: string[][] = []; let places: string[] = []; let mode = "deterministic"; let cost = 0;
    if (orch && budget) {
      const before = (await budget.budgetStatus()).spentUsd;
      const r = await orch.ask({ query: c.query });
      mode = r.mode; ids = r.recommendations.map((x) => x.entityId); reasons = r.recommendations.map((x) => x.reasons); places = r.recommendations.map((x) => x.place);
      cost = Math.max(0, (await budget.budgetStatus()).spentUsd - before);
    } else {
      const a = askAI(c.query);
      ids = a.items.map((x) => x.entityId); reasons = a.items.map((x) => x.reasons); places = a.items.map((x) => x.place);
    }
    const latencyMs = Date.now() - t0;
    const retrieval = ids.length >= (e.minResults ?? 1);
    const district = e.districtMatch && e.locations ? places.every((p) => e.locations!.some((l) => fold(p).includes(l))) : true;
    const hallucination = ids.some((id) => !getEntityById(id));
    const explanation = reasons.length > 0 && reasons.every((rs) => rs.length > 0 && rs.some((s) => /\d|deneyim|trend|tekrar|sessiz|sakin|uyum|saat|tema|bütçe|f\/p/i.test(s)));
    const intentOk = Object.values(checks).every(Boolean);
    rows.push({ id: c.id, mode, intent: intentOk, intentChecks: checks, retrieval, districtMatch: district, results: ids.length, hallucination, explanation, latencyMs, costUsd: Math.round(cost * 1e5) / 1e5 });
  }
  const pct = (k: string, want: boolean = true) => Math.round((rows.filter((r) => r[k] === want).length / rows.length) * 100);
  const summary = { cases: rows.length, intentPct: pct("intent"), retrievalPct: pct("retrieval"), districtPct: pct("districtMatch"), hallucinationPct: pct("hallucination", true), explanationPct: pct("explanation"), avgLatencyMs: Math.round(rows.reduce((a, r) => a + (r.latencyMs as number), 0) / rows.length), totalCostUsd: Math.round(rows.reduce((a, r) => a + (r.costUsd as number), 0) * 1e4) / 1e4 };
  for (const r of rows) console.log(`${String(r.intent && r.retrieval && !r.hallucination && r.explanation ? "OK " : "!! ").padEnd(4)}${String(r.id).padEnd(22)} mode=${String(r.mode).padEnd(13)} intent=${r.intent} retr=${r.retrieval}(${r.results}) district=${r.districtMatch} halluc=${r.hallucination} expl=${r.explanation} ${r.latencyMs}ms${r.costUsd ? ` $${r.costUsd}` : ""}${r.intent ? "" : " " + JSON.stringify(r.intentChecks)}`);
  console.log("\nÖZET", JSON.stringify(summary));
  if (outIdx >= 0 && args[outIdx + 1]) fs.writeFileSync(args[outIdx + 1], JSON.stringify({ generatedAt: new Date().toISOString(), summary, rows }, null, 2));
  process.exit(summary.hallucinationPct > 0 ? 1 : 0);
}
const fold = (s: string) => s.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ç/g, "c").replace(/ö/g, "o").replace(/ü/g, "u");
main().catch((e) => { console.error(e); process.exit(1); });
