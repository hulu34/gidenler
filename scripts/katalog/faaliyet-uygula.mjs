/* FAALİYET KANITI · UYGULAMA — faaliyet-karar.mjs çıktısındaki "uygulanan" satırların verifiedAt, confidence ve verification
   alanlarını data/real/venues.json'daki kayda yazar. Yalnız bu üç alan eklenir; başka alan, sıra ya da satır değişmez
   (dosya satır başına bir kayıttır, yalnız hedef satırlar yeniden yazılır). Zaten verifiedAt'i olan, kapanış kaydı bulunan ya da
   bulunamayan kayıt atlanır ve raporlanır. Varsayılan kip yalnız denetimdir; dosyaya --yaz ile yazılır.
   Yayın kararı ve uygulama Codex'in yayın paketindedir; Production veritabanına bir şey yazmaz.
   Kullanım: node scripts/katalog/faaliyet-uygula.mjs <faaliyet-kaniti.json> [--yaz] */
import { readFileSync, writeFileSync } from "node:fs";
const [kp, bayrak] = process.argv.slice(2);
const K = JSON.parse(readFileSync(kp, "utf8"));
const KAP = JSON.parse(readFileSync("data/real/kapanis.json", "utf8"));
const P = "data/real/venues.json"; const satirlar = readFileSync(P, "utf8").split("\n");
const hedef = new Map(K.uygulanan.map((x) => [x.slug, x.alanlar]));
const rapor = { yazilacak: 0, zatenKanitli: [], kapanisKaydi: [], bulunamadi: [] }; const gorulen = new Set();
for (let i = 0; i < satirlar.length; i++) {
  const m = /^(\{.*\})(,?)$/.exec(satirlar[i]); if (!m) continue;
  const r = JSON.parse(m[1]); const a = hedef.get(r.slug); if (!a) continue; gorulen.add(r.slug);
  if (r.verifiedAt) { rapor.zatenKanitli.push(r.slug); continue; }
  if (["closed_confirmed", "closed_suspected"].includes(KAP[r.slug]?.state)) { rapor.kapanisKaydi.push(r.slug); continue; }
  satirlar[i] = JSON.stringify({ ...r, ...a }) + m[2]; rapor.yazilacak++;
}
for (const s of hedef.keys()) if (!gorulen.has(s)) rapor.bulunamadi.push(s);
if (bayrak === "--yaz") writeFileSync(P, satirlar.join("\n"));
console.log(JSON.stringify({ kip: bayrak === "--yaz" ? "yazıldı" : "yalnız denetim", ...rapor }, null, 1));
