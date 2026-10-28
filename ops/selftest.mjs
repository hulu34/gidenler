/* Redis öz testi (yalnız 2099 tarihli test anahtarları) + harcama raporu (yalnız okuma). Google'a çağrı yok. */
const BYPASS = process.env.VERCEL_BYPASS, HOST = process.env.TOPLU_HOST;
const admin = `https://${HOST}/api/admin/db`, auth = { "x-vercel-protection-bypass": BYPASS };
const r = await fetch(admin, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ action: "redis-selftest", confirm: "EVET", target: "production" }) });
const j = await r.json().catch(() => null);
console.log("Öz test:", r.status, j?.ok ? "geçti" : "KALDI");
for (const c of j?.checks ?? []) console.log(`  ${c.ok ? "✓" : "✗"} ${c.name}`);
const g = await (await fetch(`${admin}?rapor=google`, { headers: auth })).json().catch(() => null);
console.log("Harcama:", JSON.stringify(g?.spend ?? null));
process.exit(j?.ok && g?.spend ? 0 : 1);
