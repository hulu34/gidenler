/* PREVIEW · arama motoru kuralları. Yalnız HTML/XML okunur, JavaScript çalışmaz (Google çağrısı tetiklenmez). Erişim başlığı yalnız test alan adına gider. */
const HOST = process.env.SEO_HOST, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const get = async (p) => { const r = await fetch(`https://${HOST}${p}`, { headers: H, redirect: "manual" }); return { st: r.status, h: await r.text(), xr: r.headers.get("x-robots-tag") }; };
const W = "https://www.gidenler.com";
const canon = (h) => h.match(/<link rel="canonical" href="([^"]*)/)?.[1];
const rob = (h) => h.match(/<meta name="robots" content="([^"]*)/)?.[1] ?? null;
const desc = (h) => h.match(/<meta name="description" content="([^"]*)/)?.[1] ?? "";
const lds = (h) => [...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));

const rb = await get("/robots.txt");
ok("robots: Sitemap satırı", rb.h.includes(`Sitemap: ${W}/sitemap.xml`));
ok("robots: mekân kapalı değil", !/Disallow: \/mekan/.test(rb.h));
const sm = await get("/sitemap.xml");
ok("sitemap 200", sm.st === 200);
const locs = [...sm.h.matchAll(/<loc>([^<]+)/g)].map((m) => m[1]);
const venues = locs.filter((u) => u.includes("/mekan/"));
ok("hepsi www ve / ile biter", locs.every((u) => u.startsWith(W + "/") && u.endsWith("/")), `${locs.length} adres`);
console.log(`mekân ${venues.length}, seçki ${locs.filter((u) => u.includes("/seckisi")).length}, lastmod ${(sm.h.match(/<lastmod>/g) ?? []).length}`);
ok("adresler tekil", new Set(locs).size === locs.length);
ok("/yaz/, /ara/, demo yok", !locs.some((u) => /\/(yaz|ara|demo|isletme|yonetim)\//.test(u)));
ok("Seçki TR/EN karşılıklı", sm.h.includes(`hreflang="en"`) && sm.h.includes(`hreflang="tr"`));
ok("yayımlanmamış yazı yok", !/pandeli-carsinin|yeni-lokanta-dokuz|balikci-sabahattin-sultan|serden-mese|efes-duatepe|cihangirde|taslak/.test(sm.h));

/* her sitemap mekânı: canonical kendisi, noindex yok, açıklama tutarlı */
let bad = [], nold = [], aggr = [], kept = 0, lie = [];
for (const u of venues) {
  const p = new URL(u).pathname; const { st, h, xr } = await get(p);
  if (st !== 200 || canon(h) !== u || rob(h) || (xr && /noindex/.test(xr) && false)) bad.push(p);
  const L = lds(h)[0]; if (!L || !L.address || !L.name) nold.push(p); else kept++;
  if (L?.aggregateRating) aggr.push(p);
  const d = desc(h);
  if (d.includes("çalışma saatleri") && h.includes("Açılış saatleri henüz yok")) lie.push(p);
  if (d.includes("adres") && h.includes("Adres henüz yok")) lie.push(p);
}
ok("mekânlar 200, canonical kendisi, noindex yok", bad.length === 0, bad.slice(0, 5).join(" "));
ok("415 mekân: 376 Restaurant verili, 39 adressiz verisiz", venues.length >= 415 && venues.length <= 420 && kept + nold.length === venues.length, `${kept} + ${nold.length}`);
ok("açıklama olmayanı vaat etmiyor", lie.length === 0, lie.slice(0, 5).join(" "));
console.log(`aggregateRating taşıyan (Preview test puanları): ${aggr.length} ${aggr.slice(0, 3).join(" ")}`);
for (const p of aggr.slice(0, 3)) { const { h } = await get(p); const a = lds(h)[0].aggregateRating; const shown = String(a.ratingValue).replace(".", ",");
  ok(`işaretlenen puan açıklamada aynı ${p}`, desc(h).includes(`${shown}/10`) || desc(h).includes(`${a.ratingValue}/10`), `${a.ratingValue}/${a.bestRating} n=${a.ratingCount}`); }

/* Japon Erdal: sahiplik ilişkili */
{ const { h } = await get("/mekan/japon-erdal-beyoglu/"); const L = lds(h)[0];
  ok("Japon Erdal Restaurant", L?.["@type"] === "Restaurant" && L.address?.streetAddress?.includes("Dibek")); ok("Japon Erdal'da puan işaretlemesi yok", L && !L.aggregateRating); console.log("JE açıklama:", desc(h)); }
/* zengin ve yalın örnek */
for (const s of ["pandeli-fatih", "develi-atasehir", "kronotrop-cihangir-beyoglu"]) { const { h } = await get(`/mekan/${s}/`); console.log(s, "|", desc(h), "| hours", lds(h)[0]?.openingHoursSpecification?.length ?? 0, "|", lds(h)[0]?.["@type"]); }
/* adressiz: indekslenir ama site haritasında ve işaretlemede yok */
{ const { st, h } = await get("/mekan/barba-yani-adalar/"); ok("adressiz: 200, işaretleme yok, site haritası dışı", st === 200 && lds(h).length === 0 && !locs.includes(`${W}/mekan/barba-yani-adalar/`)); console.log("adressiz açıklama:", desc(h)); ok("adressiz: adres denmez", !desc(h).includes("adres")); ok("adressiz: noindex yok", !rob(h)); }

/* araç sayfaları */
for (const p of ["/yaz/pandeli-fatih/", "/ara/", "/ara/?q=pide", "/harita/", "/benim/", "/sor/", "/karsilastir/", "/simdi/", "/birlikte/", "/zevkim/"]) { const { st, h } = await get(p); ok(`noindex,follow ${p}`, st === 200 && /noindex/.test(rob(h) ?? "") && /(^|, ?)follow/.test(rob(h) ?? ""), rob(h) ?? "yok"); }
/* içerik sayfaları */
for (const [p, c] of [["/", "/"], ["/gercek/", "/gercek/"], ["/kesfet/", "/kesfet/"], ["/kategori/restoran/", "/kategori/restoran/"], ["/nasil-calisir/", "/nasil-calisir/"], ["/kurallar/", "/kurallar/"], ["/mekan/pandeli-fatih/fotograflar/", "/mekan/pandeli-fatih/fotograflar/"]]) { const { st, h } = await get(p); ok(`canonical ${p}`, st === 200 && canon(h) === W + c && !rob(h), canon(h) ?? "yok"); }
/* Seçki: Preview'da kasten noindex; Production'da kaldığı kod testinde. İşaretleme ve canonical burada ölçülür. */
for (const [p, l] of [["/seckisi/japon-erdal-dort-pide-bir-efsane/", "tr"], ["/seckisi/en/japon-erdal-dort-pide-bir-efsane/", "en"]]) { const { h } = await get(p); const A = lds(h)[0];
  ok(`Article ${l}`, A?.["@type"] === "Article" && A.inLanguage === l && A.datePublished && A.url === W + p && canon(h) === W + p, A?.headline ?? "yok"); console.log(JSON.stringify(A).slice(0, 400)); }
const nf = await get("/mekan/yok-boyle-bir-yer/"); ok("olmayan mekân 404", nf.st === 404);
console.log(`\nSONUÇ ${res.filter(Boolean).length}/${res.length}`);
if (res.includes(false)) process.exit(1);
