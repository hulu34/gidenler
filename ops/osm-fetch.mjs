import { writeFileSync, existsSync } from "node:fs";
const overpassQuery = (d) => `[out:json][timeout:120];area["boundary"="administrative"]["admin_level"="6"]["name"="${d}"]->.a;nwr["amenity"="restaurant"]["name"](area.a);out tags center;`;
const EP = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
const D = ["Adalar","Arnavutköy","Ataşehir","Avcılar","Bağcılar","Bahçelievler","Bakırköy","Başakşehir","Bayrampaşa","Beşiktaş","Beykoz","Beylikdüzü","Beyoğlu","Büyükçekmece","Çatalca","Çekmeköy","Esenler","Esenyurt","Eyüpsultan","Fatih","Gaziosmanpaşa","Güngören","Kadıköy","Kağıthane","Kartal","Küçükçekmece","Maltepe","Pendik","Sancaktepe","Sarıyer","Silivri","Sultanbeyli","Sultangazi","Şile","Şişli","Tuzla","Ümraniye","Üsküdar","Zeytinburnu"];
const out = process.argv[2];
for (const d of D) {
  const f = `${out}/${d}.json`; if (existsSync(f)) continue;
  for (let a = 0; a < 6; a++) {
    let r; try { r = await fetch(EP[a % EP.length], { method: "POST", headers: { "user-agent": "gidenler-osm-import/1.0" }, body: new URLSearchParams({ data: overpassQuery(d) }), signal: AbortSignal.timeout(150000) }); } catch (e) { console.log(d, "hata", String(e).slice(0, 60)); await new Promise((x) => setTimeout(x, 10000)); continue; }
    if (r.ok) { const j = await r.json(); writeFileSync(f, JSON.stringify({ district: d, elements: j.elements })); console.log(d, j.elements.length); break; }
    console.log(d, "http", r.status); await new Promise((x) => setTimeout(x, 30000));
  }
  await new Promise((x) => setTimeout(x, 6000));
}
