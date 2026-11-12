/* Faaliyet kanıtı paketi testi: kanıt dosyası paket kurallarına uyuyor mu, uygulama yalnız üç alanı ekliyor mu.
   Kullanım: npx tsx scripts/faaliyettest.ts [data/katalog/faaliyet/faaliyet-kaniti-2026-11-12.json] */
import { readFileSync } from "node:fs";
const kp = process.argv[2] ?? "data/katalog/faaliyet/faaliyet-kaniti-2026-11-12.json";
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const K = J(kp), V = J("data/real/venues.json") as Record<string, any>[], KAP = J("data/real/kapanis.json");
const bySlug = new Map(V.map((v) => [v.slug, v]));
let ok = 0, fail = 0; const t = (ad: string, kosul: boolean, not = "") => { if (kosul) ok++; else { fail++; console.log("KALDI:", ad, not); } };
const GUCLU = /^(resmî site \(\d{4}-\d\d-\d\d\): ad \+ (sokak|telefon|sokak \+ telefon) eşleşti|resmî şube sayfası \(\d{4}-\d\d-\d\d\): ad \+ sokak \+ ilçe\/mahalle aynı bölümde( \+ telefon)?|OSM yerinde kontrol tarihi (202[5-9]|20[3-9]\d)-\d\d(-\d\d)?|OSM son düzenleme yerinde anket uygulamasıyla \((StreetComplete|Every)[^,]*, (202[5-9]|20[3-9]\d)-\d\d-\d\d, changeset \d+\))$/;
const hedef = V.filter((v) => (v.wave ?? 0) <= 1 && !v.verifiedAt);
t("kapsam: dalga 0–1 ve verifiedAt'siz kayıtların hepsi", K.uygulanan.length + K.uygulanmayan.length === hedef.length, `${K.uygulanan.length}+${K.uygulanmayan.length} ≠ ${hedef.length}`);
const tum = [...K.uygulanan, ...K.uygulanmayan].map((x: any) => x.slug);
t("her kayıt bir kez", new Set(tum).size === tum.length);
for (const x of K.uygulanan) {
  const v = bySlug.get(x.slug);
  t(`${x.slug}: katalogda`, !!v);
  t(`${x.slug}: henüz kanıtsız`, !v?.verifiedAt);
  t(`${x.slug}: kapanış kaydı yok`, !["closed_confirmed", "closed_suspected"].includes(KAP[x.slug]?.state));
  t(`${x.slug}: yalnız üç alan`, JSON.stringify(Object.keys(x.alanlar).sort()) === JSON.stringify(["confidence", "verification", "verifiedAt"]));
  t(`${x.slug}: güçlü kanıt biçimi`, x.kanit.length > 0 && x.kanit.every((k: string) => GUCLU.test(k)), x.kanit.join(" · "));
  t(`${x.slug}: verification = kanıtlar`, x.alanlar.verification === x.kanit.join(" · ") && x.alanlar.confidence === "güçlü" && /^\d{4}-\d\d-\d\d$/.test(x.alanlar.verifiedAt));
  t(`${x.slug}: zayıf kanıt sayılmadı`, !x.kanit.some((k: string) => /mobil|ad \+ (ilçe|mahalle)$/.test(k)));
  t(`${x.slug}: Google yok`, !/google/i.test(JSON.stringify(x)));
}
for (const x of K.uygulanmayan) t(`${x.slug}: uygulanmayanın alanı yok`, !("alanlar" in x));
/* uygulama benzetimi: yalnız hedef satırlar ve yalnız üç alan değişir */
const once = readFileSync("data/real/venues.json", "utf8").split("\n"); const map = new Map(K.uygulanan.map((x: any) => [x.slug, x.alanlar]));
let degisen = 0;
for (const satir of once) { const m = /^(\{.*\}),?$/.exec(satir); if (!m) continue; const r = JSON.parse(m[1]); const a = map.get(r.slug); if (!a) continue; const yeni = { ...r, ...a };
  degisen++; t(`${r.slug}: diğer alanlar aynı`, Object.keys(r).every((k) => JSON.stringify(r[k]) === JSON.stringify((yeni as any)[k]))); }
t("uygulanacak satır sayısı", degisen === K.uygulanan.length, `${degisen}`);
console.log(`faaliyet: ${ok} geçti, ${fail} kaldı`); process.exit(fail ? 1 : 0);
