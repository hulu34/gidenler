/* FAALİYET KANITI · OSM GÜNCEL DURUM — katalogdaki tarihli faaliyet kanıtı olmayan kayıtların (dalga 0–1) OSM öğesinin
   bugünkü sürümü ve bu sürümü oluşturan değişiklik kümesi. Paket kurallarındaki E2 (yerinde kontrol tarihi) ve E3 (yerinde
   anket uygulaması) kanıtları ile kapanma işaretleri (silinmiş öğe, disused:/was: önekleri, amenity değişimi) buradan çıkar.
   OSM API toplu uç noktaları; 100'erli istek, saniyede en çok 1 istek. Yalnız etiketler ve sürüm bilgisi saklanır.
   Kullanım: node scripts/katalog/faaliyet-osm.mjs <cikti.json> */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const [out] = process.argv.slice(2);
const V = JSON.parse(readFileSync("data/real/venues.json", "utf8"));
const hedef = V.filter((v) => (v.wave ?? 0) <= 1 && !v.verifiedAt);
const R = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : { ogeler: {}, changeset: {} };
const UA = { "user-agent": "gidenler-katalog/1.0 (+https://www.gidenler.com/)" };
const bekle = () => new Promise((z) => setTimeout(z, 1200));
async function al(url) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
  return { status: r.status, j: r.ok ? await r.json() : null };
}
const yaz = (e) => { R.ogeler[`${e.type}/${e.id}`] = { visible: e.visible !== false, version: e.version, timestamp: e.timestamp, changeset: e.changeset, tags: e.tags ?? {} }; };
for (const tur of ["node", "way", "relation"]) {
  const ids = hedef.map((v) => v.ref).filter((r) => r.startsWith(tur + "/") && !R.ogeler[r]).map((r) => r.split("/")[1]);
  for (let i = 0; i < ids.length; i += 100) {
    const parca = ids.slice(i, i + 100);
    const { status, j } = await al(`https://api.openstreetmap.org/api/0.6/${tur}s.json?${tur}s=${parca.join(",")}`); await bekle();
    if (j) { for (const e of j.elements) yaz(e); continue; }
    /* toplu istekte bir öğe yoksa (404) tek tek */
    console.log(tur, "toplu", status, "→ tek tek", parca.length);
    for (const id of parca) {
      const t = await al(`https://api.openstreetmap.org/api/0.6/${tur}/${id}.json`); await bekle();
      if (t.j) yaz(t.j.elements[0]); else R.ogeler[`${tur}/${id}`] = { visible: false, status: t.status };
    }
  }
}
const cs = [...new Set(Object.values(R.ogeler).filter((o) => o.timestamp >= "2025" && o.changeset && !R.changeset[o.changeset]).map((o) => o.changeset))];
for (let i = 0; i < cs.length; i += 100) {
  const { j } = await al(`https://api.openstreetmap.org/api/0.6/changesets.json?changesets=${cs.slice(i, i + 100).join(",")}`); await bekle();
  for (const c of j?.changesets ?? []) R.changeset[c.id] = { tarih: c.created_at?.slice(0, 10), uygulama: c.tags?.created_by ?? null, kaynak: c.tags?.source ?? null };
}
R.tarih = new Date().toISOString().slice(0, 10);
writeFileSync(out, JSON.stringify(R));
const O = Object.values(R.ogeler);
console.log({ hedef: hedef.length, oge: O.length, silinmis: O.filter((o) => !o.visible).length, surum2025: O.filter((o) => o.timestamp >= "2025").length, changeset: Object.keys(R.changeset).length });
