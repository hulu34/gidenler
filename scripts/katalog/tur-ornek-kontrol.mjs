/* TÜR VE KATEGORİ · ÖRNEKLEM KONTROLÜ — kararlardan sabit tohumla seçilen 8 OSM türü, 4 site tanımı ve 3 kategori kararı,
   karar betiğinin ölçüm dosyaları kullanılmadan yeniden denetlenir: OSM tek öğe API'si ve kaynak sayfanın ham HTML'i. Görsel inceleme değildir.
   Kullanım: node scripts/katalog/tur-ornek-kontrol.mjs <cikti.json> */
import { readFileSync, writeFileSync } from "node:fs";
const K = JSON.parse(readFileSync("data/katalog/tur/tur-kategori-2026-11-12.json", "utf8"));
const V = new Map(JSON.parse(readFileSync("data/real/venues.json", "utf8")).map((v) => [v.slug, v]));
let seed = 20261112; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = (arr, n) => { const a = [...arr]; const o = []; while (o.length < n && a.length) o.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return o; };
const osm = K.tur.filter((x) => x.kaynak === "OSM"), site = K.tur.filter((x) => x.kaynak !== "OSM");
const sec = [...pick(osm, 8), ...pick(site, 4), ...pick(K.kategori, 3)];
const fold = (s) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\s+/g, " ");
const sonuc = [];
for (const x of sec) {
  const v = V.get(x.slug); await new Promise((z) => setTimeout(z, 1200));
  if (x.kaynak === "resmî site") {
    const u = x.alanlar.sourceUrl; const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (compatible; GidenlerKatalog/1.0)" } }); const h = await r.text();
    const ifade = /"([^"]+)"$/.exec(x.kanit)[1];
    const dec = h.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&");
    sonuc.push({ slug: x.slug, tur: "site", yeni: x.yeni, url: u, status: r.status, gecti: fold(dec).includes(fold(ifade)) });
  } else {
    const [t, id] = v.ref.split("/"); const r = await fetch(`https://api.openstreetmap.org/api/0.6/${t}/${id}.json`, { headers: { "user-agent": "gidenler-katalog/1.0" } }); const e = (await r.json()).elements[0];
    const beklenen = x.yeni === "cat.cafe" ? e.tags.amenity === "cafe" : x.yeni === "Pub" ? e.tags.amenity === "pub" : !!e.tags.cuisine && x.kanit.includes(`cuisine=${e.tags.cuisine}`);
    sonuc.push({ slug: x.slug, tur: x.yeni === "cat.cafe" ? "kategori/OSM" : "OSM", yeni: x.yeni, osm: { amenity: e.tags.amenity, cuisine: e.tags.cuisine, name: e.tags.name }, gecti: beklenen && e.tags.name === v.name || (beklenen && !!e.tags.name) });
  }
}
writeFileSync(process.argv[2], JSON.stringify(sonuc, null, 1));
for (const s of sonuc) console.log(s.gecti ? "Geçti " : "KALDI ", s.tur, s.slug, "→", s.yeni, s.osm ? JSON.stringify(s.osm) : s.status);
