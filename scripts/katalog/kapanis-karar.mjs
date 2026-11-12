/* KAPANIŞ İŞARETLERİ · KARAR — elle incelenmiş kanıt dosyasını (kapanis-elle-*.json) katalogdaki kimlikle birleştirir ve kuralları
   denetler. Kural ihlali varsa çıktı yazılmaz.
   - Her karar: tür (işletme kapanışı / şube kapanışı / isim değişikliği / taşınma / çelişkili kanıt / belirsiz), güven, kanıtlar
     (kaynak, bağlantı, tarih, güç) ve kimlik (ad, şube, adres, telefon, OSM öğesi; katalogdan).
   - Kesin kapanışa (closed_confirmed) götüren karar en az iki bağımsız kapanış sinyali ister; en az biri Google dışı ve güçlü olmalı.
     Tek bir Google ya da tek bir OSM sinyali yetmez.
   - Yeniden açık (reopened) kararı resmî kaynakta güçlü açık sinyali ister. İsim değişikliğinde yeni ad profile yazılmaz (ayrı karar).
   - "kural" satırları durum değiştirmez (not, kaynak, yeni şüphe); kesin kapanış denetimi durumu değiştiren kararlara uygulanır.
   - Mevcut 35 kesin kapanış, Google dışı ikinci kaynağa göre sınıflanır (bilgi; değişiklik üretmez).
   Kullanım: node scripts/katalog/kapanis-karar.mjs <kapanis-elle.json> <cikti.json> */
import { readFileSync, writeFileSync } from "node:fs";
const [elleP, out] = process.argv.slice(2);
const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const E = J(elleP), V = J("data/real/venues.json"), KAP = J("data/real/kapanis.json");
const bySlug = new Map(V.map((v) => [v.slug, v]));
const hata = [];
const GOOGLE = (k) => /^Google/.test(k.kaynak);
const kimlikOf = (s) => { const v = bySlug.get(s); if (!v) { hata.push(`${s}: katalogda yok`); return null; }
  const sube = /\b(şube|subesi)\b/i.test(v.name) ? v.name : null;
  return { ad: v.name, sube, ilce: v.district, adres: v.address ?? null, telefon: v.phone ?? null, osm: v.ref.startsWith("isletme/") ? null : `https://www.openstreetmap.org/${v.ref}`, kayitDurumu: KAP[s]?.state ?? "açık (kapanış kaydı yok)" }; };
const denetle = (s, x, sonuc) => {
  if (!x.tur) hata.push(`${s}: tür yok`); if (!["yüksek", "orta", "düşük"].includes(x.guven)) hata.push(`${s}: güven yok`);
  for (const k of x.kanitlar ?? []) {
    if (!k.kaynak || !/^\d{4}-\d\d-\d\d$/.test(k.tarih ?? "") || !["güçlü", "zayıf"].includes(k.guc) || !["kapanış", "açık", "isim", "taşınma", "kimlik"].includes(k.sinyal)) hata.push(`${s}: eksik kanıt alanı (${JSON.stringify(k).slice(0, 80)})`);
    if (!GOOGLE(k) && !/^https?:\/\//.test(k.url ?? "")) hata.push(`${s}: Google dışı kanıtta bağlantı yok (${k.kaynak})`);
    if (k.url && /google\.|goo\.gl/i.test(k.url)) hata.push(`${s}: Google bağlantısı kanıt olarak kullanılmış`);
  }
  const kap = (x.kanitlar ?? []).filter((k) => k.sinyal === "kapanış");
  if (sonuc === "closed_confirmed") {
    const kaynaklar = new Set(kap.map((k) => k.kaynak.replace(/ \(.*$/, "")));
    if (kaynaklar.size < 2 || !kap.some((k) => !GOOGLE(k) && k.guc === "güçlü")) hata.push(`${s}: kesin kapanış için iki bağımsız sinyal (biri Google dışı ve güçlü) yok`);
  }
  if (sonuc === "reopened" && !(x.kanitlar ?? []).some((k) => k.sinyal === "açık" && k.guc === "güçlü" && /Resmî/.test(k.kaynak))) hata.push(`${s}: yeniden açık için resmî güçlü açık sinyali yok`);
};
const kural = E.kural.map((x) => { denetle(x.slug, x, x.islem === "yeni-supheli" ? x.kayit.state : null); /* kural satırı durum değiştirmez */ return { ...x, kimlik: kimlikOf(x.slug) }; });
const sahip = E.sahip.map((x) => { denetle(x.slug, x, x.yama.state); if (!x.kimlikKaniti) hata.push(`${x.slug}: kimlik kanıtı yok`); return { ...x, kimlik: kimlikOf(x.slug) }; });
const kalsin = Object.fromEntries(Object.entries(E.kalsin).map(([s, x]) => { denetle(s, x, "closed_suspected"); return [s, { ...x, kimlik: kimlikOf(s) }]; }));
const acikIsaret = Object.fromEntries(Object.entries(E.acikIsaret).map(([s, x]) => { denetle(s, x, null); return [s, { ...x, kimlik: kimlikOf(s) }]; }));
/* kapsam: bütün şüpheli kayıtlar karar almalı */
const karar = new Set([...kural.map((x) => x.slug), ...sahip.map((x) => x.slug), ...Object.keys(kalsin)]);
for (const [s, r] of Object.entries(KAP)) if (!s.startsWith("_") && r.state === "closed_suspected" && !karar.has(s)) hata.push(`${s}: şüpheli kayıt karar almadı`);
/* mevcut kesin kapanışların Google dışı ikinci kaynağı (bilgi) */
const dokunulan = new Map([...kural, ...sahip].map((x) => [x.slug, x]));
const GUCLU2 = /Bağımsız kaynaklar|BTK kararı/; const ZAYIF2 = /varsayılan sayfa|ilgisiz bir yurt dışı|alan adı bırakılmış|yanıt vermiyor/;
const kesin = Object.entries(KAP).filter(([s, r]) => !s.startsWith("_") && r.state === "closed_confirmed").map(([s, r]) => {
  const x = dokunulan.get(s); const yeni = (x?.kanitlar ?? []).filter((k) => !GOOGLE(k));
  const sinif = yeni.some((k) => k.sinyal === "isim") ? "isim değişikliği ya da yeni işletme (ikinci kaynak sayılmadı)" : yeni.some((k) => k.sinyal === "açık" && k.guc === "güçlü") ? "çelişkili (güçlü)" : yeni.some((k) => k.sinyal === "açık") ? "çelişkili (zayıf)"
    : yeni.some((k) => k.guc === "güçlü") || GUCLU2.test(r.official) ? "Google dışı güçlü ikinci kaynak" : ZAYIF2.test(r.official) ? "Google dışı zayıf ikinci kaynak" : "yalnız Google (tek sinyal)";
  return { slug: s, ad: bySlug.get(s)?.name, ilce: bySlug.get(s)?.district, sinif, official: r.official, checkedAt: r.checkedAt };
});
if (hata.length) { console.error(hata.join("\n")); process.exit(1); }
const say = (a, f) => a.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});
/* sahip kararları: kapsamı üretilen listeden çözülür (karar metni değil, kayıt listesi saklanır) */
const sahipKararlari = (E.sahipKararlari ?? []).map((k) => {
  const kayit = /tek sinyal/.test(k.konu) ? kesin.filter((x) => x.sinif === "yalnız Google (tek sinyal)").map((x) => x.slug) : [];
  if (!kayit.length) hata.push(`sahip kararı kapsamı boş: ${k.konu}`);
  return { ...k, kayitSayisi: kayit.length, kayitlar: kayit };
});
if (hata.length) { console.error(hata.join("\n")); process.exit(1); }
const ozet = { kural: kural.length, sahip: sahip.length, kalsin: Object.keys(kalsin).length, acikIsaret: Object.keys(acikIsaret).length, tur: say([...kural, ...sahip, ...Object.values(kalsin)], (x) => x.tur.replace(/ \(.*$/, "")), kesinKapanis: say(kesin, (x) => x.sinif) };
writeFileSync(out, JSON.stringify({ _aciklama: `${E._aciklama} Bu dosya kapanis-karar.mjs çıktısıdır; data/real/kapanis.json'a kapanis-uygula.mjs yazar (sahip kararları yalnız --sahip ile).`, tarih: E.tarih, ozet, kural, sahip, kalsin, acikIsaret, kesinKapanis: kesin.map((x) => ({ ...x, sahipKarari: sahipKararlari.find((k) => k.kayitlar.includes(x.slug))?.karar ?? null })), sahipKararlari }, null, 1) + "\n");
console.log(JSON.stringify(ozet, null, 1));
