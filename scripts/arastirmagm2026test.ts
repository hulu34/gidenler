/* Gault&Millau 2026 kanıtlı aday araştırması — aday dosyasının kalite testi (yalnız okur; katalog dosyalarına yazmaz).
   1. Katalog korunur: data/real/venues.json + isletme.json taban SHA ile aynı; kayıt sayısı tabandan okunur (793 + PR #49'un 8 kaydı = 801).
   2. Güçlü aday standardı: ad, 39 ilçeden biri, kapı numaralı adres, en az bir güncel resmî kaynak + kontrol tarihi, tür ("Restoran" değil), güven "güçlü".
   3. Tekillik: güçlü adaylar Production'la (ad + ilçe) ve kendi aralarında çakışmaz; PR #48 dalı varsa onun havuzuyla da.
   4. Puan/yorum yok: rehber puanı, Google verisi, yorum alanı saklanmaz.
   5. Koordinat yalnız OSM kaynağıyla ve İstanbul sınırları içinde; yoksa A-konumsuz önerisi.
   6. Her durum gerekçeli: inceleme → eksik + neden; mükerrer → eşleşen; bekleyen kayda kanıt → mevcut kayıt.
   Kullanım: TABAN=<sha> npx tsx scripts/arastirmagm2026test.ts (TABAN verilmezse origin/feature/investor-v1) */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, typeof not === "string" ? not : JSON.stringify(not).slice(0, 300)); } };
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const TABAN = process.env.TABAN ?? "origin/feature/investor-v1";
const git = (ref: string, p: string) => execFileSync("git", ["show", `${ref}:${p}`], { encoding: "utf8", maxBuffer: 64 << 20 });
const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
type Kaynak = { tur: string; url: string; kontrol: string; kanitladigi?: string };
type K = { id: string; ad: string; ilce: string | null; adres?: string; durum: string; kind?: string; categoryId?: string; guven?: string; kaynaklar: Kaynak[];
  koordinat?: { kaynak: string; ref: string; lat: number; lng: number } | null; kaliteSinifiOnerisi?: string; eksik?: string[]; neden?: string; eslesen?: unknown; mevcutKayit?: string };

/* 1 */
t("venues.json taban ile aynı", readFileSync("data/real/venues.json", "utf8") === git(TABAN, "data/real/venues.json"));
t("isletme.json taban ile aynı", readFileSync("data/real/isletme.json", "utf8") === git(TABAN, "data/real/isletme.json"));
const PROD = [...J("data/real/venues.json"), ...J("data/real/isletme.json")] as { name: string; district: string; slug: string }[];
const TABAN_SAYI = JSON.parse(git(TABAN, "data/real/venues.json")).length + JSON.parse(git(TABAN, "data/real/isletme.json")).length;
t(`Production kayıt sayısı tabanla aynı (${TABAN_SAYI})`, PROD.length === TABAN_SAYI && TABAN_SAYI >= 793, PROD.length);

const doc = J("data/arastirma/gm2026/adaylar.json") as { sayim: Record<string, number>; kayitlar: K[] };
const D = doc.kayitlar;
const say: Record<string, number> = {};
for (const x of D) say[x.durum] = (say[x.durum] ?? 0) + 1;
t("sayım alanı kayıtlarla aynı", JSON.stringify(Object.entries(say).sort()) === JSON.stringify(Object.entries(doc.sayim).sort()), { say, sayim: doc.sayim });
const DURUM = new Set(["aday-guclu", "inceleme", "ret-onerisi", "bekleyen-kayda-kanit", "mukerrer", "katalogda-ya-da-dalda-var", "kapsam-disi"]);
/* 0 — 2. tur: 93 yeni aday çifte sayımsız; kaynak ayrımı; iki bağımsız kaynak */
const YENI = D.filter((x) => ["aday-guclu", "inceleme", "ret-onerisi"].includes(x.durum));
const gm = YENI.filter((x) => x.id.startsWith("gm26/")), sube = YENI.filter((x) => !x.id.startsWith("gm26/"));
t("93 yeni aday (G&M + resmî şube listeleri), çifte sayım yok", YENI.length === 93 && gm.length + sube.length === 93 && new Set(YENI.map((x) => x.id)).size === 93, { yeni: YENI.length, gm: gm.length, sube: sube.length });
t("G&M 2026 İstanbul kaydı 226 (şube listeleri ayrı)", D.filter((x) => x.id.startsWith("gm26/")).length === 226);
type KH = K & { kabulHazirlik?: { durum: string }; tur2?: { oncekiDurum?: string; bulgu?: string; oneri?: string }; tur3?: { oncekiDurum?: string; bulgu?: string } };
/* 3. tur: incelemeden yükselen her kayıtta son 12 ay içinde tarihli bağımsız kaynak ya da bugün açık resmî/işletmeci sayfası */
for (const x of D as KH[]) {
  if (x.tur3?.oncekiDurum !== "inceleme") continue;
  const yeni = x.kaynaklar.filter((k) => !/gault-millau/.test(k.url));
  const guncel = yeni.some((k) => /resmî|işletmeci|AVM/.test(k.tur) || /(2025-1[12]|2026|\.2026|12\.2025)/.test(k.kanitladigi ?? ""));
  t(`${x.id}: 3. turda güncel ikinci kaynak`, yeni.length > 0 && guncel, yeni.map((k) => k.kanitladigi));
}
for (const x of D as KH[]) {
  if (x.durum === "aday-guclu") {
    t(`${x.id}: kabul hazırlık durumu yazılı`, ["codex-teknik-kabule-hazir", "tek-kaynak"].includes(x.kabulHazirlik?.durum ?? ""), x.kabulHazirlik);
    if (x.kabulHazirlik?.durum === "codex-teknik-kabule-hazir") {
      const hostlar = new Set(x.kaynaklar.map((k) => { try { return new URL(k.url).host.replace(/^www\./, ""); } catch { return k.url; } }));
      t(`${x.id}: hazır kayıtta en az iki farklı kaynak alanı`, hostlar.size >= 2, [...hostlar]);
    }
    if (x.tur2?.oncekiDurum === "inceleme") t(`${x.id}: incelemeden yükselen kayıtta G&M dışı kaynak`, x.kaynaklar.some((k) => !/gault-millau/.test(k.url)));
  }
  if (x.durum === "ret-onerisi") t(`${x.id}: ret gerekçeli`, !!x.neden);
  if (x.durum === "inceleme" && x.id.startsWith("gm26/")) t(`${x.id}: 2. tur bulgusu yazılı`, !!x.tur2?.bulgu);
  if (x.durum === "bekleyen-kayda-kanit") t(`${x.id}: eski kayıt için öneri yazılı`, !!x.tur2?.oneri);
}
const TOPLAYICI = /enprimeurclub|joinpearl|mesprestiges|instagram\.com|google\./;
t("toplayıcı site, Instagram ya da Google kaynak olarak yazılmadı", D.every((x) => x.kaynaklar.every((k) => !TOPLAYICI.test(k.url))));
t("bilinen durum değerleri", D.every((x) => DURUM.has(x.durum)), [...new Set(D.map((x) => x.durum))]);
t("id'ler tekil", new Set(D.map((x) => x.id)).size === D.length);

/* 2 */
const ILCE = new Set((J("data/katalog/istanbul-ilceler.json").ilceler as { ad: string }[]).map((x) => x.ad));
const G = D.filter((x) => x.durum === "aday-guclu");
const TARIH = /^\d{4}-\d{2}-\d{2}$/;
for (const x of G) {
  const resmi = x.kaynaklar.filter((k) => /resmî/.test(k.tur));
  const miss = [
    !x.ad && "ad", !(x.ilce && ILCE.has(x.ilce)) && `ilçe (${x.ilce})`, !(x.adres && /No\s*[:.]?\s*\d/i.test(x.adres)) && `kapı no (${x.adres})`,
    resmi.length === 0 && !x.kaynaklar.some((k) => /bağımsız|AVM resmî|işletmeci/.test(k.tur)) && "resmî ya da bağımsız güncel kaynak", !x.kaynaklar.every((k) => /^https:?\/\//.test(k.url) || /^http:\/\//.test(k.url)) && "kaynak URL",
    !x.kaynaklar.every((k) => TARIH.test(k.kontrol)) && "kontrol tarihi", (!x.kind || x.kind === "Restoran") && `tür (${x.kind})`,
    !["cat.restaurant", "cat.cafe"].includes(x.categoryId ?? "") && "kategori", x.guven !== "güçlü" && "güven",
  ].filter(Boolean);
  t(`${x.id}: güçlü aday standardı`, miss.length === 0, miss.join(", "));
}

/* 3 */
const prodNI = new Set(PROD.map((r) => `${fold(r.name)}|${r.district}`));
const seen = new Set<string>();
for (const x of G) {
  const ni = `${fold(x.ad)}|${x.ilce}`;
  t(`${x.id}: Production'da aynı ad + ilçe yok`, !prodNI.has(ni));
  t(`${x.id}: adaylar arasında tekil`, !seen.has(ni)); seen.add(ni);
}
let havuz: { name: string; district: string }[] = [];
try {
  for (let n = 15; n <= 29; n++) for (const f of ["kayitlar.json", "isletme-kayitlari.json"]) {
    try { havuz = havuz.concat(JSON.parse(git("origin/katalog/gece-2000", `data/paket/istanbul-${n}/${f}`))); } catch { /* paket yok */ }
  }
} catch { /* dal yok */ }
if (havuz.length) {
  const hNI = new Set(havuz.map((r) => `${fold(r.name)}|${r.district}`));
  for (const x of G) t(`${x.id}: PR #48 havuzunda aynı ad + ilçe yok`, !hNI.has(`${fold(x.ad)}|${x.ilce}`));
}
console.log(`PR #48 havuzu: ${havuz.length ? havuz.length + " kayıt karşılaştırıldı" : "dal bulunamadı, karşılaştırılmadı"}`);

/* 4 */
const ham = readFileSync("data/arastirma/gm2026/adaylar.json", "utf8");
t("rehber puanı saklanmıyor", !/TOQUE|(?<![\d/])\d{1,2}([,.]\d)?\s?\/\s?20(?!\d)|Original Tables/i.test(ham));
t("Google verisi yok", !/google\.(com|com\.tr)\/maps|maps\.app\.goo\.gl|place_id|googlePlaceId/.test(ham));
t("puan/yorum alanı yok", !/"(rating|reviews?|puan|yorum)"\s*:/.test(ham));

/* 5 */
for (const x of G) {
  if (x.koordinat) t(`${x.id}: koordinat OSM ve İstanbul'da`, x.koordinat.kaynak === "OpenStreetMap" && /^(node|way|relation)\/\d+$/.test(x.koordinat.ref) && x.koordinat.lat > 40.8 && x.koordinat.lat < 41.6 && x.koordinat.lng > 27.9 && x.koordinat.lng < 29.95 && x.kaliteSinifiOnerisi === "A");
  else t(`${x.id}: koordinatsız → A-konumsuz önerisi`, x.kaliteSinifiOnerisi === "A-konumsuz");
}

/* 6 */
for (const x of D) {
  if (x.durum === "inceleme") t(`${x.id}: inceleme gerekçeli`, !!x.neden && (x.eksik ?? []).length > 0);
  if (x.durum === "mukerrer" || x.durum === "katalogda-ya-da-dalda-var") t(`${x.id}: eşleşen kayıt yazılı`, !!x.eslesen);
  if (x.durum === "bekleyen-kayda-kanit") t(`${x.id}: mevcut kayıt yazılı`, !!x.mevcutKayit);
}

console.log(`gm2026 araştırması: ${ok}/${ok + fail} · güçlü ${G.length} · inceleme ${say["inceleme"] ?? 0} · bekleyen kayda kanıt ${say["bekleyen-kayda-kanit"] ?? 0}`);
process.exit(fail ? 1 : 0);
