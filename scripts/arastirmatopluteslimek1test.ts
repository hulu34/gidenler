/* Toplu teslim manifesti eki 1 — kalite testi (yalnız okur).
   1. Katalog korunur (data/real taban ile aynı); #56 manifesti değişmedi (4fbd882 ile aynı).
   2. Kapsam: 52 çözülemeyen eşleşme + 14 eksik adres = iyi + belirsiz + yayımlanmış düzeltmesi; her kayıt tam bir kez.
   3. İyi kanıtlı: yayımlanmamış, #57 dışında; resmî site + G&M 2026 (son 12 ay), sokak + kapı no eşleşti; tür rehber etiketinden; kapı no dolu.
   4. Belirsizlerin öncelik ve gerekçesi var; kapı numarasız ya da tür etiketsiz kayıt iyi değil.
   5. Platform+editoryal istisnası doğrulanmamış işaretli; YorumS/yayımlanmış kayıt bulguları düzeltilmeden kayıtlı.
   6. Puan/yorum/koordinat yok.
   Kullanım: TABAN=<sha> npx tsx scripts/arastirmatopluteslimek1test.ts */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, typeof not === "string" ? not : JSON.stringify(not).slice(0, 300)); } };
const TABAN = process.env.TABAN ?? "origin/feature/investor-v1";
const show = (ref: string, p: string) => execFileSync("git", ["show", `${ref}:${p}`], { encoding: "utf8", maxBuffer: 256 << 20 });
type Kaynak = { tur: string; url: string; yayin: string | null; erisim: string };
type Iyi = { anahtar: string; ad: string; ilce: string; kategori: string; categoryId: string; kind: string | null; kindKaynagi: string; adres: { resmi: string | null; rehber: string; kapiNo: string | null };
  kaynaklar: Kaynak[]; karsilastirma: Record<string, string>; pr57: unknown; yayin: string };
type Bel = { anahtar: string; ad: string; kaynakKodu: string; oncelik: number; gerekce: string };
type Duz = { anahtar: string; alan: string; yeni: unknown; dayanak?: string; slug?: string };
const E = JSON.parse(readFileSync("data/arastirma/toplu-teslim/ek-1.json", "utf8")) as { sayim: Record<string, unknown>; iyiKanitli: Iyi[]; belirsiz: Bel[]; duzeltmeler56: Duz[];
  yayimlanmisKayitBulgulari: { kayit: string; slug: string | null; bulgu: string }[]; pr57: { sha: string; bekletme: string[] }; temel: { sha: string } };
const M = JSON.parse(readFileSync("data/arastirma/toplu-teslim/manifest.json", "utf8")) as { sorunlu: Record<string, string[]>; kayitlar: { anahtar: string; ad: string }[] };

/* 1 */
for (const f of ["data/real/venues.json", "data/real/isletme.json", "data/real/kapanis.json"]) t(`${f} taban ile aynı`, readFileSync(f, "utf8") === show(TABAN, f));
t("#56 manifesti değişmedi", readFileSync("data/arastirma/toplu-teslim/manifest.json", "utf8") === show(E.temel.sha, "data/arastirma/toplu-teslim/manifest.json"));
const PV = [...JSON.parse(readFileSync("data/real/venues.json", "utf8")), ...JSON.parse(readFileSync("data/real/isletme.json", "utf8"))] as { slug: string; name: string; district: string }[];
const PS = new Set(PV.map((x) => x.slug));

/* 2 */
const kapsam = [...M.sorunlu["baska-kayitla-eslesmis"], ...M.sorunlu["eksik-adres"]].sort();
const yayinDuz = E.duzeltmeler56.filter((d) => d.alan === "teslim/yayin").map((d) => d.anahtar);
const ekIds = [...E.iyiKanitli.map((x) => x.anahtar), ...E.belirsiz.map((x) => x.anahtar), ...yayinDuz].sort();
t("kapsam: 52 + 14 kaydın her biri tam bir kez", JSON.stringify(ekIds) === JSON.stringify(kapsam), { ek: ekIds.length, kapsam: kapsam.length });
t("sayım tutarlı", E.sayim.iyiKanitli === E.iyiKanitli.length && E.sayim.belirsiz === E.belirsiz.length && E.sayim.duzeltme56 === E.duzeltmeler56.length);

/* 3 */
const P57 = JSON.parse(show(E.pr57.sha, "docs/katalog/toplu-848-kabul.json")) as { records: { slug: string; candidateKey: string }[]; holds: { candidateKey: string }[] };
const p57 = new Set([...P57.records.map((r) => r.candidateKey), ...P57.holds.map((h) => h.candidateKey)]);
const fold = (s: string) => s.replace(/ı/g, "i").replace(/İ/g, "i").toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
for (const x of E.iyiKanitli) {
  const resmi = x.kaynaklar.find((k) => /resmî/.test(k.tur)), gm = x.kaynaklar.find((k) => /G&M 2026/.test(k.tur));
  t(`${x.ad}: resmî site + G&M 2026 (son 12 ay)`, !!resmi && !!gm && (gm.yayin ?? "") >= "2025-11-15" && new URL(resmi.url).host !== new URL(gm.url).host, x.kaynaklar);
  t(`${x.ad}: ad, sokak ve kapı no eşleşti; kapı no dolu`, x.karsilastirma.ad === "eşleşti" && x.karsilastirma.sokak === "eşleşti" && x.karsilastirma.kapiNo === "eşleşti" && !!x.adres.kapiNo && !!x.adres.resmi && !!x.adres.rehber);
  t(`${x.ad}: tür rehber etiketinden, kategori ayrı`, !!x.kind && /G&M 2026 rehber/.test(x.kindKaynagi) && ["restoran", "kafe", "bar"].includes(x.kategori) && /^cat\./.test(x.categoryId));
  t(`${x.ad}: yayımlanmamış ve Production'da aynı ilçede aynı ad yok`, x.yayin === "yayimlanmadi" && !PV.some((p) => fold(p.name) === fold(x.ad) && fold(p.district) === fold(x.ilce)));
  t(`${x.ad}: #57 dışında`, x.pr57 === null && !p57.has(x.anahtar));
  t(`${x.ad}: erişim tarihleri`, x.kaynaklar.every((k) => /^\d{4}-\d{2}-\d{2}$/.test(k.erisim)));
}
t("Lokanta by Divan düzeltmesi Production'da", yayinDuz.length === 1 && E.duzeltmeler56.filter((d) => d.alan === "teslim/yayin").every((d) => !!d.slug && PS.has(d.slug!)));

/* 4 */
for (const b of E.belirsiz) t(`${b.ad}: belirsiz — öncelik ve gerekçe`, [1, 2, 3].includes(b.oncelik) && b.gerekce.length > 10);
t("tür etiketi olmayan (Az Çok Thai, Slow Bebek) iyi değil", ["Az Çok Thai", "Slow Bebek"].every((n) => E.belirsiz.some((b) => b.ad === n)) && !E.iyiKanitli.some((x) => ["Az Çok Thai", "Slow Bebek"].includes(x.ad)));
t("14 eksik adresin hiçbiri iyi değil", M.sorunlu["eksik-adres"].every((a) => E.belirsiz.some((b) => b.anahtar === a)));

/* 5 */
const pol = E.duzeltmeler56.filter((d) => d.alan === "kanitPolitikasi");
t("platform+editoryal istisnası 3 kayıtta DOGRULANMAMIS, dayanak yazılı", pol.length === 3 && pol.every((d) => d.yeni === "DOGRULANMAMIS" && /Platform \+ editoryal yeter/.test(d.dayanak ?? "")));
t("#57 bekletmeleri doğrulanmamış listede", E.pr57.bekletme.every((k) => pol.some((d) => d.anahtar === k)));
t("Nappo ilçe alanında not yok", E.duzeltmeler56.some((d) => d.anahtar === "nappo pizza|" && d.alan === "ilce" && d.yeni === null));
t("Eleos kapı çelişkisi kayıtlı (düzeltilmeden)", E.yayimlanmisKayitBulgulari.some((y) => y.slug === "eleos-yesilkoy-bakirkoy" && /No:5/.test(y.bulgu) && /No:9/.test(y.bulgu)));
t("yayımlanmış kayıt bulgularındaki slug'lar Production'da", E.yayimlanmisKayitBulgulari.every((y) => y.slug !== null && PS.has(y.slug)));

/* 6 */
const ham = readFileSync("data/arastirma/toplu-teslim/ek-1.json", "utf8");
t("puan/yorum alanı yok", !/"(rating|reviews?|puan|yorum|toque)"\s*:/i.test(ham) && !/\d+([,.]\d)?\/20\b/.test(ham));
t("koordinat yazılmadı", !/"(lat|lng|lon)"\s*:/.test(ham));

console.log(`toplu teslim ek-1: ${ok}/${ok + fail} · iyi ${E.iyiKanitli.length} · belirsiz ${E.belirsiz.length} · düzeltme ${E.duzeltmeler56.length}`);
process.exit(fail ? 1 : 0);
