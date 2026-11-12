/* Tür ve kategori paketi testi: kararlar paket kurallarına uyuyor mu, uygulama yalnız izin verilen alanları değiştiriyor mu.
   Kullanım: npx tsx scripts/turtest.ts [data/katalog/tur/tur-kategori-2026-11-12.json] */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, cpSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const kp = process.argv[2] ?? "data/katalog/tur/tur-kategori-2026-11-12.json";
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const K = J(kp), V = J("data/real/venues.json") as Record<string, any>[], KAP = J("data/real/kapanis.json"), FIX = J("data/real/duzeltmeler.json");
const T = J("data/katalog/tur/site-tanimlari-2026-11-12.json"), D = J("data/katalog/denetim/katalog-kalite-2026-11-12.json");
const bySlug = new Map(V.map((v) => [v.slug, v]));
let ok = 0, fail = 0; const t = (ad: string, kosul: boolean, not = "") => { if (kosul) ok++; else { fail++; console.log("KALDI:", ad, not); } };
const GENERIC = new Set(["Restoran", "Kafe", "Bar"]);
const RESTORAN = new Set(["Türk mutfağı", "Lokanta", "Kebapçı / Ocakbaşı", "Dönerci", "Pideci", "Balık restoranı", "Meyhane", "Steakhouse", "Burger", "Pizza", "Sushi / Japon", "Asya mutfağı", "Kahvaltı", "Dünya mutfağı", "Vegan", "Tavuk", "Sokak lezzeti", "Karadeniz mutfağı"]);
const KAFE = new Set(["Kahveci", "Tatlıcı", "Fırın", "Kahvaltı"]), BAR = new Set(["Pub"]);
const OSM_KANIT = /^(OSM cuisine=[^ ]+ \([^ ]+ → .+; sürüm \d+, \d{4}-\d\d-\d\d\)|OSM amenity=pub \(sürüm \d+, \d{4}-\d\d-\d\d\))$/;
const SITE_KANIT = /^resmî site \(\d{4}-\d\d-\d\d, .+\): ".+"$/;
/* kapsam */
const turHedef = D.kayitlar.filter((r: any) => r.sorunlar.some((s: any) => s.eksen === "tür")).map((r: any) => r.slug);
const katHedef = D.kayitlar.filter((r: any) => r.sorunlar.some((s: any) => s.eksen === "kategori")).map((r: any) => r.slug);
const turUyg = K.uygulanmayan.filter((x: any) => x.eksen === "tür"), katUyg = K.uygulanmayan.filter((x: any) => x.eksen === "kategori");
t("kapsam: genel türlü kayıtların hepsi karar aldı", K.tur.length + turUyg.length === turHedef.length, `${K.tur.length}+${turUyg.length} ≠ ${turHedef.length}`);
t("kapsam: kategori sorunlu kayıtların hepsi karar aldı", K.kategori.length + katUyg.length === katHedef.length, `${K.kategori.length}+${katUyg.length} ≠ ${katHedef.length}`);
t("her tür kararı bir kez", new Set([...K.tur, ...turUyg].map((x: any) => x.slug)).size === turHedef.length);
for (const x of K.tur) {
  const v = bySlug.get(x.slug)!;
  t(`${x.slug}: katalogda`, !!v);
  t(`${x.slug}: eski tür genel`, GENERIC.has(v?.kind) && v.kind === x.tur);
  t(`${x.slug}: elle tür düzeltmesi yok`, !FIX[x.slug]?.kind);
  t(`${x.slug}: kapanış kaydı yok`, !["closed_confirmed", "closed_suspected"].includes(KAP[x.slug]?.state));
  t(`${x.slug}: yalnız kind + sourceUrl + why`, JSON.stringify(Object.keys(x.alanlar).sort()) === JSON.stringify(["kind", "sourceUrl", "why"]));
  t(`${x.slug}: yeni tür genel değil ve değişiyor`, !GENERIC.has(x.yeni) && x.yeni !== x.tur && x.alanlar.kind === x.yeni);
  const aile = v.categoryId === "cat.cafe" ? KAFE : v.categoryId === "cat.bar" ? BAR : RESTORAN;
  t(`${x.slug}: tür kategoriyle uyumlu (${v.categoryId})`, aile.has(x.yeni), x.yeni);
  t(`${x.slug}: kanıt biçimi`, x.kaynak === "OSM" ? OSM_KANIT.test(x.kanit) : SITE_KANIT.test(x.kanit), x.kanit);
  t(`${x.slug}: kaynak bağlantısı`, x.kaynak === "OSM" ? x.alanlar.sourceUrl === `https://www.openstreetmap.org/${v.ref}` : /^https?:\/\//.test(x.alanlar.sourceUrl) && !/openstreetmap/.test(x.alanlar.sourceUrl));
  t(`${x.slug}: site kararı elle okunmuş tanımdan`, x.kaynak === "OSM" || (T.kabul[x.slug]?.kind === x.yeni && x.kanit.includes(T.kabul[x.slug].ifade)));
  t(`${x.slug}: why kanıtı ve tarihi taşıyor`, x.alanlar.why.includes(x.kanit) && x.alanlar.why.includes(K.tarih));
  t(`${x.slug}: Google yok`, !/google/i.test(JSON.stringify(x)));
}
for (const [s, d] of Object.entries(T.kabul) as [string, any][]) t(`${s}: site tanımı kullanıldı ya da gerekçeli`, K.tur.some((x: any) => x.slug === s) || turUyg.some((x: any) => x.slug === s && x.neden), d.kind);
for (const x of K.kategori) {
  const v = bySlug.get(x.slug)!;
  t(`${x.slug}: kategori restoran → kafe`, v.categoryId === "cat.restaurant" && x.alanlar.categoryId === "cat.cafe" && JSON.stringify(Object.keys(x.alanlar)) === '["categoryId"]');
  t(`${x.slug}: türü Tatlıcı/Kahvaltı ve OSM amenity=cafe`, ["Tatlıcı", "Kahvaltı"].includes(FIX[x.slug]?.kind ?? v.kind) && v.osmAmenity === "cafe" && /^OSM amenity=cafe/.test(x.kanit));
  t(`${x.slug}: kapanış kaydı yok`, !["closed_confirmed", "closed_suspected"].includes(KAP[x.slug]?.state));
}
for (const x of K.uygulanmayan) t(`${x.slug}: uygulanmayanın alanı yok ve nedeni var`, !("alanlar" in x) && !!x.neden);
/* uygulama benzetimi: geçici kopyada tur-uygula.mjs --yaz; yalnız izin verilen alanlar değişir, ikinci çalıştırma boştur */
const tmp = mkdtempSync(join(tmpdir(), "turtest-"));
mkdirSync(join(tmp, "data/real"), { recursive: true }); mkdirSync(join(tmp, "scripts/katalog"), { recursive: true });
for (const f of ["data/real/venues.json", "data/real/duzeltmeler.json", "scripts/katalog/tur-uygula.mjs"]) cpSync(f, join(tmp, f));
cpSync(kp, join(tmp, "paket.json"));
const run = () => JSON.parse(execFileSync("node", ["scripts/katalog/tur-uygula.mjs", "paket.json", "--yaz"], { cwd: tmp, encoding: "utf8" }));
const r1 = run();
t("uygulama: tür sayısı", r1.tur === K.tur.length, `${r1.tur}`); t("uygulama: kategori sayısı", r1.kategori === K.kategori.length, `${r1.kategori}`); t("uygulama: atlanan yok", r1.atlanan.length === 0, r1.atlanan.join("; "));
const F2 = JSON.parse(readFileSync(join(tmp, "data/real/duzeltmeler.json"), "utf8"));
const V2 = JSON.parse(readFileSync(join(tmp, "data/real/venues.json"), "utf8")) as Record<string, any>[];
const turSet = new Map(K.tur.map((x: any) => [x.slug, x])), katSet = new Map(K.kategori.map((x: any) => [x.slug, x]));
t("duzeltmeler: eski kayıtların hepsi korunuyor", Object.keys(FIX).every((s) => s in F2));
t("duzeltmeler: yalnız paket kayıtları eklendi", Object.keys(F2).filter((s) => !(s in FIX)).every((s) => turSet.has(s)));
for (const [s, f] of Object.entries(FIX) as [string, any][]) t(`${s}: mevcut düzeltme alanları aynı`, Object.keys(f).every((k) => JSON.stringify(f[k]) === JSON.stringify(F2[s][k])));
for (const [s, x] of turSet as Map<string, any>) t(`${s}: düzeltmede kind/sourceUrl/why`, F2[s].kind === x.alanlar.kind && F2[s].sourceUrl === x.alanlar.sourceUrl && F2[s].why === x.alanlar.why && !!F2[s].checkedAt);
t("venues: kayıt sayısı ve sıra aynı", V2.length === V.length && V2.every((r, i) => r.slug === V[i].slug));
let degisenSatir = 0;
for (let i = 0; i < V.length; i++) {
  const a = V[i], b = V2[i]; const fark = Object.keys({ ...a, ...b }).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  if (fark.length) { degisenSatir++; t(`${a.slug}: yalnız categoryId değişti`, katSet.has(a.slug) && JSON.stringify(fark) === '["categoryId"]', fark.join(",")); }
  if (a.kaliteSinifi === "B1" || a.adresDuzeyi === "sokak") t(`${a.slug}: B1 koordinatı değişmedi`, a.lat === b.lat && a.lng === b.lng && a.address === b.address);
}
t("venues: değişen satır = kategori kararı", degisenSatir === K.kategori.length, `${degisenSatir}`);
const r2 = run();
t("uygulama ikinci kez: değişiklik yok", r2.tur === 0 && r2.kategori === 0, JSON.stringify(r2));
console.log(`tür/kategori: ${ok} geçti, ${fail} kaldı`); process.exit(fail ? 1 : 0);
