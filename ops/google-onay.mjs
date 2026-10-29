/* CANLI · grup 8: elle doğrulanmış 3 bekleyen Google adayını onaylar (google-review, confirmed). Google'a çağrı yok.
   Her kimlik için önce bekleyen listesinde doğru mekâna ait olduğu doğrulanır; tutmazsa hiçbir şey yazılmaz. */
const HOST = process.env.ADAY_HOST;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const admin = `https://${HOST}/api/admin/db/`;
const HEDEF = {
  "01a18035-28d8-7166-bc48-c2a75b230b15": "desi-vibes-fatih",
  "01a18058-a738-792b-a47f-c3fbc66dcab1": "zuga-beach-ve-restaurant-sariyer",
  "01a18055-3b2f-7f1c-825e-e5593a440fb5": "kardesler-kebap-ve-cafe-beyoglu",
};
const g = await (await fetch(`${admin}?rapor=google`, { headers: H })).json();
if (g.env !== "production") { console.log(`✗ canlı ortam değil (${g.env})`); process.exit(1); }
for (const [id, slug] of Object.entries(HEDEF)) {
  const p = (g.pending ?? []).find((x) => x.id === id);
  if (!p || p.slug !== slug) { console.log(`✗ ${slug}: kimlik bekleyen listesinde bu mekâna ait değil, atlandı`); process.exitCode = 1; continue; }
}
if (process.exitCode) process.exit(1);
for (const [id, slug] of Object.entries(HEDEF)) {
  const r = await fetch(admin, { method: "POST", headers: H, body: JSON.stringify({ action: "google-review", confirm: "EVET", target: "production", id, decision: "confirmed" }) });
  const j = await r.json().catch(() => ({}));
  console.log(`${r.ok && j.ok ? "✓" : "✗"} ${slug} onaylandı · HTTP ${r.status} ${j.error ?? ""}`);
  if (!(r.ok && j.ok)) process.exitCode = 1;
}
for (const slug of Object.values(HEDEF)) {
  const r = await (await fetch(`${admin}?rapor=profil&slug=${slug}`, { headers: H })).json();
  const say = {}; for (const x of r.google?.identifiers ?? []) say[x.status] = (say[x.status] ?? 0) + 1;
  console.log(`  ${slug} · google=${JSON.stringify(say)}`);
}
