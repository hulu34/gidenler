/* Google API gerçek tüketim raporu (yalnız okuma): kalem başına bugün/bu ay, ücretsiz kota, ücretli adet, USD, tavan. */
const BYPASS = process.env.VERCEL_BYPASS, HOST = process.env.TEST_HOST;
const g = await (await fetch(`https://${HOST}/api/admin/db/?rapor=google`, { headers: { "x-vercel-protection-bypass": BYPASS } })).json();
const rows = Object.fromEntries(Object.entries(g.usage ?? {}).map(([k, v]) => [k.replace("google:", ""), { bugun: v.day, buAy: v.month, gunlukSinir: v.budget?.daily, ayliksinir: v.budget?.monthly, ucretsiz: v.free, ucretli: v.billable, usd: g.spend?.perSku?.[k]?.usd }]));
console.table(rows);
console.log("Bu ay toplam: $", g.spend?.usd, "· tavan: $", g.spend?.capUsd, "· eşleşme:", JSON.stringify(g.stats));
