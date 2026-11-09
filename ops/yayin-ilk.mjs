/* ÜRETİM · İlk kullanıcı yayını, aşama 1 + 2 (sahip onayı 2026-11-09 "Aşama 1 ve 2'yi yayınla").
   Hedef: alan adı ATANMAMIŞ Production dağıtımı (PROD_HOST). Yalnız GET; veritabanına yazmaz (geçiş yayin-gece3.mjs'te).
   Log: yalnız durum ve sayılar. */
const B = `https://${process.env.PROD_HOST}`, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const get = async (p, h = H) => { const r = await fetch(p.startsWith("http") ? p : `${B}${p}`, { headers: h, redirect: "manual" }); return { s: r.status, t: await r.text() }; };
const bad = (t) => /Application error|Internal Server Error/.test(t);

const db = JSON.parse((await get("/api/admin/db/")).t || "{}");
ok("ortam üretim, bekleyen geçiş yok", db.env === "production" && (db.migrations?.pending ?? ["?"]).length === 0, `${db.env} ${JSON.stringify(db.migrations?.pending)}`);

const h = await get("/");
ok("ana sayfa: deneyim bölümü + Top 10, Japon Erdal yok", h.s === 200 && !bad(h.t) && h.t.includes("data-ana-son-yemek") && h.t.includes("data-hero-deneyim") && !/Japon Erdal/.test(h.t), h.s);
for (const p of ["/nerede-yedin/", "/nerede-yedin/?k=ic01", "/nerede-yedin/oner/", "/yaz/pandeli-fatih/", "/ara/", "/kesfet/", "/mekan/pandeli-fatih/", "/sitemap.xml"]) {
  const r = await get(p); ok(`sayfa ${p}`, r.s === 200 && !bad(r.t), r.s);
}
const ny = await get("/nerede-yedin/"); ok("kampanya sayfası arama kutusu", ny.t.includes("data-son-yemek-girdi"));
const ara = JSON.parse((await get("/api/ara/?q=kosebasi&limit=8")).t || "{}");
ok("arama ucu çalışıyor (456 sürümü: 906 şubesi yok)", Array.isArray(ara.items) && !ara.items.some((i) => i.slug === "kosebasi-besiktas"), (ara.items ?? []).length);

const kp = await get("/yonetim/kampanya/"); ok("kampanya panosu (tablo okunuyor)", kp.s === 200 && !bad(kp.t) && kp.t.includes("ic10"), kp.s);
const mo = await get("/yonetim/mekan-onerileri/"); ok("öneri kuyruğu sayfası", mo.s === 200 && !bad(mo.t), mo.s);

for (const [s, want] of [["refik-beyoglu", true], ["tahtalikoy-catalca", true], ["memnun-doner-avcilar", false]]) {
  const r = await get(`/mekan/${s}/`); ok(`kapanış ${s}: ${want ? "kesin kapalı notu" : "not yok"}`, r.s === 200 && r.t.includes('data-kapanis="kesin"') === want, r.s);
}
const g = JSON.parse((await get("/api/admin/google-puan/?rapor=gunluk")).t || "{}");
console.log("google puan sitede", g.site?.shown, "gizli", g.site?.hidden);
ok("Google puanı raporu üretimde", g.env === "production" && g.site?.shown > 300);

const ms = JSON.parse((await get("/api/media/status/")).t || "{}"); ok("fotoğraf yükleme kapalı", ms.enabled === false);
const k = res.filter((x) => !x).length; console.log(`SONUÇ ${res.length - k}/${res.length}`); process.exit(k ? 1 : 0);
