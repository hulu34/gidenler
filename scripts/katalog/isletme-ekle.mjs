/* İşletme kaydı paketini (isletme-kayitlari.json) data/real/isletme.json'a ekler: yalnız ekleme, mevcut kayıtlar aynen.
   Kullanım: node scripts/katalog/isletme-ekle.mjs data/paket/istanbul-9/isletme-kayitlari.json */
import { readFileSync, writeFileSync } from "node:fs";
const [pp] = process.argv.slice(2);
const I = JSON.parse(readFileSync("data/real/isletme.json", "utf8")), P = JSON.parse(readFileSync(pp, "utf8"));
const V = JSON.parse(readFileSync("data/real/venues.json", "utf8"));
const slugs = new Set([...I, ...V].map((v) => v.slug));
if (P.some((v) => slugs.has(v.slug) || !v.ref.startsWith("isletme/"))) { console.error("çakışan ya da geçersiz kayıt; eklenmedi"); process.exit(1); }
writeFileSync("data/real/isletme.json", "[\n" + [...I, ...P].map((v) => JSON.stringify(v)).join(",\n") + "\n]\n");
console.log(`işletme ${I.length} + ${P.length} = ${I.length + P.length}`);
