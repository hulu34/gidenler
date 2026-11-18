/* PROFİL GÖRÜNÜM DENETİMİ (katalog kalite envanteri): yerel derlemede (BASE) her mekânın profili, araması, sitemap'i ve
   eksik veri açıklamaları. Yalnız GET; veritabanına yazmaz. Kullanım: BASE=http://localhost:3480 node scripts/katalog/profil-denetim.mjs <cikti.json>
   Ölçülen işaretler (HTML'de):
     b1Uyari            data-location-precision="street" (sokak düzeyi uyarısı)
     kesinKonumIddiasi  map_action=pano&viewpoint=<koordinat> (360° görünüm kesin noktayla açılıyor)
     osmAtfiKonumsuz    "Konum OpenStreetMap adres verisinden" (koordinatsız kayıtta yanlış atıf)
     haritaYokMetni     "harita noktası henüz yok"
     jsonLdGeo          GeoCoordinates
     kapaliUyari        data-kapanis */
import { readFileSync, writeFileSync } from "node:fs";
const B = process.env.BASE; const [out] = process.argv.slice(2);
const all = [...JSON.parse(readFileSync("data/real/venues.json", "utf8")), ...JSON.parse(readFileSync("data/real/isletme.json", "utf8"))];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const sm = await (await fetch(`${B}/sitemap.xml`)).text();
const ara = async (q) => ((await (await fetch(`${B}/api/ara/?q=${encodeURIComponent(q)}&limit=8`)).json().catch(() => ({}))).items ?? []).map((i) => i.slug);
const res = {}; const q = [...all]; let n = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) { const v = q.shift();
  const r = await fetch(`${B}/mekan/${v.slug}/`); const b = await r.text();
  const profil = r.status === 200 && (b.includes(esc(v.name)) || b.includes(v.name)) && !/Application error/.test(b) && b.includes(v.district);
  let arama = (await ara(v.name)).includes(v.slug), sube = false;
  if (!arama) { for (const x of [`${v.name} ${(v.neighborhood ?? "").replace(/ Mahallesi$/, "") || v.district}`, `${v.name} ${v.district}`]) if ((await ara(x)).includes(v.slug)) { arama = true; sube = true; break; } }
  res[v.slug] = { status: r.status, profil, arama, aramaSubeAdiyla: sube, sitemap: sm.includes(`/mekan/${v.slug}/`),
    b1Uyari: b.includes('data-location-precision="street"'), kesinKonumIddiasi: /map_action=pano(&amp;|&)viewpoint=/.test(b), osmAtfiKonumsuz: b.includes("Konum OpenStreetMap adres verisinden"),
    haritaYokMetni: b.includes("harita noktası henüz yok"), jsonLdGeo: b.includes("GeoCoordinates"), kapaliUyari: b.includes("data-kapanis"), boyut: b.length };
  if (++n % 100 === 0) console.log("ilerleme", n, "/", all.length); } }));
writeFileSync(out, JSON.stringify(res, null, 1)); const v = Object.values(res); const c = (f) => v.filter(f).length;
console.log(JSON.stringify({ kayit: v.length, profil200: c((x) => x.profil), arama: c((x) => x.arama), aramaSubeAdiyla: c((x) => x.aramaSubeAdiyla), sitemap: c((x) => x.sitemap), b1Uyari: c((x) => x.b1Uyari), kesinKonumIddiasi: c((x) => x.kesinKonumIddiasi), osmAtfiKonumsuz: c((x) => x.osmAtfiKonumsuz), jsonLdGeo: c((x) => x.jsonLdGeo), kapaliUyari: c((x) => x.kapaliUyari) }));
