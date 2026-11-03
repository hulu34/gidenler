/* Preview'ın veritabanı yalıtımı ve AI durumu. Değer içermez; yalnız durum yazar. */
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
let bad = 0;
for (const [ad, host] of Object.entries(JSON.parse(process.env.HOSTS))) {
  const r = await fetch(`https://${host}/api/sor/`, { headers: H }); const j = await r.json().catch(() => null);
  console.log(ad, r.status, JSON.stringify(j));
  /* CLI dağıtımı üretim veritabanına bağlıdır; orada "kapali" beklenen güvenli durumdur */
  if (!j || j.db === "kapali" && !ad.startsWith("cli")) bad++;
  if (ad.startsWith("cli") && j?.db !== "kapali" && j?.db !== "yalitilmis") bad++;
  if (ad === "cli" && j?.db === "yalitilmis") console.log("bilgi: CLI dağıtımı üretim dışı veritabanında");
}
const p = await fetch("https://www.gidenler.com/api/sor/"); console.log("production GET durum", p.status, p.status === 405 || p.status === 404 ? "kapalı" : "açık");
process.exit(bad ? 1 : 0);
