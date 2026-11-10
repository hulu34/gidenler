/* ADIM 10: test edilmiş paketi kataloğa ekler (yalnız ekleme; mevcut kayıtlar değişmez, sıra korunur).
   Kullanım: node scripts/katalog/pakete-ekle.mjs data/paket/istanbul-6/venues-dalga6.json */
import { readFileSync, writeFileSync } from "node:fs";
const [pp] = process.argv.slice(2);
const V = JSON.parse(readFileSync("data/real/venues.json", "utf8"));
const P = JSON.parse(readFileSync(pp, "utf8"));
const refs = new Set(V.map((v) => v.ref)), slugs = new Set(V.map((v) => v.slug));
const add = P.filter((v) => !refs.has(v.ref) && !slugs.has(v.slug));
if (add.length !== P.length) { console.error("çakışan kayıt var, eklenmedi:", P.length - add.length); process.exit(1); }
const out = [...V, ...add];
/* biçim: mevcut dosyayla aynı (kayıt başına bir satır) */
writeFileSync("data/real/venues.json", "[\n" + out.map((v) => JSON.stringify(v)).join(",\n") + "\n]\n");
console.log(`${V.length} + ${add.length} = ${out.length}`);
