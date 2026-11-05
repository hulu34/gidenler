/* İlk Excel: venues.json + mevcut Google eşleşme kayıtları (yalnız okuma raporundan) → gidenler-mekan-puanlari.xlsx
   Kullanım: KIMLIK=<kimlik.json> CIKTI=<dosya.xlsx> [ONCEKI=<eski.xlsx>] npx tsx scripts/gpuan-excel.ts
   Önceki dosya verilirse satırlar onunla karşılaştırılır (yeni mekân eklenir, kaldırılan işaretlenir); Google'a istek atmaz. */
import { readFileSync, writeFileSync } from "node:fs";
import { reconcile, summarize, type GoogleId } from "../lib/gpuan/core";
import { readWorkbook, writeWorkbook } from "../lib/gpuan/excel";
import { sheetVenues } from "../lib/gpuan/venues";

async function main() {
const kimlik = JSON.parse(readFileSync(process.env.KIMLIK!, "utf8")) as Array<{ slug: string; google?: GoogleId[] }>;
const ids = new Map(kimlik.map((k) => [k.slug, k.google ?? []]));
const venues = sheetVenues();
const prev = process.env.ONCEKI ? await readWorkbook(readFileSync(process.env.ONCEKI)) : null;
const { rows, added, removed, changed } = reconcile(prev?.rows ?? [], venues, ids);
const buf = await writeWorkbook(rows, { generatedAt: new Date().toISOString(), note: "İlk oluşturma: Google puanı henüz okunmadı; puan sütunları ilk başarılı kontrolde dolar." }, prev?.changes ?? []);
writeFileSync(process.env.CIKTI!, buf);
console.log(JSON.stringify({ venues: venues.length, rows: rows.length, added: added.length, removed: removed.length, changed: changed.length, summary: summarize(rows) }, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
