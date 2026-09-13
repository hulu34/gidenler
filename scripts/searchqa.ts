/**
 * ARAMA + KARAR MOTORU QA — otomatik alaka denetimi.
 * Çalıştır: npx tsx scripts/searchqa.ts   (çıkış kodu 1 = en az bir hata)
 *
 * 1) Her sorgunun ilk 5 sonucu anlamlı biçimde farklı olmalı ("pide" ve "döner" ilk 5'i aynıysa FAIL).
 * 2) İçerik sorgularında ilk 5'in tamamı sorguyla alakalı alt türde olmalı (sushi restoranı pide sonucuna giremez).
 * 3) Konumlu sorgularda tam eşleşmeler istenen ilçede olmalı.
 * 4) Karar motoru demo sorguları: en az 1 öneri, her birinin NEDEN'i var, ilk sıralar birbirinden farklı,
 *    regüle sorguda puan/uyum üretilmez, canlı uygunluk iddiası ("açık", "masa var") yok.
 */
import { searchV3 } from "../lib/search";
import { askAI } from "../lib/decisionEngine";

type Fail = { check: string; detail: string };
const fails: Fail[] = [];
const F = (check: string, detail: string) => fails.push({ check, detail });

const QUERIES: Array<[string, RegExp | null, string | null]> = [
  ["pide", /Pideci/, null], ["döner", /Dönerci/, null], ["sushi", /Sushi|Ramen/, null], ["kahve", /Kahveci/, null],
  ["burger", /Burger/, null], ["mantı", /Mantıcı/, null],
  ["Kadıköy pide", /Pideci/, "Kadıköy"], ["Beşiktaş kahve", /Kahveci/, "Beşiktaş"], ["Kadıköy sakin kahve", /Kahveci/, "Kadıköy"], ["ucuz döner", /Dönerci/, null],
  ["doner", /Dönerci/, null], ["pideci", /Pideci/, null], ["kahveci", /Kahveci/, null], ["sushici", /Sushi/, null], ["kadikoy pide", /Pideci/, "Kadıköy"], ["sussi", /Sushi|Ramen/, null],
];

const tops: Record<string, string[]> = {};
console.log("ARAMA · QUERY → TOP 5");
for (const [q, subRe, district] of QUERIES) {
  const r = searchV3(q);
  const top = r.exact.slice(0, 5);
  tops[q] = top.map((h) => h.card.entity.name);
  console.log(`  "${q}" → [${r.query.understood.join(", ")}]${r.query.corrections.length ? " (düzeltme " + r.query.corrections.map(([a, b]) => a + "→" + b).join(", ") + ")" : ""}`);
  for (const h of top) console.log(`      ${h.card.entity.name} · ${h.card.entity.subcategory} · ${h.card.entity.location?.district ?? h.card.entity.location?.city} · ${h.card.score} · ${h.reason}`);
  if (!top.length) F("no-results", q);
  if (subRe) for (const h of top) if (!subRe.test(h.card.entity.subcategory ?? "")) F("off-topic", `"${q}" → ${h.card.entity.name} (${h.card.entity.subcategory})`);
  if (district) for (const h of top) if (h.card.entity.location?.district !== district) F("wrong-district", `"${q}" → ${h.card.entity.name} (${h.card.entity.location?.district})`);
}

/* örtüşme */
const overlap = (a: string[], b: string[]) => a.filter((x) => b.includes(x)).length;
const PAIRS: Array<[string, string]> = [["pide", "döner"], ["pide", "sushi"], ["sushi", "kahve"], ["kahve", "burger"], ["burger", "mantı"], ["döner", "mantı"], ["Kadıköy pide", "Beşiktaş kahve"]];
let pairsTotal = 0, overlapTotal = 0;
for (const [a, b] of PAIRS) {
  const o = overlap(tops[a], tops[b]); pairsTotal += 5; overlapTotal += o;
  if (o === 5) F("identical-top5", `"${a}" ve "${b}" ilk 5 birebir aynı`);
  if (o > 1) F("high-overlap", `"${a}" / "${b}" örtüşme ${o}/5`);
}
const same = (a: string, b: string) => tops[a].join("|") === tops[b].join("|");
if (!same("doner", "döner")) F("normalization", "doner ≠ döner");
if (!same("pideci", "pide")) F("normalization", "pideci ≠ pide");
console.log(`\nÖRTÜŞME ORANI: ${overlapTotal}/${pairsTotal} (${Math.round((overlapTotal / pairsTotal) * 100)}%) · doner=döner ${same("doner", "döner")} · pideci=pide ${same("pideci", "pide")}`);

/* karar motoru */
const AI = [
  "Kadıköy'de pide", "Cumartesi 20:30 Kadıköy'de 4 kişi pide", "Beşiktaş'ta sakin kahve", "Bu akşam iyi sushi",
  "Pazar kahvaltısı için Boğaz tarafında sakin yer", "Şişli'de hızlı öğle yemeği", "Kadıköy'de F/P iyi döner",
  "Cumartesi 20:30'da Kadıköy'de 4 kişi pide yemek istiyoruz. Sakin ve F/P iyi olsun.",
];
const LIVE_CLAIM = /\b(açık|kapalı|masa var|müsait|uygun saat|20:30'da uygun|rezervasyon yapıldı)\b/i;
const firsts: string[] = [];
console.log("\nKARAR MOTORU · SORGU → TOP 3");
for (const q of AI) {
  const a = askAI(q);
  console.log(`  "${q}" → [${a.intent.understood.join(" · ")}] güven ${a.overallConfidence} · aday ${a.pipeline.retrieved} → uygun ${a.pipeline.eligible}`);
  if (!a.items.length) { F("ai-empty", q); continue; }
  firsts.push(a.items[0].name);
  const reasonSets = new Set(a.items.map((i) => i.reasons.join("|")));
  if (reasonSets.size < a.items.length) F("ai-same-reasons", q);
  for (const i of a.items) {
    console.log(`      %${i.match} ${i.name} (${i.place}) ${i.score} · NEDEN: ${i.reasons.join(" | ")}${i.cautions.length ? " · DİKKAT: " + i.cautions.join(" | ") : ""}`);
    if (!i.reasons.length) F("ai-no-reason", `${q} → ${i.name}`);
    if (i.match < 0 || i.match > 99) F("ai-match-range", `${q} → ${i.match}`);
    const all = [...i.reasons, ...i.cautions, i.hoursNote].join(" ");
    if (LIVE_CLAIM.test(all)) F("ai-live-claim", `${q} → ${i.name}: ${all.match(LIVE_CLAIM)?.[0]}`);
    if (/pide/i.test(q) && !/Pideci/.test(i.kind) && !i.outside) F("ai-off-topic", `${q} → ${i.name} (${i.kind})`);
    if (/döner/i.test(q) && !/Dönerci/.test(i.kind)) F("ai-off-topic", `${q} → ${i.name} (${i.kind})`);
    if (/sushi/i.test(q) && !/Sushi/.test(i.kind)) F("ai-off-topic", `${q} → ${i.name} (${i.kind})`);
  }
}
if (new Set(firsts).size < 5) F("ai-monotone", `farklı ilk öneri sayısı ${new Set(firsts).size}/${firsts.length}`);

/* regüle */
const reg = askAI("Bana en iyi doktoru bul");
if (!reg.regulated) F("regulated-bypass", "doktor sorgusu regüle yola girmedi");
if (reg.items.length) F("regulated-bypass", "regüle sorguda öneri üretildi");
if (reg.regulated && /en iyi|%\d+/.test(JSON.stringify(reg.regulated.items))) F("regulated-bypass", "regüle yanıtta 'en iyi' ya da yüzde");
console.log(`\nREGÜLE: "${reg.intent.text}" → ${reg.regulated ? reg.regulated.items.length + " nötr kayıt, öneri 0" : "HATA"}`);

/* rapor */
const byCheck = new Map<string, Fail[]>();
for (const f of fails) byCheck.set(f.check, [...(byCheck.get(f.check) ?? []), f]);
console.log(`\nARAMA QA · ${QUERIES.length} sorgu · ${AI.length} AI sorgusu · ${fails.length} bulgu`);
for (const [k, xs] of byCheck) { console.log(`  ✗ ${k}: ${xs.length}`); for (const x of xs.slice(0, 6)) console.log(`      ${x.detail}`); }
if (!fails.length) console.log("  ✓ alaka kapısı çalışıyor: pide ≠ döner ≠ sushi; konum ve normalizasyon doğru; AI nedenli, kanıtlı, canlı iddia yok.");
process.exit(fails.length ? 1 : 0);
