/* GOOGLE EŞLEŞME ONAYI — proje sahibinin sohbette onayladığı kayıtlar (2026-10-28).
   Yalnız place_identifiers.status: pending → confirmed. Başka veri değişmez; Google'a çağrı yapılmaz.
   Kimlikler Gidenler'in kendi kayıt kimlikleridir (Google içeriği değil). Alaçatı Balıkçısı bilerek yok. */
const BYPASS = process.env.VERCEL_BYPASS, HOST = process.env.PILOT_HOST;
if (!BYPASS || !HOST) { console.error("VERCEL_BYPASS / PILOT_HOST eksik"); process.exit(2); }
const IDS = {
  "adile-sultan-ev-yemekleri-umraniye-restorani-umraniye": "01a1800f-df3e-7085-b257-e9ff540ebc13",
  "adile-sultan-ev-yemekleri-uskudar": "01a1800f-e0ad-7208-a4ab-7fad13559d78",
  "akinti-burnu-balik-restaurant-besiktas": "01a1800f-e413-71ba-b699-a386ce1a06e5",
  "altin-sini-avcilar": "01a1800f-eb02-7340-bd0f-a0efe6e3ebe5",
  "altinkapi-restaurant-fatih": "01a1800f-ed46-7dee-99f7-7931e0c29ac9",
};
const admin = `https://${HOST}/api/admin/db`;
const auth = { "x-vercel-protection-bypass": BYPASS };
let fail = 0;
for (const [slug, id] of Object.entries(IDS)) {
  const r = await fetch(admin, { method: "POST", headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ action: "google-review", confirm: "EVET", id, decision: "confirmed" }) });
  const j = await r.json().catch(() => null);
  if (!j?.ok) fail++;
  console.log(slug, r.status, j?.ok ? "confirmed" : (j?.error ?? "?"));
}
const g = await (await fetch(`${admin}?rapor=google`, { headers: auth })).json().catch(() => null);
console.log("Veritabanı Google durumları:", JSON.stringify(g?.stats ?? null), "· bekleyen:", g?.pending?.length ?? "?");
process.exit(fail ? 1 : 0);
