/* Kuzey Kıbrıs toplu araştırma paketi — kalite, tekillik, bölge ayrımı ve bölge modeli testi (yalnız okur).
   1. İstanbul korunur: data/real taban SHA ile aynı; katalogda Kıbrıs kaydı yok.
   2. Manifest: sayım, tekil id/slug, ad+ilçe tekilliği, yalnız kuzey + kapsam ilçeleri, durum değerleri, yasak alan yok.
   3. Güney ayrımı: PR #52'nin güney kayıtları bu pakette yok; kuzey kayıtları pr52Id ile bağlı, yeniden eklenmemiş.
   4. Doğrulanan kayıtlar kanıt standardını satır bazında sağlar; koşullu/inceleme kabul dosyasına girmez.
   5. Toplu kabul dosyası: yalnız doğrulananlar; slug İstanbul kataloğunda yok; mevcut invalidRecord ile bilinen engel ölçülür.
   6. Bölge modeli: eşanlamlılar, belirsiz adlar (Boğaz, İskele, Girne Pilavcısı), ilçe filtresi ve arama.
   Kullanım: TABAN=<sha> PR52=<ref> npx tsx scripts/kuzeykibristest.ts
   (TABAN verilmezse origin/feature/investor-v1; PR52 verilmezse origin/arastirma/kibris-pilot) */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { invalidRecord, type RealVenueRecord } from "../data/real/index";
import { KAPSAM, adadaMi, ara, aramaNormalize, bolgeBul, filtrele, fold, kibrisBaglami, slugOner, type KuzeyIlce } from "../lib/bolge/kibris";

let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, typeof not === "string" ? not : JSON.stringify(not).slice(0, 400)); } };
const TABAN = process.env.TABAN ?? "origin/feature/investor-v1";
const PR52 = process.env.PR52 ?? "origin/arastirma/kibris-pilot";
const show = (ref: string, p: string) => execFileSync("git", ["show", `${ref}:${p}`], { encoding: "utf8", maxBuffer: 64 << 20 });
const KONTROL = "2026-11-18";

type Kaynak = { yayinci: string; url: string; tarih: string; tarihTuru: string; yasAy: number | null; adresVerir: boolean; mekanBilgisi: string };
type Kayit = {
  id: string; slugOnerisi: string; ad: string; adVaryantlari: string[]; durum: string; guven?: string | null; gerekce: string; isaretler: string[];
  bolge: { ada: string; operasyonelBolge: "kuzey" | "güney"; ilce: string; sehir: string; cografiBolge: string; yerlesim?: string | null; yerelAdlar: string };
  kategori: { categoryId: string | null; kind: string | null };
  adres: { metin: string | null; duzey: string };
  koordinat: null | { kaynak: string; ref: string; lat: number; lng: number; durum: string; alanKaniti: string; lisans: string };
  isletmeciKaynagi: null | { tur: string; url: string; adres: string | null };
  bagimsizKaynaklar: Kaynak[]; tarihliBagimsizYayincilar24Ay: string[];
  mukerrer: { sonuc: string; pr52Id?: string | null; istanbulCanli: string };
};
const M = JSON.parse(readFileSync("data/arastirma/kuzey-kibris/manifest.json", "utf8")) as { sayim: Record<string, Record<string, number>>; taban: { sha: string }; kayitlar: Kayit[] };
const KAB = JSON.parse(readFileSync("data/arastirma/kuzey-kibris/kabul.json", "utf8")) as { kayitSayisi: number; kayitlar: (RealVenueRecord & { city: string; region: { operasyonelBolge: string; ilce: string } })[] };
const KOS = JSON.parse(readFileSync("data/arastirma/kuzey-kibris/kosullu.json", "utf8")) as { kayitlar: { id: string }[] };
const R = M.kayitlar;

/* 1. İstanbul korunur */
for (const f of ["data/real/venues.json", "data/real/isletme.json", "data/real/duzeltmeler.json", "data/real/kapanis.json"]) t(`${f} taban ile aynı`, readFileSync(f, "utf8") === show(TABAN, f));
const PROD = [...JSON.parse(readFileSync("data/real/venues.json", "utf8")), ...JSON.parse(readFileSync("data/real/isletme.json", "utf8"))] as RealVenueRecord[];
t("taban 879 kayıt", PROD.length === 879, PROD.length);
t("katalogda Kıbrıs adresi/ilçesi yok", !PROD.some((r) => /kıbrıs|kktc|cyprus|lefkoşa|kyrenia|nicosia|iskele ilçesi|trikomo|lapta|bellapais/i.test(`${r.district} ${r.address ?? ""}`)));
t("manifest tabanı Production SHA'sı", execFileSync("git", ["rev-parse", TABAN], { encoding: "utf8" }).trim() === M.taban.sha, M.taban.sha);

/* 2. Manifest yapısı */
const DURUM = ["dogrulandi", "kosullu", "inceleme", "ret"];
t("durum değerleri", R.every((r) => DURUM.includes(r.durum)), R.filter((r) => !DURUM.includes(r.durum)).map((r) => r.id));
t("id tekil", new Set(R.map((r) => r.id)).size === R.length);
t("slug tekil", new Set(R.map((r) => r.slugOnerisi)).size === R.length);
const adIlce = R.map((r) => `${fold(r.ad.replace(/\(.*?\)/g, ""))}|${r.bolge.ilce}`);
t("ad + ilçe tekil (TR/EN/yerel yazımlar katlanmış)", new Set(adIlce).size === R.length, adIlce.filter((x, i) => adIlce.indexOf(x) !== i));
const varyant = R.flatMap((r) => [r.ad, ...r.adVaryantlari].map((v) => `${fold(v.replace(/\(.*?\)/g, ""))}|${r.bolge.ilce}|${r.id}`));
const vMap = new Map<string, Set<string>>();
for (const v of varyant) { const [a, i, id] = v.split("|"); const k = `${a}|${i}`; vMap.set(k, (vMap.get(k) ?? new Set()).add(id)); }
t("ad varyantları başka kayda çakışmıyor", [...vMap.values()].every((s) => s.size === 1), [...vMap.entries()].filter(([, s]) => s.size > 1).map(([k]) => k));
t("yalnız kuzey", R.every((r) => r.bolge.operasyonelBolge === "kuzey" && r.bolge.ada === "Kıbrıs"));
t("yalnız kapsam ilçeleri", R.every((r) => (KAPSAM as readonly string[]).includes(r.bolge.ilce) && r.bolge.sehir === r.bolge.ilce));
t("her kayıtta coğrafi bölge ve yerel adlar ayrı alanda", R.every((r) => r.bolge.cografiBolge && r.bolge.yerelAdlar && r.bolge.cografiBolge !== r.bolge.operasyonelBolge));
const say: Record<string, Record<string, number>> = {};
for (const il of KAPSAM) say[il] = { arastirilan: 0, dogrulanan: 0, incelemede: 0, kosullu: 0, inceleme: 0, reddedilen: 0 };
for (const r of R) { const s = say[r.bolge.ilce]; s.arastirilan++; if (r.durum === "dogrulandi") s.dogrulanan++; if (r.durum === "kosullu") { s.kosullu++; s.incelemede++; } if (r.durum === "inceleme") { s.inceleme++; s.incelemede++; } if (r.durum === "ret") s.reddedilen++; }
for (const il of KAPSAM) t(`${il} sayımı manifestle aynı`, JSON.stringify(say[il]) === JSON.stringify(M.sayim[il]), { say: say[il], m: M.sayim[il] });
t("TOPLAM satırı", M.sayim.TOPLAM.arastirilan === R.length && M.sayim.TOPLAM.dogrulanan === R.filter((r) => r.durum === "dogrulandi").length);
const YASAK = /"(phone|telefon|rating|puan|yorum|review|googlePlaceId|price|fiyat|openingHours|saat|image|foto)"\s*:/i;
t("kayıtlarda telefon/puan/yorum/fiyat/saat/foto alanı yok", !YASAK.test(JSON.stringify(R)) && !YASAK.test(JSON.stringify(KAB.kayitlar)));
t("kayıtlarda telefon numarası izi yok", !/\+?90\s?\(?(392|533|542|548)\)?[\s-]?\d{3}/.test(JSON.stringify(R) + JSON.stringify(KAB)));
t("Google kaynaklı konum yok (plus code, maps bağlantısı)", !/google\.[a-z.]+\/maps|goo\.gl|[23456789CFGHJMPQRVWX]{4}\+[23456789CFGHJMPQRVWX]{2,3}/.test(JSON.stringify(R.map((r) => [r.adres, r.koordinat, r.isletmeciKaynagi]))));
t("bağımsız kaynak tarihleri kontrol gününden eski", R.every((r) => r.bagimsizKaynaklar.every((k) => k.tarih <= KONTROL)));
const TOPLAYICI = /tripaligner|wanderlog|airbnb|foursquare|4sq\.com|joinpearl|enprimeurclub|mesprestiges|trip\.com|tripadvisor|northcypruseducation/;
t("toplayıcı site kaynak olarak yok", R.every((r) => r.bagimsizKaynaklar.every((k) => !TOPLAYICI.test(k.url)) && !TOPLAYICI.test(r.isletmeciKaynagi?.url ?? "")));

/* 3. Güney ayrımı ve PR #52 */
const P52 = JSON.parse(show(PR52, "data/arastirma/kibris/adaylar.json")) as { kayitlar: { id: string; ad: string; bolge: { operasyonelBolge: string } }[] };
const guney = P52.kayitlar.filter((x) => x.bolge.operasyonelBolge.startsWith("güney"));
const kuzey52 = P52.kayitlar.filter((x) => x.bolge.operasyonelBolge.startsWith("kuzey"));
const gAd = (s: string) => fold(s.replace(/\(.*?\)/g, ""));
t("PR #52 güney kayıtları bu pakette yok (ad eşitliği)", guney.every((g) => !R.some((r) => [r.ad, ...r.adVaryantlari].some((v) => gAd(v) === gAd(g.ad)))), guney.filter((g) => R.some((r) => gAd(r.ad) === gAd(g.ad))).map((g) => g.ad));
t("güneydeki benzer adlı kayıtlar ayrı işaretli (Lush, Larnaka)", R.filter((r) => guney.some((g) => gAd(r.ad).startsWith(gAd(g.ad) + " "))).every((r) => r.isaretler.some((i) => i.includes("güney"))));
t("PR #52 kuzey kayıtlarının hepsi pr52Id ile bağlı", kuzey52.every((k) => R.filter((r) => r.mukerrer.pr52Id === k.id).length === 1), kuzey52.map((k) => k.id).filter((id) => R.filter((r) => r.mukerrer.pr52Id === id).length !== 1));
t("pr52Id değerleri PR #52'de var", R.every((r) => !r.mukerrer.pr52Id || kuzey52.some((k) => k.id === r.mukerrer.pr52Id)));
t("PR #52'deki altı güney tam kaydı korunuyor (PR dalında hâlâ 6)", P52.kayitlar.filter((x) => x.bolge.operasyonelBolge.startsWith("güney") && (x as unknown as { durum: string }).durum === "aday-tam").length === 6);

/* 4. Doğrulanan kayıtlar */
const D = R.filter((r) => r.durum === "dogrulandi");
for (const r of D) {
  const isl = r.isletmeciKaynagi && !/sosyal|satışta/.test(r.isletmeciKaynagi.tur) ? r.isletmeciKaynagi : null;
  const taze24 = r.bagimsizKaynaklar.filter((k) => k.yasAy !== null && k.yasAy <= 24);
  const yayinci36 = new Set(r.bagimsizKaynaklar.filter((k) => k.yasAy !== null && k.yasAy <= 36).map((k) => k.yayinci));
  t(`${r.id}: kimlik (işletmeci + tarihli bağımsız ≤24 ay) ya da iki yayıncı (orta)`, (isl !== null && taze24.length > 0) || (yayinci36.size >= 2 && r.guven === "orta"));
  t(`${r.id}: işletmeci kaynağı yoksa güven orta`, isl !== null || r.guven === "orta");
  t(`${r.id}: faaliyet ≤24 ay`, taze24.length > 0);
  const sokakKaynak = [isl?.adres, ...r.bagimsizKaynaklar.filter((k) => k.adresVerir).map((k) => k.mekanBilgisi)].filter((x): x is string => !!x && /(sokak|sk\.|cadde|cd\.|street|str\.|road|residence)/i.test(x));
  const sokakIki = sokakKaynak.length >= 2;
  t(`${r.id}: adres sokak/site düzeyinde`, ["sokak", "site-adi"].includes(r.adres.duzey) && !!r.adres.metin);
  t(`${r.id}: konum = iki kaynakta sokak ya da OSM kaynaklı koordinat`, sokakIki || r.koordinat?.durum === "kaynakli-koordinat", sokakKaynak);
  if (r.koordinat) {
    t(`${r.id}: koordinat OSM ve ilçe alanında`, r.koordinat.kaynak === "osm" && /^(node|way|relation)\/\d+$/.test(r.koordinat.ref) && r.koordinat.alanKaniti.includes(r.bolge.ilce) && adadaMi(r.koordinat.lat, r.koordinat.lng) && r.koordinat.lisans.includes("ODbL"));
  }
  t(`${r.id}: kategori restoran`, r.kategori.categoryId === "cat.restaurant" && !!r.kategori.kind);
  t(`${r.id}: tek kaynaklı unsur işaretli`, r.isaretler.length > 0);
}
t("koşullu ve inceleme kayıtları 'kaynakli-koordinat' taşımıyor", R.filter((r) => r.durum !== "dogrulandi").every((r) => r.koordinat?.durum !== "kaynakli-koordinat"));
t("koşullu dosyası manifestle birebir", JSON.stringify(KOS.kayitlar.map((k) => k.id).sort()) === JSON.stringify(R.filter((r) => r.durum === "kosullu").map((r) => r.id).sort()));
t("ret kayıtlarında kategori yok", R.filter((r) => r.durum === "ret").every((r) => r.kategori.categoryId === null));

/* 5. Toplu kabul dosyası */
t("kabul = doğrulananlar", JSON.stringify(KAB.kayitlar.map((k) => k.slug).sort()) === JSON.stringify(D.map((r) => r.slugOnerisi).sort()) && KAB.kayitSayisi === D.length);
const prodSlug = new Set(PROD.map((r) => r.slug)), prodAd = new Set(PROD.map((r) => fold(r.name)));
t("kabul slug'ları İstanbul kataloğunda yok", KAB.kayitlar.every((k) => !prodSlug.has(k.slug) && k.ref === `isletme/${k.slug}`));
t("kabul adları İstanbul kataloğunda yok", KAB.kayitlar.every((k) => !prodAd.has(fold(k.name))), KAB.kayitlar.filter((k) => prodAd.has(fold(k.name))).map((k) => k.name));
t("kabul kayıtlarında city + region (kuzey) var", KAB.kayitlar.every((k) => k.city === k.district && k.region.operasyonelBolge === "kuzey"));
t("slugOner manifestle aynı", R.every((r) => slugOner(r.ad, r.bolge.ilce as KuzeyIlce) === r.slugOnerisi), R.filter((r) => slugOner(r.ad, r.bolge.ilce as KuzeyIlce) !== r.slugOnerisi).map((r) => [r.slugOnerisi, slugOner(r.ad, r.bolge.ilce as KuzeyIlce)]));
const konumsuz = KAB.kayitlar.filter((k) => k.lat === undefined), konumlu = KAB.kayitlar.filter((k) => k.lat !== undefined);
t("A-konumsuz kabul kaydı mevcut invalidRecord'dan geçiyor", konumsuz.every((k) => invalidRecord(k) === null), konumsuz.map((k) => [k.slug, invalidRecord(k)]));
// Bilinen engel: invalidRecord yalnız İstanbul sınırlarını kabul ediyor → koordinatlı Kıbrıs kaydı "location" ile düşer. Kod değişikliği planda.
t("BİLİNEN ENGEL ölçüldü: koordinatlı kayıtlar mevcut şemada 'location' ile reddediliyor", konumlu.length > 0 && konumlu.every((k) => invalidRecord(k) === "location"), konumlu.map((k) => [k.slug, invalidRecord(k)]));

/* 6. Bölge modeli */
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
t("Kyrenia → Girne", bolgeBul("Kyrenia harbour fish")?.ilce === "Girne");
t("Trikomo → İskele", bolgeBul("restaurants in Trikomo")?.ilce === "İskele");
t("Lapithos → Lapta (Girne)", eq(bolgeBul("meze in Lapithos"), { ilce: "Girne", yerlesim: "Lapta", eslesen: "lapithos" }));
t("Bellapais → Beylerbeyi (Girne)", bolgeBul("Bellapais akşam yemeği")?.yerlesim === "Beylerbeyi");
t("bağlamsız 'Boğaz' eşlenmez (İstanbul Boğazı)", bolgeBul("Boğaz'da balık") === null && bolgeBul("boğaz manzaralı balık") === null);
t("Kıbrıs bağlamında 'Boğaz' → İskele", bolgeBul("Kıbrıs Boğaz balık")?.ilce === "İskele");
t("'Çengelköy İskele restoran' Kıbrıs sayılmaz", bolgeBul("Çengelköy İskele restoran") === null && !kibrisBaglami("Çengelköy İskele restoran"));
t("'Girne Pilavcısı Kağıthane' Kıbrıs sayılmaz", bolgeBul("Girne Pilavcısı Kağıthane") === null);
t("'Beylerbeyi kahvaltı' (İstanbul) Kıbrıs sayılmaz", bolgeBul("Beylerbeyi kahvaltı") === null);
t("'Dereboyu' ve 'Zeytinlik' bağlamsız eşlenmez", bolgeBul("Ortaköy Dereboyu Caddesi") === null && bolgeBul("Bakırköy Zeytinlik") === null);
t("Long Beach yalnız bağlamda", bolgeBul("Long Beach burger") === null && bolgeBul("KKTC Long Beach burger")?.ilce === "İskele");
t("Lefkoşa Surlariçi", eq(bolgeBul("Lefkoşa Surlariçi lokanta"), { ilce: "Lefkoşa", yerlesim: "Surlariçi", eslesen: "surlarici" }));
t("aramaNormalize: Kyrenia fish → girne fish", aramaNormalize("Kyrenia fish") === "girne fish");
t("aramaNormalize İstanbul sorgusuna dokunmaz", aramaNormalize("Boğaz balık") === "Boğaz balık" && aramaNormalize("Kadıköy kebap") === "Kadıköy kebap");
t("filtre: İskele 2, Girne 3, Lefkoşa 0 doğrulanmış", filtrele(R, { ilce: "İskele" }).length === 2 && filtrele(R, { ilce: "Girne" }).length === 3 && filtrele(R, { ilce: "Lefkoşa" }).length === 0);
t("filtre varsayılanı koşulluları göstermez", filtrele(R).every((r) => r.durum === "dogrulandi") && filtrele(R).length === D.length);
t("filtre: koşullu dahil edilince Girne 8", filtrele(R, { ilce: "Girne", dahil: ["dogrulandi", "kosullu"] }).length === 8);
t("filtre: yerleşim Lapta", eq(filtrele(R, { yerlesim: "Lapta" }).map((r) => r.ad), ["Silver Rocks Restaurant"]));
t("ara: 'Lapta balık kıbrıs' → Silver Rocks", eq(ara(R, "Lapta balık kıbrıs").map((r) => r.ad), ["Silver Rocks Restaurant"]));
t("ara: 'Kyrenia kebap' → Niazi's", eq(ara(R, "Kyrenia kebap").map((r) => r.ad), ["Niazi's Restaurant"]));
t("ara: 'İskele burger kktc' → Epic Burger İskele", eq(ara(R, "İskele burger kktc").map((r) => r.ad), ["Epic Burger İskele"]));
t("ara: 'Girne burger kıbrıs' İskele şubesini getirmez", ara(R, "Girne burger kıbrıs").length === 0);
t("ara: 'Lefkoşa' doğrulanmış sonuç yok", ara(R, "Lefkoşa restoran kıbrıs").length === 0);

console.log(`kuzey kıbrıs testi: ${ok}/${ok + fail}`);
if (fail) process.exit(1);
