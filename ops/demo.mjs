/* Yatırımcı demosu kontrolü (yalnız okuma): koruma, noindex, bant, gösterim akışı, üç restoran kartı. Log yalnız sayı/doğru-yanlış. */
const BYPASS = process.env.VERCEL_BYPASS, HOST = process.env.DEMO_HOST;
const auth = { "x-vercel-protection-bypass": BYPASS, "user-agent": "Mozilla/5.0 Chrome/130" };
const checks = [];
const ok = (n, c, info = "") => { checks.push(c); console.log(`${c ? "✓" : "✗"} ${n} ${info}`); };
const get = async (p, h = auth) => { try { const r = await fetch(`https://${HOST}${p}`, { headers: h, redirect: "manual" }); return { s: r.status, h: r.headers, t: await r.text() }; } catch { return { s: 0, h: new Headers(), t: "" }; } };
const anon = await get("/demo/", { "user-agent": "Mozilla/5.0 Chrome/130" });
ok("koruma: bypass olmadan erişim yok", [302, 401, 403].includes(anon.s), `durum=${anon.s}`);
const FLOW = ["/", "/demo/", "/mekan/moda-lokantasi/", "/mekan/koz-durum/", "/mekan/asma-teras/", "/karsilastir/?a=moda-lokantasi&b=asma-teras", "/gidenler-100/", "/liste/kadikoy-fiyat-performans/", "/benim/", "/isletme/moda-lokantasi/"];
let n200 = 0, nBand = 0, nRobots = 0;
for (const p of FLOW) {
  const r = await get(p);
  if (r.s === 200) n200++;
  if (r.t.includes("Yatırımcı demosu — simüle edilmiş veriler")) nBand++;
  if (/noindex/.test(r.h.get("x-robots-tag") ?? "") && /noindex/.test(r.t)) nRobots++;
}
ok("gösterim akışı: 10 sayfa açılıyor", n200 === FLOW.length, `${n200}/${FLOW.length}`);
ok("her sayfada 'simüle edilmiş veriler' bandı", nBand === FLOW.length, `${nBand}/${FLOW.length}`);
ok("indeksleme engeli: başlık + meta", nRobots === FLOW.length, `${nRobots}/${FLOW.length}`);
const d = (await get("/demo/")).t;
ok("üç restoran kartı: yükselen / sabit / düşen", ["Moda Lokantası", "Köz Dürüm", "Asma Teras", "yükseliyor", "geriliyor", "Üç restoran, üç yön", "En çok düşen restoranlar"].every((x) => d.includes(x)));
const m = (await get("/mekan/moda-lokantasi/")).t;
ok("gerçek kullanıcı/üretim verisi yok: demo veritabanına bağlanmaz", !/Gidenler deneyimleri/.test(m) && (await get("/api/me/places/")).s !== 200);
process.exit(checks.every(Boolean) ? 0 : 1);
