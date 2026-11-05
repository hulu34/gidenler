/* ÜRETİM · yalnız okuma: Redis önek sayıları (değer yok) ve Google kullanım raporu. Google'a istek yok. */
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS }, A = `https://${process.env.PROD_DEPLOY}/api/admin/db/`;
const r = await fetch(`${A}?rapor=redis`, { headers: H }); const j = await r.json().catch(async () => ({ raw: (await r.text()).slice(0, 300) }));
console.log("REDIS", r.status, JSON.stringify(j).slice(0, 2500));
const g = await (await fetch(`${A}?rapor=google`, { headers: H })).json().catch(() => ({}));
console.log("GOOGLE", JSON.stringify({ usage: g.usage, spend: g.spend?.usd, pause: g.pause }));
