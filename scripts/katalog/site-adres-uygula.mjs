/* RESMÎ SİTE ADRESİ UYGULAMA — data/katalog/gece-13/site-adres.json içinde sahibin onayladığı (elle.sonuc === "onaylandı")
   adresleri data/real/venues.json'a yazar. Yalnız address (ve kayıtta yoksa neighborhood) alanı değişir; koordinat, ad, tür,
   telefon ve diğer alanlara dokunulmaz. Dosya biçimi (satır başına bir kayıt) korunur. Tekrar çalıştırmak değişiklik yapmaz.
   Varsayılan kuru çalıştırmadır; yazmak için --yaz.
   Kullanım: node scripts/katalog/site-adres-uygula.mjs [--yaz] */
import { readFileSync, writeFileSync } from "node:fs";
const P = "data/real/venues.json", K = "data/katalog/gece-13/site-adres.json";
const yaz = process.argv.includes("--yaz");
const kayit = JSON.parse(readFileSync(K, "utf8")).kayitlar;
const onay = Object.entries(kayit).filter(([, x]) => x.elle?.sonuc === "onaylandı");
const lines = readFileSync(P, "utf8").split("\n");
const order = (o, after, key, val) => { const out = {}; let put = false; for (const [k, v] of Object.entries(o)) { out[k] = v; if (k === after && !(key in o)) { out[key] = val; put = true; } } if (!put && !(key in o)) out[key] = val; return out; };
const rapor = [];
for (const [slug, x] of onay) {
  const i = lines.findIndex((l) => l.includes(`"slug":"${slug}"`));
  if (i < 0) { rapor.push({ slug, sonuc: "kayıt yok" }); continue; }
  const comma = lines[i].endsWith(",");
  let r = JSON.parse(comma ? lines[i].slice(0, -1) : lines[i]);
  const { adres, mahalle } = x.elle.uygulanan;
  if (r.address === adres && (!mahalle || r.neighborhood)) { rapor.push({ slug, sonuc: "zaten uygulanmış" }); continue; }
  const once = r.address ?? null;
  if (mahalle && !r.neighborhood) r = order(r, "district", "neighborhood", mahalle);
  if ("address" in r) r.address = adres; else r = order(r, "lng", "address", adres);
  lines[i] = JSON.stringify(r) + (comma ? "," : "");
  rapor.push({ slug, sonuc: yaz ? "yazıldı" : "yazılacak (kuru)", once, sonra: adres });
}
if (yaz) writeFileSync(P, lines.join("\n"));
console.log(JSON.stringify(rapor, null, 1));
