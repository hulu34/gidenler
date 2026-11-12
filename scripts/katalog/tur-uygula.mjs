/* TÜR VE KATEGORİ · UYGULAMA — tur-karar.mjs çıktısını yazar. Varsayılan kip yalnız denetimdir; dosyalara --yaz ile yazılır.
   - Tür: data/real/duzeltmeler.json'a kind + sourceUrl + why (mevcut tür düzeltme biçimi; data/real/index.ts gösterimde uygular).
     Kayıtta yalnız site düzeltmesi varsa onun alanları ve checkedAt'i korunur; kontrol tarihi why metnindedir.
     Kayıtta zaten elle tür düzeltmesi varsa dokunulmaz.
   - Kategori: data/real/venues.json'da yalnız o kaydın categoryId alanı (satır başına bir kayıt; başka satır ve alan değişmez).
   Kayıt bulunamaz, türü artık genel değil ya da kategorisi beklenen değilse atlanır ve raporlanır.
   Yayın kararı ve uygulama Codex'in yayın paketindedir; Production veritabanına bir şey yazmaz.
   Kullanım: node scripts/katalog/tur-uygula.mjs <tur-kategori.json> [--yaz] */
import { readFileSync, writeFileSync } from "node:fs";
const [kp, bayrak] = process.argv.slice(2);
const K = JSON.parse(readFileSync(kp, "utf8"));
const FP = "data/real/duzeltmeler.json", VP = "data/real/venues.json";
const FIX = JSON.parse(readFileSync(FP, "utf8"));
const satirlar = readFileSync(VP, "utf8").split("\n");
const GENERIC = new Set(["Restoran", "Kafe", "Bar"]);
const rapor = { tur: 0, turYeniKayit: 0, turMevcutKayit: 0, kategori: 0, atlanan: [] };
const kayit = new Map(); for (const s of satirlar) { const m = /^(\{.*\}),?$/.exec(s); if (m) { const r = JSON.parse(m[1]); kayit.set(r.slug, r); } }
for (const x of K.tur) {
  const r = kayit.get(x.slug); const f = FIX[x.slug];
  if (!r) { rapor.atlanan.push(`${x.slug}: katalogda yok`); continue; }
  if (f?.kind) { rapor.atlanan.push(`${x.slug}: zaten elle tür düzeltmesi var`); continue; }
  if (!GENERIC.has(r.kind) || r.kind !== x.tur) { rapor.atlanan.push(`${x.slug}: tür artık "${r.kind}" (beklenen ${x.tur})`); continue; }
  if (f) { FIX[x.slug] = { kind: x.alanlar.kind, sourceUrl: x.alanlar.sourceUrl, why: x.alanlar.why, ...f }; rapor.turMevcutKayit++; }
  else { FIX[x.slug] = { kind: x.alanlar.kind, sourceUrl: x.alanlar.sourceUrl, checkedAt: K.tarih, why: x.alanlar.why }; rapor.turYeniKayit++; }
  rapor.tur++;
}
const kat = new Map(K.kategori.map((x) => [x.slug, x]));
for (let i = 0; i < satirlar.length; i++) {
  const m = /^(\{.*\})(,?)$/.exec(satirlar[i]); if (!m) continue;
  const r = JSON.parse(m[1]); const x = kat.get(r.slug); if (!x) continue;
  if (r.categoryId !== x.kategori) { rapor.atlanan.push(`${r.slug}: kategori artık ${r.categoryId} (beklenen ${x.kategori})`); kat.delete(r.slug); continue; }
  satirlar[i] = JSON.stringify({ ...r, categoryId: x.alanlar.categoryId }) + m[2]; rapor.kategori++; kat.delete(r.slug);
}
for (const s of kat.keys()) rapor.atlanan.push(`${s}: katalogda yok`);
if (bayrak === "--yaz") { writeFileSync(FP, JSON.stringify(FIX, null, 1)); writeFileSync(VP, satirlar.join("\n")); }
console.log(JSON.stringify({ kip: bayrak === "--yaz" ? "yazıldı" : "yalnız denetim", ...rapor }, null, 1));
