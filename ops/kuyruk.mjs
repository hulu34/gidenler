/* Onay kuyruğu eşitleme — onaylanmış/reddedilmiş eşleşmelerin açık satırlarını kapatır (silmez). Google'a çağrı yok. */
const BYPASS = process.env.VERCEL_BYPASS, HOST = process.env.TOPLU_HOST;
if (!BYPASS || !HOST) { console.error("VERCEL_BYPASS / TOPLU_HOST eksik"); process.exit(2); }
const admin = `https://${HOST}/api/admin/db`, auth = { "x-vercel-protection-bypass": BYPASS };
const before = await (await fetch(`${admin}?rapor=google`, { headers: auth })).json().catch(() => null);
console.log("Önce kuyruk:", JSON.stringify(before?.queue ?? null), "· eşleşmeler:", JSON.stringify(before?.stats ?? null), "· açık bekleyen liste:", before?.pending?.length);
const r = await fetch(admin, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ action: "google-queue-sync", confirm: "EVET", target: "production" }) });
const j = await r.json().catch(() => null);
console.log("Eşitleme:", r.status, JSON.stringify({ ok: j?.ok, closed: j?.closed, stillOpen: j?.stillOpen }));
const after = await (await fetch(`${admin}?rapor=google`, { headers: auth })).json().catch(() => null);
console.log("Sonra kuyruk:", JSON.stringify(after?.queue ?? null), "· eşleşmeler:", JSON.stringify(after?.stats ?? null), "· açık bekleyen liste:", after?.pending?.length);
process.exit(j?.ok ? 0 : 1);
