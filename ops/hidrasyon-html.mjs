/* Tanı · yalnız okuma: sunucu HTML'indeki başlık ile gömülü RSC verisi (showSeckisi) aynı mı? Sayfa başına 8 istek. */
const HOST = process.env.SECKI_HOST;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
for (const path of ["/", "/kesfet/", "/nasil-calisir/", "/mekan/serden-erzurum-cag-kebabi-bahcelievler/", "/seckisi/", "/seckisi/serden-mese-atesinin-karsisinda/"]) {
  const rows = [];
  for (let i = 0; i < 8; i++) {
    const r = await fetch(`https://${HOST}${path}`, { headers: H });
    const h = await r.text();
    const head = h.slice(h.indexOf("<header"), h.indexOf("</header>"));
    const link = head.includes('href="/seckisi/"');
    const m = h.match(/showSeckisi\\?":(true|false)/);
    rows.push(`${r.headers.get("x-vercel-cache") ?? "-"}:${link ? "L" : "-"}${m ? (m[1] === "true" ? "T" : "F") : "?"}:${(r.headers.get("x-nextjs-prerender") ?? r.headers.get("x-nextjs-stale-time") ?? "")}`);
    await new Promise((s) => setTimeout(s, 400));
  }
  console.log(`${path} → ${rows.join(" ")}`);
}
console.log("açıklama: önbellek:HTML'de Seçki bağlantısı(L/-)+gömülü showSeckisi(T/F/?)");
