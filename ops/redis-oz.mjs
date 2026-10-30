/* PREVIEW · Redis öz testi; 2099 anahtarları, Google yok. */
const A = `https://${process.env.SEO_HOST}/api/admin/db/`, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const t = Date.now(); const r = await fetch(A, { method: "POST", headers: H, body: JSON.stringify({ target: "preview", action: "redis-selftest", confirm: "EVET" }) }); const x = await r.text();
console.log("OZ", r.status, Date.now() - t, "ms"); console.log("OZ", x.slice(0, 1800));
