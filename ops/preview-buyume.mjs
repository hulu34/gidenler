/* Preview denetimi: yönetici günlük ekranının yeni alanları + kesin kapalı mekânlar genel sayfalarda yok. Log: yalnız sayılar. */
const B = `https://${process.env.HOST}`, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const t = async (p) => { const r = await fetch(B + p, { headers: H }); return { s: r.status, x: r.ok ? await r.text() : "" }; };
const y = await t("/yonetim/google-puan/");
const need = ["Bugün değişmeyen puan", "Şüpheli eşleşme", "45 günü geçen", "Son Excel sürümü", "Sitede gösterilen", "08:30"];
console.log("yonetim", y.s, JSON.stringify(Object.fromEntries(need.map((k) => [k, y.x.includes(k)]))), "gecikme", y.x.includes("data-gecikme"));
const www = await fetch("https://www.gidenler.com/yonetim/google-puan/"); console.log("www anonim yonetim", www.status);
