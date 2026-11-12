/* Ana sayfa vitrini: çeşitlilik ve tarafsızlık kuralları (yalnız veri; ağ yok). */
import { readFileSync } from "node:fs";
import { realEntities } from "../data/real";
import { SECKI_RESTAURANTS } from "../content/seckisi/restoranlar";
import { pickDiverse, HOME_EXCLUDE } from "../components/home/HomeDiscover";
import { sor as soru } from "../lib/sor/ask";
import { coverOf } from "../lib/media/cover";
import { googleRankedThemes } from "../lib/homeBoard";
import { computeBoards, countable, visitorOf, type SignalRow } from "../lib/signals";
let ok = 0, bad = 0; const t = (n: string, c: boolean, i = "") => { if (c) ok++; else bad++; console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const p = pickDiverse(realEntities, {});
t("4–6 mekân", p.length >= 4 && p.length <= 6, String(p.length));
t("kurucuyla ilişkili mekân vitrinde yok", !p.some((e) => HOME_EXCLUDE.has(e.slug)));
t("her tür en çok bir kez", new Set(p.map((e) => e.subcategory)).size === p.length);
t("her tür en çok bir kez; yalnız izinli kapağı olanlar", p.every((e) => !!coverOf(e, undefined)));
t("yalnız gerçek restoran kaydı", p.every((e) => e.isReal && !e.isDemo && e.categoryId === "cat.restaurant"));
t("seçim deterministik", JSON.stringify(pickDiverse(realEntities, {}).map((e) => e.slug)) === JSON.stringify(p.map((e) => e.slug)));
/* keşif sinyalleri: sahte liste yok, eşik altı boş, yükseliş iki hafta ister, bot/test sayılmaz */
const T = "2026-11-20", day = (n: number) => new Date(Date.parse(`${T}T00:00:00Z`) - n * 864e5).toISOString().slice(0, 10);
const az: SignalRow[] = [{ slug: "a", kind: "view", day: T, n: 2 }, { slug: "b", kind: "view", day: T, n: 9 }];
t("sinyal: 1 mekân yeterli → liste açılmaz (en az 3 mekân)", computeBoards(az, T).popular.length === 0);
const yeter: SignalRow[] = ["a", "b", "c"].map((slug, i) => ({ slug, kind: "view" as const, day: day(i), n: 3 + i }));
const pb = computeBoards([...yeter, { slug: "a", kind: "save", day: T, n: 2 }], T);
t("sinyal: 3 mekân ≥3 ziyaretçi → popüler liste", pb.popular.length === 3 && pb.popular[0].slug === "a", pb.popular.map((x) => `${x.slug}:${x.points}`).join(" "));
t("sinyal: tek haftalık veride yükseliş yok", pb.rising.length === 0 && !!pb.reason.rising);
const iki: SignalRow[] = ["a", "b", "c"].flatMap((slug) => [{ slug, kind: "view" as const, day: day(10), n: 3 }, { slug, kind: "view" as const, day: day(13), n: 1 }, { slug, kind: "view" as const, day: day(1), n: 9 }]);
t("sinyal: iki hafta + belirgin artış → yükselenler", computeBoards(iki, T).rising.length === 3);
t("sinyal: 8 günden eski satır bu haftaya sayılmaz", computeBoards([{ slug: "a", kind: "view", day: day(8), n: 50 }], T).popular.length === 0);
t("sinyal: Japon Erdal gibi vitrin dışı mekân hesaplanmaz", computeBoards(yeter, T, (x) => x !== "a").popular.length === 0);
const h = (ua: string, extra: Record<string, string> = {}) => new Headers({ "user-agent": ua, ...extra });
t("sinyal: bot ve otomasyon sayılmaz", !countable(h("Googlebot/2.1")) && !countable(h("Mozilla/5.0 HeadlessChrome")) && !countable(h("Mozilla/5.0 Playwright")) && !countable(h("")));
t("sinyal: test erişim başlığı sayılmaz", !countable(h("Mozilla/5.0 (iPhone)", { "x-vercel-protection-bypass": "x" })));
t("sinyal: gerçek tarayıcı sayılır", countable(h("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1")));
t("sinyal: ziyaretçi özeti günden güne değişir, ham IP içermez", visitorOf("2026-11-01", ["1.2.3.4", "ua"]) !== visitorOf("2026-11-02", ["1.2.3.4", "ua"]) && !visitorOf("2026-11-01", ["1.2.3.4", "ua"]).includes("1.2.3.4"));
/* kayıt düzeltmeleri: ölü web sitesi profilde görünmez, ana sayfaya çevrilen çalışan adresi taşır */
const fx = JSON.parse(readFileSync("data/real/duzeltmeler.json", "utf8")) as Record<string, { website?: string | null }>;
const webFix = Object.entries(fx).filter(([, f]) => "website" in f);
t("düzeltme: ölü web siteleri kayıttan kalktı", webFix.filter(([, f]) => f.website === null).every(([s]) => !realEntities.find((e) => e.slug === s)?.contact?.website), String(webFix.filter(([, f]) => f.website === null).length));
t("düzeltme: taşınan sayfa aynı alan adının ana sayfasına çevrildi", webFix.filter(([, f]) => f.website).every(([s, f]) => realEntities.find((e) => e.slug === s)?.contact?.website === f.website), String(webFix.filter(([, f]) => f.website).length));
/* Google sekmesi havuzu: vitrin/panoda görünen mekân tekrar edilmez; kurucuyla ilişkili ve sosyal tesis alınmaz */
const allSlugs = realEntities.map((e) => e.slug);
const shown = new Set(pickDiverse(realEntities, {}).map((e) => e.slug));
const gmap = Object.fromEntries(allSlugs.map((s, i) => [s, { rating: 3.5 + (i % 15) / 10, count: 50 + i * 3, checkedAt: new Date().toISOString(), mapsUrl: null }]));
const gt = googleRankedThemes(gmap, shown).flatMap((t) => [...t.items, ...t.few].map((i) => i.slug));
t("Google sekmesi: vitrindeki mekân tekrar etmez", !gt.some((s) => shown.has(s)) && shown.has("ismet-baba-uskudar"), `${gt.length} aday`);
t("Google sekmesi: Japon Erdal ve sosyal tesis yok", !gt.includes("japon-erdal-beyoglu") && !gt.some((s) => /sosyal-tesis/.test(s)));
t("Google sekmesi: sayfa açılışında Google isteği yok", !/fetch\(/.test(readFileSync("components/home/TopRated.tsx", "utf8")));
t("Google sekmesi: az değerlendirme eşiği kodda", /MIN_GOOGLE_REVIEWS = 100/.test(readFileSync("components/home/TopRated.tsx", "utf8")));
const page = readFileSync("app/page.tsx", "utf8");
t("ana sayfa Seçkisi altı farklı gerçek restoran içerir", /<HomeSecki/.test(page) && SECKI_RESTAURANTS.length===6 && new Set(SECKI_RESTAURANTS.map(r=>r.slug)).size===6 && SECKI_RESTAURANTS.every(r=>realEntities.some(e=>e.slug===r.slug&&e.isReal&&!e.isDemo&&e.categoryId==="cat.restaurant")));
t("ana sayfa soru alanı gerçek /sor'a gider", /sorHref|\/sor\/\?q=/.test(readFileSync("components/home/HomeSor.tsx", "utf8")));
/* örnek sorular kural motorunda da en az iki ilgili sonuç vermeli (AI kapalıyken de vitrin zayıf görünmesin) */
const src = readFileSync("components/home/HomeSor.tsx", "utf8");
const ornek = [...src.slice(src.indexOf("const ORNEKLER"), src.indexOf("];", src.indexOf("const ORNEKLER"))).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
t("ana sayfada 4 örnek soru", ornek.length === 4, ornek.join(" | "));
t("zayıf sonuç veren örnek yok (Beşiktaş kahvaltı)", !ornek.some((o) => /Beşiktaş'ta kahvaltı/.test(o)));
const sor = ["lib/sor/engine.ts", "lib/sor/ask.ts"].map((f) => readFileSync(f, "utf8")).join("\n");
t("Sor motorunda mekâna özel ayrıcalık/ceza yok", !/japon-erdal|HOME_EXCLUDE/i.test(sor));
(async () => {
delete process.env.GROQ_API_KEY; delete process.env.SOR_AI_PROVIDER;
for (const o of ornek) { const r = await soru({ query: o } as never); t(`örnek "${o}": kurallı yanıtta en az 2 sonuç, sosyal tesis yok`, r.items.length >= 2 && !r.items.some((i) => /sosyal tesis/i.test(i.name)), r.items.map((i) => i.name).slice(0, 3).join(", ")); }
console.log(`ana sayfa: ${ok} geçti, ${bad} kaldı`); process.exit(bad ? 1 : 0);
})();
