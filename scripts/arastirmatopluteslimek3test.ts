/* Toplu teslim eki 3 — kanıt tamamlama turu kalite testi (yalnız okur).
   1. #56, #58, #63 dosyaları ve data/real değişmedi.
   2. En fazla 20 kayıt; hepsi #63'te kanıt bekleyen; kapsam dışı kayıtlar (canlı, Monteverdi, Maderia, Suna, mükerrer şüphesi) yok.
   3. Her kayıtta belirli eksik ve tarihli kontrol satırı var.
   4. Tamamlanan kayıtta resmî kaynak bugün açık (HTTP 200) ve kapı no hem resmî bulguda hem tarihli bağımsız kaynakta aynı.
   5. Bekleyen kayıtta kalan eksik yazılı; sayım tutarlı.
   6. Google/Maps, toplayıcı site, puan, koordinat, yorum/menü alanı yok.
   Kullanım: npx tsx scripts/arastirmatopluteslimek3test.ts */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, typeof not === "string" ? not : JSON.stringify(not).slice(0, 400)); } };
const show = (ref: string, p: string) => execFileSync("git", ["show", `${ref}:${p}`], { encoding: "utf8", maxBuffer: 256 << 20 });
const DOSYA = "data/arastirma/toplu-teslim/ek-3-kanit-tamamlama.json";
const ham = readFileSync(DOSYA, "utf8");
const D = JSON.parse(ham);
const E2P = "data/arastirma/toplu-teslim/ek-2-yayin-uzlasma.json";
const E2 = JSON.parse(readFileSync(E2P, "utf8"));
const T63 = D.temel.pr63.sha;

/* 1 */
t("#63 eki temel SHA ile aynı", readFileSync(E2P, "utf8") === show(T63, E2P));
for (const f of ["data/arastirma/toplu-teslim/manifest.json", "data/arastirma/toplu-teslim/ek-1.json", "data/real/venues.json", "data/real/isletme.json", "data/real/kapanis.json"])
  t(`${f} değişmedi`, readFileSync(f, "utf8") === show(T63, f));

/* 2 */
const K = D.kayitlar as any[];
const X = new Map((E2.kayitlar as any[]).map((r) => [r.anahtar, r]));
t("en fazla 20 kayıt, tekil", K.length > 0 && K.length <= 20 && new Set(K.map((r) => r.anahtar)).size === K.length, K.length);
t("hepsi #63'te kanıt bekliyor", K.every((r) => X.get(r.anahtar)?.durum === "kanit-bekliyor"), K.filter((r) => X.get(r.anahtar)?.durum !== "kanit-bekliyor").map((r) => r.anahtar));
const disari = ["monteverdi ristorante|besiktas", "maderia sushi bar|sisli", "suna nin yeri|uskudar", ...(E2.kayitlar as any[]).filter((r) => r.durum !== "kanit-bekliyor").map((r) => r.anahtar)];
t("kapsam dışı kayıt yok (canlı, Monteverdi, Maderia, Suna, mükerrer)", K.every((r) => !disari.includes(r.anahtar)));
t("#63 kategorisi restoran ya da belirsiz (tür eksiği kaydın kendi eksiği)", K.every((r) => ["restoran", "belirsiz"].includes(X.get(r.anahtar).kategori)) && K.filter((r) => X.get(r.anahtar).kategori === "belirsiz").every((r) => /belirsiz/.test(r.kategoriKaynagi)));

/* 3 */
t("her kayıtta belirli eksik ve en az bir kontrol (URL, 2026-11-16, HTTP kodu)", K.every((r) => r.eksik?.length > 10 && r.kontroller.length > 0 && r.kontroller.every((c: any) => /^https?:\/\//.test(c.url) && c.erisim === "2026-11-16" && Number.isInteger(c.http) && c.bulgu)));

/* 4 */
const tam = K.filter((r) => r.sonuc === "TAMAMLANDI" || r.sonuc === "SUBE_AYRIMI");
const kapiVar = (s: string, no: string) => new RegExp(`No\\.?\\s*:?\\s*${no.replace("/", "\\/")}(?![0-9A-Za-z])`, "i").test(s);
for (const r of tam) {
  const resmi = r.kontroller.filter((c: any) => /resmî/.test(c.tur) && c.http === 200);
  t(`${r.anahtar}: resmî kaynak bugün açık`, resmi.length > 0);
  t(`${r.anahtar}: adres, kapı no, faaliyet dolu`, !!r.tamamlanan?.adres && !!r.tamamlanan?.kapiNo && !!r.tamamlanan?.faaliyet);
  t(`${r.anahtar}: kapı no resmî bulguda ve tarihli bağımsız kaynakta aynı`, resmi.some((c: any) => kapiVar(c.bulgu, r.tamamlanan.kapiNo)) && r.mevcutKanit.some((m: string) => /\((202[5-6])-\d{2}-\d{2}\)/.test(m) && RegExp.$1 && m.match(/\((\d{4}-\d{2}-\d{2})\)/)![1] >= "2025-11-15" && kapiVar(m, r.tamamlanan.kapiNo)));
}
t("şube ayrımında bekleyen şube kalan eksikte yazılı", K.filter((r) => r.sonuc === "SUBE_AYRIMI").every((r) => r.kalanEksik.length > 0 && !!r.tamamlanan.onerilenAnahtar));

/* 5 */
const bek = K.filter((r) => r.sonuc === "BEKLIYOR");
t("bekleyen kayıtlarda kalan eksik yazılı, tamamlanan boş", bek.every((r) => r.kalanEksik.length > 0 && r.tamamlanan === null));
t("sonuç izinli kümede", K.every((r) => ["TAMAMLANDI", "SUBE_AYRIMI", "BEKLIYOR"].includes(r.sonuc)));
const s = D.sayim;
t("sayım tutarlı", s.secilen === K.length && s.tamamlandi === K.filter((r) => r.sonuc === "TAMAMLANDI").length && s.subeAyrimi === K.filter((r) => r.sonuc === "SUBE_AYRIMI").length && s.bekliyor === bek.length && s.tamKanitliKayit === tam.length && s.acilanUrl === K.reduce((a, r) => a + r.kontroller.length, 0));

/* 6 */
t("Google/Maps kaynağı yok", !/google\.[a-z.]+\/maps|maps\.app\.goo|goo\.gl\/maps/i.test(ham));
t("toplayıcı site kontrol olarak kullanılmadı", K.every((r) => r.kontroller.every((c: any) => !/joinpearl|mesprestiges|enprimeurclub|tripaligner|restaurantguru|wanderlog|trip\.com|yandex/.test(c.url))));
t("puan, koordinat, yorum/menü alanı yok", !/"(rating|puan|yorum|score|menu|lat|lng|lon)"\s*:/.test(ham) && !/\d+([,.]\d)?\/20\b/.test(ham) && !/TOQUE/i.test(ham));

console.log(`toplu teslim eki 3 (kanıt tamamlama): ${ok}/${ok + fail} · seçilen ${K.length} · tam kanıtlı ${tam.length} · bekliyor ${bek.length}`);
process.exit(fail ? 1 : 0);
