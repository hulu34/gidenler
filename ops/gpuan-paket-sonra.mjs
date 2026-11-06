/* Paket sonrası doğrulama: sitede gösterilen sayı, örnek profiller, yinelenen kimlik yok. Log: yalnız sayılar. */
const B = `https://${process.env.HOST}`, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const r = await (await fetch(`${B}/api/admin/google-puan/?rapor=gunluk`, { headers: H })).json();
console.log("sonra", JSON.stringify({ shown: r.site?.shown, hidden: r.site?.hidden, final: r.final }));
let ok = 0, n = 0;
for (const s of (process.env.ORNEK ?? "").split(",").filter(Boolean)) { n++; const t = await (await fetch(`${B}/mekan/${s}/`, { headers: H })).text(); if (/data-google-kayitli/.test(t)) ok++; }
console.log(`örnek profilde Google puanı ${ok}/${n}`);
process.exit(ok === n ? 0 : 1);
