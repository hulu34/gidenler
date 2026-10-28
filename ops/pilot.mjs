/* GOOGLE PİLOTU — korumalı, staged Production test dağıtımına (Google yalnız orada açık) karşı.
   Depo herkese açık: loga hiçbir Google içeriği, place_id veya anahtar yazılmaz; yalnız sayılar.
   Ayrıntı out/pilot.json'a gider (iş akışı şifreler). Ücretli çağrılar sunucudaki Redis kota
   sınırlarından geçer (günlük + aylık sert sınır); bu betik yalnız N restoranı ister. */
import { mkdirSync, writeFileSync } from "node:fs";

const BYPASS = process.env.VERCEL_BYPASS, HOST = process.env.PILOT_HOST, N = Number(process.env.PILOT_N);
const SHOW = Math.max(0, Number(process.env.PILOT_SHOW ?? 2));
if (!BYPASS || !HOST || !(N >= 0 && N <= 25)) { console.error("VERCEL_BYPASS / PILOT_HOST / PILOT_N (0–25) eksik"); process.exit(2); }

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const auth = { "x-vercel-protection-bypass": BYPASS, "user-agent": UA };
const admin = `https://${HOST}/api/admin/db`;
const j = async (r) => ({ status: r.status, body: await r.json().catch(() => null) });
const out = { at: new Date().toISOString(), n: N };

/* 1) Koruma: başlıksız istek içeri girememeli */
out.noAuth = {
  admin: (await fetch(`${admin}?rapor=google`, { redirect: "manual" })).status,
  place: (await fetch(`https://${HOST}/api/google/place/?slug=34-restaurant-sisli`, { redirect: "manual" })).status,
};

/* 2) Redis (yalnız okuma) ve önceki durum */
out.redis = (await j(await fetch(`${admin}?rapor=redis`, { headers: auth }))).body;
out.before = (await j(await fetch(`${admin}?rapor=google`, { headers: auth }))).body;
if (!out.before?.enabled) { console.log("Google bu dağıtımda kapalı; durduruldu."); finish(1); }

/* 3) Eşleştirme */
if (N > 0) {
  const r = await j(await fetch(admin, {
    method: "POST", headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ action: "google-match", confirm: "EVET", target: "production", limit: N }),
  }));
  out.match = r;
}
/* 4) Gösterim: otomatik eşleşenlerden SHOW tanesi için canlı Google bölümü verisi (tarayıcı gibi) */
const autos = (out.match?.body?.results ?? []).filter((x) => x.status === "auto").slice(0, SHOW);
out.display = [];
for (const a of autos) {
  const t0 = performance.now();
  const r = await j(await fetch(`https://${HOST}/api/google/place/?slug=${encodeURIComponent(a.slug)}`, { headers: auth }));
  const p = r.body ?? {};
  out.display.push({
    slug: a.slug, status: r.status, ms: Math.round(performance.now() - t0),
    rating: typeof p.rating === "number", count: typeof p.count === "number", mapsUri: !!p.mapsUri,
    reviews: p.reviews?.length ?? 0, reviewsWithAuthor: (p.reviews ?? []).filter((x) => x.author && x.authorUri).length,
    photos: p.photos?.length ?? 0, photosWithAuthor: (p.photos ?? []).filter((x) => x.author).length, hours: p.hours?.length ?? 0,
  });
}
/* sayaçlar gösterim çağrılarından SONRA okunur */
out.after = (await j(await fetch(`${admin}?rapor=google`, { headers: auth }))).body;
finish(0);

function finish(code) {
  mkdirSync("out", { recursive: true });
  writeFileSync("out/pilot.json", JSON.stringify(out, null, 1));
  const res = out.match?.body?.results ?? [];
  const cnt = (f) => res.filter(f).length;
  const calls = res.reduce((s, x) => ({ ts: s.ts + (x.calls?.textSearch ?? 0), de: s.de + (x.calls?.detailsEnterprise ?? 0) }), { ts: 0, de: 0 });
  const usage = Object.fromEntries(Object.entries(out.after?.usage ?? {}).map(([k, v]) => [k.replace("google:", ""), `${v.month}/ay · ${v.day}/gün · sınır ${v.budget?.monthly ?? "?"}/${v.budget?.daily ?? "?"}`]));
  console.log("Korumasız istek durumları:", JSON.stringify(out.noAuth));
  console.log("Redis:", JSON.stringify({ total: out.redis?.total, groups: out.redis?.groups ? Object.keys(out.redis.groups).length : null }));
  console.log("Eşleştirme HTTP:", out.match?.status ?? "-", "· istenen:", N, "· işlenen:", res.length);
  console.log("Sonuç:", JSON.stringify({ auto: cnt((x) => x.status === "auto"), pending: cnt((x) => x.status === "pending"), no_match: cnt((x) => x.status === "no_match"), existing: cnt((x) => x.status === "existing"), limit: cnt((x) => x.status === "limit"), error: cnt((x) => x.status === "error") }));
  console.log("Sinyaller:", JSON.stringify({ phoneMatch: cnt((x) => x.phone === "match"), phoneConflict: cnt((x) => x.phone === "conflict"), webMatch: cnt((x) => x.website === "match"), webConflict: cnt((x) => x.website === "conflict"), duplicate: cnt((x) => x.duplicate) }));
  console.log("Çağrılar (bu koşu):", JSON.stringify(calls));
  console.log("Veritabanı Google durumları:", JSON.stringify(out.after?.stats ?? null));
  console.log("Kota sayaçları:"); console.table(usage);
  console.log("Gösterim kontrolü:"); console.table(out.display.map(({ slug, ...d }, i) => ({ i: i + 1, ...d })));
  process.exit(code);
}
