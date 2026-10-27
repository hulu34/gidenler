#!/usr/bin/env node
/* Gerçek mekân içe aktarımı (V8).
   Kullanım:  node scripts/import-osm.mjs                       → Overpass'tan çeker (ağ erişimi gerekir)
              node scripts/import-osm.mjs raw/*.json            → kayıtlı Overpass yanıtlarından ({district, elements})
              node scripts/import-osm.mjs --selected data/real/raw/*.jsonl → seçilmiş + Commons'ı çözülmüş kayıtlardan (yalnızca temizlik)
   Çıktı: data/real/venues.json — elle düzenlenmez. Kaynak: © OpenStreetMap katkıcıları (ODbL). */
import { readFileSync, writeFileSync } from "node:fs";
import { DISTRICT_QUOTAS, cleanVenues, overpassQuery, resolveCommons, selectVenues } from "./osm-select.mjs";

/** Kayıt başına bir satır: gözden geçirmesi ve fark (diff) okuması kolay. */
const toJsonLines = (list) => "[\n" + list.map((v) => JSON.stringify(v)).join(",\n") + "\n]\n";

const args = process.argv.slice(2);
const selectedMode = args[0] === "--selected";
const files = selectedMode ? args.slice(1) : args;
const results = [];
if (selectedMode) {
  const rows = files.flatMap((f) => readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
  const finals = cleanVenues(rows);
  writeFileSync(new URL("../data/real/venues.json", import.meta.url), toJsonLines(finals));
  console.error(`${finals.length} gerçek mekân yazıldı (seçilmiş kayıtlardan).`);
  process.exit(0);
}
if (files.length) {
  for (const f of files) results.push(JSON.parse(readFileSync(f, "utf8")));
} else {
  for (const district of Object.keys(DISTRICT_QUOTAS)) {
    const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: new URLSearchParams({ data: overpassQuery(district) }) });
    if (!r.ok) throw new Error(`Overpass ${district}: ${r.status}`);
    results.push({ district, elements: (await r.json()).elements });
    console.error(`${district}: ${results.at(-1).elements.length} öğe`);
    await new Promise((res) => setTimeout(res, 1500));
  }
}

const venues = selectVenues(results);
const finals = cleanVenues(await resolveCommons(venues));
writeFileSync(new URL("../data/real/venues.json", import.meta.url), toJsonLines(finals));
console.error(`${finals.length} gerçek mekân yazıldı (${finals.filter((v) => v.image).length} açık lisanslı fotoğraf).`);
