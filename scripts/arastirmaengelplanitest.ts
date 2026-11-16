/* Toplu engel ve karar planı — kalite testi (yalnız okur).
   1. Manifestler ve data/real #66 tabanıyla aynı (plan hiçbir veriyi değiştirmez).
   2. #63'teki 708 kanıt bekleyen kaydın her biri planda tek satır; başka kayıt yok.
   3. Grup × kategori sayımı satırlardan yeniden hesaplanır; kategori #63 ile aynı.
   4. Plan hiçbir kaydı kabul etmez: tamamlandı/kabul alanı yok; İBB kayıtları kanıt-tamam grubunda değil.
   5. Standarda uyumu belirsiz kaynak türleri 'ÖNERİ' olarak işaretli; Harun kararları standart değişikliği olarak ayrı.
   6. Puan/koordinat yok. */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, typeof not === "string" ? not : JSON.stringify(not).slice(0, 300)); } };
const show = (ref: string, p: string) => execFileSync("git", ["show", `${ref}:${p}`], { encoding: "utf8", maxBuffer: 256 << 20 });
const ham = readFileSync("data/arastirma/toplu-teslim/engel-plani.json", "utf8");
const D = JSON.parse(ham);
const T66 = D.temel.pr66;
for (const f of ["manifest.json", "ek-1.json", "ek-2-yayin-uzlasma.json", "ek-3-kanit-tamamlama.json", "ek-4-kanit-turu-2.json"].map((x) => `data/arastirma/toplu-teslim/${x}`).concat(["data/real/venues.json", "data/real/isletme.json", "data/real/kapanis.json"]))
  t(`${f} değişmedi (#66 tabanı)`, readFileSync(f, "utf8") === show(T66, f));
const E2 = (JSON.parse(readFileSync("data/arastirma/toplu-teslim/ek-2-yayin-uzlasma.json", "utf8")).kayitlar as any[]).filter((r) => r.durum === "kanit-bekliyor");
const K = D.kayitlar as any[];
t("708 kayıt, tekil, #63 kanıt bekleyenlerle birebir", K.length === 708 && E2.length === 708 && new Set(K.map((r) => r.anahtar)).size === 708 && E2.every((r) => K.some((x) => x.anahtar === r.anahtar)));
t("kategori #63 ile aynı", K.every((x) => E2.find((r) => r.anahtar === x.anahtar).kategori === x.kategori));
const tab = D.sayim.grupKategori;
t("grup × kategori sayımı satırlarla tutarlı", Object.keys(tab).every((g) => ["restoran", "kafe", "belirsiz"].every((k) => tab[g][k] === K.filter((x) => x.grup === g && x.kategori === k).length) && tab[g].toplam === K.filter((x) => x.grup === g).length) && Object.values(tab).reduce((a: number, v: any) => a + v.toplam, 0) === 708);
t("her satırın grubu tanımlı", K.every((x) => x.grup in D.gruplar && x.altGrup && x.dayanak));
t("plan kabul/tamamlandı alanı içermiyor", !/"(sonuc|kabul|yayin)"\s*:/.test(ham) && !/TAMAMLANDI/.test(ham.replace(/KANIT_TAMAM_KARAR_BEKLIYOR/g, "")));
t("İBB kayıtları kanıt-tamam grubunda değil", K.filter((x) => x.anahtar.startsWith("ibb ")).every((x) => x.grup !== "KANIT_TAMAM_KARAR_BEKLIYOR") && K.filter((x) => x.anahtar.startsWith("ibb ")).length === 4);
t("kanıt-tamam grubu yalnız #65'in üç kaydı", JSON.stringify(K.filter((x) => x.grup === "KANIT_TAMAM_KARAR_BEKLIYOR").map((x) => x.anahtar).sort()) === JSON.stringify(["az cok thai|beyoglu", "hamdi restaurant|fatih", "sahan|kadikoy"]));
t("standarda uyumu belirsiz kaynak türleri ÖNERİ olarak işaretli", D.kaynakTurleri.every((k: any) => /^ÖNERİ/.test(k.standartDurumu) || /uygun/.test(k.standartDurumu) || /bağımsız sayılmıyor|yasak/.test(k.standartDurumu)));
t("Harun kararları standart değişikliği olarak ayrı", D.kararTablosu.filter((k: any) => /Harun/.test(k.kim)).every((k: any) => k.standartDegisir === true) && D.kararTablosu.filter((k: any) => !/Harun/.test(k.kim)).every((k: any) => k.standartDegisir === false));
t("puan/koordinat yok", !/"(rating|puan|score|lat|lng|lon)"\s*:/.test(ham));
console.log(`engel planı: ${ok}/${ok + fail} · kayıt ${K.length}`);
process.exit(fail ? 1 : 0);
