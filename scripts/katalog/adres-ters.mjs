/* ADRES TAMAMLAMA (OSM içi): kanıtlı ama OSM kaydında sokak/kapı numarası olmayan adaylar için OSM'nin kendi ters konum
   servisi (Nominatim, ODbL). Yalnız noktanın üstünde durduğu binanın/adres noktasının adresi alınır (zoom=18, house_number).
   Kural: saniyede en çok 1 istek, tanıtıcı User-Agent, önbellek. Google adresi KULLANILMAZ.
   Kullanım: node scripts/katalog/adres-ters.mjs <havuz.json> <site-kanit.json> <onbellek.json> */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const [hp, kp, cp] = process.argv.slice(2);
const H = JSON.parse(readFileSync(hp, "utf8")), K = JSON.parse(readFileSync(kp, "utf8"));
const C = existsSync(cp) ? JSON.parse(readFileSync(cp, "utf8")) : {};
const ok = (a) => { const o = K[a.ref]?.olcum; return (o?.ad && (o.sokak || o.telefon || o.ilce || o.mahalle)) || (a.checkDate && a.checkDate >= "2025-01"); };
const todo = H.adaylar.filter((a) => !a.esles && !a.ret.length && !(a.street && a.housenumber) && ok(a) && !C[a.ref]);
console.log("ters konum:", todo.length);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
for (const a of todo) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${a.lat}&lon=${a.lng}&zoom=18&addressdetails=1&accept-language=tr`, { headers: { "user-agent": "gidenler-katalog-adres/1.0 (+https://www.gidenler.com/)" }, signal: AbortSignal.timeout(15000) });
    const j = await r.json();
    const ad = j.address ?? {};
    C[a.ref] = { tarih: new Date().toISOString().slice(0, 10), road: ad.road ?? null, house_number: ad.house_number ?? null, suburb: ad.suburb ?? ad.quarter ?? ad.neighbourhood ?? null, osm: j.osm_type ? `${j.osm_type}/${j.osm_id}` : null, cls: j.category ?? j.class ?? null, type: j.type ?? null };
  } catch (e) { C[a.ref] = { hata: String(e.name ?? e) }; }
  if (++n % 25 === 0) { writeFileSync(cp, JSON.stringify(C)); console.log(n); }
  await wait(1100);
}
writeFileSync(cp, JSON.stringify(C));
const v = Object.values(C); console.log({ toplam: v.length, sokak: v.filter((x) => x.road).length, kapi: v.filter((x) => x.house_number).length });
