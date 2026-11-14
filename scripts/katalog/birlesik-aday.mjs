/* BİRLEŞİK ADAY DENETİMİ — açık paket PR'larındaki (paket 15–23, seyrek paket) yeni kayıtları güncel Production kataloğuna
   ve birbirlerine karşı yeniden denetler. Hiçbir paketi ya da katalog dosyasını değiştirmez.
   Kesin mükerrer: aynı slug, aynı OSM ref / osmRef. Güçlü şüphe: aynı ad 150 m, benzer ad yakın, yazım farkı yakın, aynı bina adresi
   (lib/katalog/aday.ts matchExisting) ya da koordinatsız kayıtta aynı ad + ilçe + (telefon | adres). Bilgi: aynı telefon ya da aynı site
   alanı ama farklı adres (zincir şubesi olabilir; mükerrer sayılmaz). Kapanış kaydı olan slug elenir.
   Sınıflar karıştırılmaz: A (koordinatlı, kapı numaralı), A-konumsuz (işletme kaydı, koordinat yok), B1 (sokak düzeyi).
   Sahip kararı (data/katalog/gece-13/sahip-kararlari.json, "ayri_isletme"): yalnız adı geçen iki slug arasındaki güçlü şüpheyi kaldırır;
   kesin mükerrer ve kapanış kontrolleri her zaman geçerlidir. Kabul satırına sahipKarari yazılır.
   Kullanım: node scripts/katalog/birlesik-aday.mjs <paket-ref> <cikti.json> */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fold, coreName, matchExisting, phoneKey, siteKey, addressKey } from "../../lib/katalog/aday.ts";
const [ref, out] = process.argv.slice(2);
const git = (p, r = ref) => { try { return JSON.parse(execFileSync("git", ["show", `${r}:${p}`], { encoding: "utf8", maxBuffer: 64 << 20 })); } catch { return null; } };
const V = JSON.parse(readFileSync("data/real/venues.json", "utf8")), I = JSON.parse(readFileSync("data/real/isletme.json", "utf8"));
const KAP = JSON.parse(readFileSync("data/real/kapanis.json", "utf8"));
const prod = [...V, ...I];
const SK = (() => { try { return JSON.parse(readFileSync("data/katalog/gece-13/sahip-kararlari.json", "utf8")).kararlar; } catch { return []; } })();
const ayri = (a, b) => SK.find((k) => k.karar === "ayri_isletme" && ((k.slug === a && k.karsi === b) || (k.slug === b && k.karsi === a)));
const sinif = (r) => r.ref.startsWith("isletme/") ? (typeof r.lat === "number" ? "A (işletme, OSM konumlu)" : "A-konumsuz") : r.kaliteSinifi === "B1" || r.adresDuzeyi === "sokak" ? "B1" : "A";
const mevcut = (r) => ({ slug: r.slug, ref: r.ref, osmRef: r.osmRef, name: r.name, district: r.district, lat: r.lat, lng: r.lng, phone: r.phone, website: r.website, address: r.address });
const paketler = [];
const SON = Number(process.env.SON_PAKET ?? 23);
for (let n = 15; n <= SON; n++) { const k = git(`data/paket/istanbul-${n}/kayitlar.json`) ?? [], b = git(`data/paket/istanbul-${n}/isletme-kayitlari.json`) ?? []; paketler.push({ ad: `paket ${n}`, pr: ({ 15: 15, 16: 19, 17: 20, 18: 21, 19: 23, 20: 24, 21: 26, 22: 30, 23: 31 }[n] ?? null), kayitlar: [...k, ...b] }); }
const kabul = [], ret = [], bilgi = [];
const havuz = prod.map(mevcut);
for (const p of paketler) for (const r of p.kayitlar) {
  const satir = { paket: p.ad, pr: p.pr, slug: r.slug, ad: r.name, ilce: r.district, sinif: sinif(r), tur: r.kind, kategori: r.categoryId, kanit: (r.verification ?? "").slice(0, 160) };
  const kesin = havuz.find((m) => m.slug === r.slug || m.ref === r.ref || (r.osmRef && (m.ref === r.osmRef || m.osmRef === r.osmRef)));
  if (kesin) { ret.push({ ...satir, neden: `kesin mükerrer: ${kesin.slug} (${kesin.slug === r.slug ? "aynı slug" : "aynı OSM kaydı"})`, kaynakta: prod.some((x) => x.slug === kesin.slug) ? "Production" : "önceki paket" }); continue; }
  if (KAP[r.slug] && ["closed_confirmed", "closed_suspected"].includes(KAP[r.slug].state)) { ret.push({ ...satir, neden: `kapanış kaydı (${KAP[r.slug].state})` }); continue; }
  let supheli = null, supheliSlug = null;
  if (typeof r.lat === "number") {
    const e = matchExisting({ ref: r.ref, name: r.name, lat: r.lat, lng: r.lng, phone: undefined, website: undefined, street: /^(.+?)\s+No\b/i.exec(r.address ?? "")?.[1], housenumber: /No\s*[:.]?\s*(\d+)/i.exec(r.address ?? "")?.[1] }, havuz);
    if (e) { supheli = `${e.neden}${e.m != null ? ` ${e.m} m` : ""}: ${e.slug}`; supheliSlug = e.slug; }
  } else {
    const ak = addressKey(undefined, undefined, r.address);
    const m = havuz.find((x) => x.district === r.district && (coreName(x.name) === coreName(r.name) || fold(x.name) === fold(r.name)) && ((phoneKey(x.phone) && phoneKey(x.phone) === phoneKey(r.phone)) || (ak && ak === addressKey(undefined, undefined, x.address))));
    if (m) { supheli = `koordinatsız: aynı ad + ilçe + ${phoneKey(m.phone) === phoneKey(r.phone) ? "telefon" : "adres"}: ${m.slug}`; supheliSlug = m.slug; }
  }
  const karar = supheli && ayri(r.slug, supheliSlug);
  if (karar) { satir.sahipKarari = `${karar.karar} (${karar.tarih}, ${karar.veren}): ${supheli}`; bilgi.push({ ...satir, not: `sahip kararı: ${supheliSlug} ile ayrı işletme — ${karar.not}` }); supheli = null; }
  if (supheli) { ret.push({ ...satir, neden: `güçlü mükerrer şüphesi — ${supheli}`, kaynakta: prod.some((x) => supheli.endsWith(x.slug)) ? "Production" : "önceki paket" }); continue; }
  const tel = phoneKey(r.phone) && havuz.find((x) => phoneKey(x.phone) === phoneKey(r.phone));
  const site = siteKey(r.website) && havuz.filter((x) => siteKey(x.website) === siteKey(r.website)).length;
  if (tel) bilgi.push({ ...satir, not: `aynı telefon: ${tel.slug} (farklı adres/konum — zincir ya da merkez numarası olabilir)` });
  if (site) bilgi.push({ ...satir, not: `aynı site alanı ${siteKey(r.website)}: ${site} kayıt (zincir şubesi)` });
  kabul.push(satir); havuz.push(mevcut(r));
}
const say = (a, f) => a.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});
const ozet = {
  taban: { ref: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), mekan: prod.length, sinif: say(prod, sinif) },
  paketRef: execFileSync("git", ["rev-parse", ref], { encoding: "utf8" }).trim(),
  paketBasina: paketler.map((p) => ({ paket: p.ad, pr: p.pr, kayit: p.kayitlar.length, gecerli: kabul.filter((x) => x.paket === p.ad).length, elenen: ret.filter((x) => x.paket === p.ad).length })),
  gecerliYeni: kabul.length, elenen: ret.length, elenenNeden: say(ret, (x) => x.neden.replace(/[:—].*$/, "").trim()),
  sinif: say(kabul, (x) => x.sinif), kategori: say(kabul, (x) => x.kategori), ilce: say(kabul, (x) => x.ilce),
  sahipKarariyla: kabul.filter((x) => x.sahipKarari).map((x) => x.slug),
  hedefSonrasi: prod.length + kabul.length,
};
writeFileSync(out, JSON.stringify({ _aciklama: `Açık paket PR'larının ve yerel paketlerin (paket 15–${SON}) güncel Production'a ve birbirlerine karşı birleşik denetimi. Paket dosyaları değiştirilmedi; yayın kararı ve sırası Codex'te.`, ozet, kabul, ret, bilgi }, null, 1) + "\n");
console.log(JSON.stringify(ozet, null, 1));
