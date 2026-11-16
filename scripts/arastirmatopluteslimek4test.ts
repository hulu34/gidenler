/* Toplu teslim eki 4 — ikinci kanıt turu kalite testi (yalnız okur).
   1. #56, #58, #63, #65 dosyaları ve data/real değişmedi.
   2. En fazla 20 kayıt; hepsi #63'te kanıt bekleyen restoran; #65 kayıtları, #64/Pilot birleşik aday, Maderia, Suna, mükerrer, canlı yok.
   3. Her kayıtta belirli eksik ve en az bir tarihli kontrol ya da arama satırı; canlı tekilleştirme canlı katalogdan yeniden doğrulanır.
   4. Tamamlanan kayıt varsa kapı no resmî bulguda ve tarihli bağımsız kaynakta aynı; bekleyende kalan eksik ve neden yazılı; sayım tutarlı.
   5. Park sayfası / çözülmeyen alan adı kanıt sayılmadı; Google, toplayıcı, puan, koordinat, yorum/menü yok.
   Kullanım: npx tsx scripts/arastirmatopluteslimek4test.ts */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, typeof not === "string" ? not : JSON.stringify(not).slice(0, 400)); } };
const show = (ref: string, p: string) => execFileSync("git", ["show", `${ref}:${p}`], { encoding: "utf8", maxBuffer: 256 << 20 });
const DOSYA = "data/arastirma/toplu-teslim/ek-4-kanit-turu-2.json";
const ham = readFileSync(DOSYA, "utf8");
const D = JSON.parse(ham);
const T65 = D.temel.pr65;
const fold = (s: string | null) => (s ?? "").replace(/ı/g, "i").replace(/İ/g, "i").toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();

/* 1 */
for (const f of ["data/arastirma/toplu-teslim/manifest.json", "data/arastirma/toplu-teslim/ek-1.json", "data/arastirma/toplu-teslim/ek-2-yayin-uzlasma.json", "data/arastirma/toplu-teslim/ek-3-kanit-tamamlama.json", "data/real/venues.json", "data/real/isletme.json", "data/real/kapanis.json"])
  t(`${f} değişmedi (#65 tabanı)`, readFileSync(f, "utf8") === show(T65, f));

/* 2 */
const K = D.kayitlar as any[];
const E2 = new Map((JSON.parse(readFileSync("data/arastirma/toplu-teslim/ek-2-yayin-uzlasma.json", "utf8")).kayitlar as any[]).map((r) => [r.anahtar, r]));
const E3 = new Set((JSON.parse(readFileSync("data/arastirma/toplu-teslim/ek-3-kanit-tamamlama.json", "utf8")).kayitlar as any[]).map((r) => r.anahtar));
t("en fazla 20 kayıt, tekil", K.length > 0 && K.length <= 20 && new Set(K.map((r) => r.anahtar)).size === K.length, K.length);
t("hepsi #63'te kanıt bekleyen restoran", K.every((r) => E2.get(r.anahtar)?.durum === "kanit-bekliyor" && E2.get(r.anahtar)?.kategori === "restoran" && r.kategori === "restoran"));
t("#65 kayıtları yok", K.every((r) => !E3.has(r.anahtar)));
const disari = ["monteverdi ristorante|besiktas", "sahan|kadikoy", "hamdi restaurant|fatih", "az cok thai|beyoglu", "maderia sushi bar|sisli", "suna nin yeri|uskudar", ...D.kapsamDisi.pilotIncelenen];
t("Pilot/#64, açık kalanlar, Maderia, Suna ve Pilot'un baktığı kayıtlar yok", K.every((r) => !disari.includes(r.anahtar)));

/* 3 */
t("her kayıtta belirli eksik ve tarihli kontrol ya da arama", K.every((r) => r.eksik?.length > 10 && (r.kontroller.length + r.arama.length) > 0 && r.kontroller.every((c: any) => /^https?:\/\//.test(c.url) && c.erisim === "2026-11-16" && Number.isInteger(c.http) && c.bulgu) && r.arama.every((a: any) => a.sorgu && a.tarih === "2026-11-16" && a.bulgu)));
const CANLI = D.canliTaban.sha;
const P = [...JSON.parse(show(CANLI, "data/real/venues.json")), ...JSON.parse(show(CANLI, "data/real/isletme.json"))] as { slug: string; name: string; district: string }[];
t("canlı taban 876", P.length === D.canliTaban.toplam && P.length === 876);
t("hiçbir kayıt canlıda ad + ilçe birebir değil", K.every((r) => !P.some((x) => fold(x.name) === fold(r.ad) && fold(x.district) === fold(r.ilce))), K.filter((r) => P.some((x) => fold(x.name) === fold(r.ad) && fold(x.district) === fold(r.ilce))).map((r) => r.anahtar));
t("tekilleştirme adayları canlıda var ve kararlı", K.every((r) => r.canliTekillestirme.adaylar.every((c: any) => P.some((x) => x.slug === c.slug) && /^(AYRI|AYNI_ADRES_INCELE)/.test(c.karar))));
t("tekilleştirme sonucu adaylarla tutarlı", K.every((r) => (r.canliTekillestirme.sonuc === "inceleme-gerekli") === r.canliTekillestirme.adaylar.some((c: any) => c.karar.startsWith("AYNI"))));

/* 4 */
const tam = K.filter((r) => r.sonuc === "TAMAMLANDI");
const kapiVar = (s: string, no: string) => new RegExp(`No\\.?\\s*:?\\s*${no.replace("/", "\\/")}(?![0-9A-Za-z])`, "i").test(s);
t("tamamlananda kapı no resmî bulguda ve tarihli bağımsız kaynakta aynı", tam.every((r) => r.kontroller.some((c: any) => /resmî|işletmeci/.test(c.tur) && !/tahmini/.test(c.tur) && c.http === 200 && kapiVar(c.bulgu, r.tamamlanan.kapiNo)) && r.mevcutKanit.some((m: string) => { const d = m.match(/\((\d{4}-\d{2}-\d{2})\)/); return !!d && d[1] >= "2025-11-15" && kapiVar(m, r.tamamlanan.kapiNo); })));
const bek = K.filter((r) => r.sonuc === "BEKLIYOR");
t("bekleyende kalan eksik ve neden yazılı, tamamlanan boş", bek.every((r) => r.kalanEksik.length > 0 && !!r.bekleyisNedeni && r.tamamlanan === null));
const s = D.sayim;
t("sayım tutarlı", s.secilen === K.length && s.tamamlandi === tam.length && s.bekliyor === bek.length && s.acilanUrl === K.reduce((a, r) => a + r.kontroller.length, 0) && s.arama === K.reduce((a, r) => a + r.arama.length, 0) && Object.values(s.bekleyisNedeni as Record<string, number>).reduce((a, b) => a + b, 0) === bek.length);

/* 5 */
t("park sayfası / çözülmeyen / 403 / 404 kontrolü kanıt olarak tamamlamaya katılmadı", K.filter((r) => r.kontroller.some((c: any) => /tahmini/.test(c.tur) || c.http !== 200)).every((r) => r.sonuc === "BEKLIYOR" || r.kontroller.some((c: any) => !/tahmini/.test(c.tur) && c.http === 200)));
t("Google/Maps kaynağı yok", !/google\.[a-z.]+\/maps|maps\.app\.goo|goo\.gl\/maps/i.test(ham));
t("toplayıcı site kontrol olarak kullanılmadı", K.every((r) => r.kontroller.every((c: any) => !/joinpearl|mesprestiges|enprimeurclub|tripaligner|restaurantguru|wanderlog|trip\.com|yandex|migros/.test(c.url))));
t("puan, koordinat, yorum/menü alanı yok", !/"(rating|puan|yorum|score|menu|lat|lng|lon)"\s*:/.test(ham) && !/\d+([,.]\d)?\/20\b/.test(ham) && !/TOQUE/i.test(ham));

console.log(`toplu teslim eki 4 (ikinci kanıt turu): ${ok}/${ok + fail} · seçilen ${K.length} · tamamlandı ${tam.length} · bekliyor ${bek.length}`);
process.exit(fail ? 1 : 0);
