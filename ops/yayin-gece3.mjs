/* ÜRETİM YAYINI · sahibin onayı 2026-11-05 ("Evet, Production'a al"). Hedef: alan adı ATANMAMIŞ Production dağıtımı (PROD_HOST).
   1) ortam ve bekleyen geçişler  2) yalnız 0002–0004 bekliyorsa migrate  3) yeniden durum  4) yalnız okuma duman testi.
   Log: yalnız durum ve sayılar. */
const HOST = process.env.PROD_HOST, B = `https://${HOST}`, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS }, A = `${B}/api/admin/db/`;
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const st = async () => { const r = await fetch(A, { headers: H }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const s1 = await st(); const pend = s1.j.migrations?.pending ?? null;
console.log("ortam", s1.j.env, "http", s1.s, "bekleyen", JSON.stringify(pend));
if (s1.j.env !== "production") { console.log("DUR: hedef üretim değil"); process.exit(1); }
const exp = (process.env.EXPECT ?? "0002_fotograf_arsivi,0003_temizlik_ve_sayac,0004_cift_gonderim").split(",");
if (pend && pend.length) {
  if (JSON.stringify(pend) !== JSON.stringify(exp)) { console.log("DUR: beklenmeyen geçiş listesi"); process.exit(1); }
  const r = await fetch(A, { method: "POST", headers: { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ target: "production", confirm: "EVET", action: "migrate" }) });
  const j = await r.json().catch(() => ({}));
  ok("migrate", r.status === 200, `${r.status} uygulanan=${JSON.stringify(j.applied ?? j.error ?? j.message)}`);
}
const s2 = await st(); ok("geçişler tamam (bekleyen yok)", Array.isArray(s2.j.migrations?.pending) && s2.j.migrations.pending.length === 0, JSON.stringify(s2.j.migrations?.pending));
const get = async (p) => { const r = await fetch(`${B}${p}`, { headers: H, redirect: "manual" }); const t = await r.text(); return { s: r.status, t }; };
for (const [p, must] of [["/", "Gidenler"], ["/mekan/japon-erdal-beyoglu/", "Japon Erdal"], ["/mekan/pandeli-fatih/", "Pandeli"], ["/yaz/japon-erdal-beyoglu/", ""], ["/kesfet/", ""], ["/sitemap.xml", "<urlset"]]) {
  const r = await get(p); ok(`sayfa ${p}`, r.s === 200 && r.t.includes(must) && !/Application error|Internal Server Error/.test(r.t), r.s);
}
const ms = await (await fetch(`${B}/api/media/status`, { headers: H })).json().catch(() => ({}));
ok("yükleme kapalı (depolama yok)", ms.enabled === false, JSON.stringify(ms));
const hs = await (await fetch(`${B}/api/me/hesap/`, { headers: H })).json().catch(() => ({}));
ok("hesap kapatma kapalı", hs.enabled === false, JSON.stringify(hs.enabled));
const md = await get("/api/media/japon-erdal-beyoglu/"); ok("Japon Erdal medya ucu", md.s === 200, `${md.s} ${md.t.slice(0, 0)}`);
if (process.env.EXPECT?.includes("0005")) {
  const h = await get("/"); ok("ana sayfa panosu ve fotoğraflı vitrin", h.s === 200 && h.t.includes("data-ana-pano") && (h.t.match(/data-ana-kesif-kart=/g) ?? []).length >= 4 && !/Japon Erdal/.test(h.t));
  const je = await get("/mekan/japon-erdal-beyoglu/"); ok("JE profili dikey mozaik, taş fırın yok", je.s === 200 && je.t.includes('data-mozaik="dikey"') && !/taş fırın/i.test(je.t));
  const sy = await get("/seckisi/japon-erdal-dort-pide-bir-efsane/"); ok("Seçki yazısında taş fırın yok", sy.s === 200 && !/taş fırın/i.test(sy.t));
  const sn = await fetch(`${B}/api/sinyal/`, { method: "POST", headers: { ...H, origin: B, "content-type": "text/plain", "user-agent": "Mozilla/5.0" }, body: JSON.stringify({ slug: "kanaat-lokantasi-uskudar", kind: "view" }) });
  const rs = await (await fetch(`${A}?rapor=sinyal`, { headers: H })).json().catch(() => ({}));
  ok("sinyal ucu 204, test isteği sayılmadı", sn.status === 204 && (rs.byKind?.view ?? 0) === 0, `${sn.status} view=${rs.byKind?.view ?? "?"} rows=${rs.rows}`);
}
const mod = await get("/yonetim/fotograf-moderasyon/"); ok("moderasyon paneli girişsiz açılmıyor", !/data-cover-compare|Onayla/.test(mod.t), mod.s);
const k = res.filter((x) => !x).length; console.log(`SONUÇ ${res.length - k}/${res.length}`); process.exit(k ? 1 : 0);
