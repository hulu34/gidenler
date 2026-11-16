/* Toplu teslim eki 2 — yayın durumu uzlaşması kalite testi (yalnız okur).
   1. #56 manifesti, #58 eki ve data/real bu dalda değişmedi (temel SHA'larla birebir).
   2. Canlı taban sayıları (toplam/aktif/kategori) GUNCEL kataloğundan yeniden hesaplanır.
   3. Her manifest kaydı tek satır; "yayimlandi" slug'ları canlıda var, ekleyen PR Production hattındaki ilk görünüşle aynı.
   4. Yayımlanmamış hiçbir kayıt canlı bir slug'a (#57/#59/#62 candidateKey ya da ad+ilçe birebir) bağlı değil.
   5. #57/#59/#62 kabul kayıtlarının manifestteki karşılığı "yayimlandi" ve aynı slug.
   6. Maderia kullanıcı beklemesinde; Suna yayımlanmış, belirsizlik notu var, yeniden araştırılmadı; sayım tablosu kayıtlarla tutarlı.
   7. Puan/koordinat yok.
   Kullanım: GUNCEL=<ref> npx tsx scripts/arastirmatopluteslimek2test.ts (varsayılan: dosyadaki canliTaban.sha) */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, typeof not === "string" ? not : JSON.stringify(not).slice(0, 400)); } };
const show = (ref: string, p: string) => execFileSync("git", ["show", `${ref}:${p}`], { encoding: "utf8", maxBuffer: 256 << 20 });
const DOSYA = "data/arastirma/toplu-teslim/ek-2-yayin-uzlasma.json";
const ham = readFileSync(DOSYA, "utf8");
const D = JSON.parse(ham);
const GUNCEL = process.env.GUNCEL ?? D.canliTaban.sha;
const fold = (s: string | null) => (s ?? "").replace(/ı/g, "i").replace(/İ/g, "i").toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
type V = { slug: string; name: string; district: string; categoryId: string };
const katalog = (ref: string) => {
  const v = [...JSON.parse(show(ref, "data/real/venues.json")), ...JSON.parse(show(ref, "data/real/isletme.json"))] as V[];
  const k = JSON.parse(show(ref, "data/real/kapanis.json")) as Record<string, { state?: string }>;
  const kap = new Set(Object.entries(k).filter(([a, b]) => a !== "_aciklama" && b?.state === "closed_confirmed").map(([a]) => a));
  return { v, kap };
};

/* 1 */
const T56 = D.temel.pr56.sha, T58 = D.temel.pr58.sha;
t("#56 manifesti temel SHA ile aynı", readFileSync("data/arastirma/toplu-teslim/manifest.json", "utf8") === show(T56, "data/arastirma/toplu-teslim/manifest.json"));
t("#58 eki temel SHA ile aynı", readFileSync("data/arastirma/toplu-teslim/ek-1.json", "utf8") === show(T58, "data/arastirma/toplu-teslim/ek-1.json"));
for (const f of ["data/real/venues.json", "data/real/isletme.json", "data/real/kapanis.json"]) t(`${f} değişmedi (#58 tabanı)`, readFileSync(f, "utf8") === show(T58, f));

/* 2 */
const C = katalog(GUNCEL);
const akt = C.v.filter((x) => !C.kap.has(x.slug));
const say = (c: string) => akt.filter((x) => x.categoryId === c).length;
t("canlı toplam / aktif / kapalı", D.canliTaban.toplam === C.v.length && D.canliTaban.aktif === akt.length && D.canliTaban.kapali === C.kap.size, [C.v.length, akt.length, C.kap.size]);
t("canlı aktif kategori (restoran/kafe/bar)", D.canliTaban.aktifKategori["cat.restaurant"] === say("cat.restaurant") && D.canliTaban.aktifKategori["cat.cafe"] === say("cat.cafe") && D.canliTaban.aktifKategori["cat.bar"] === say("cat.bar"));
t("canlı taban 876 / 841 / 716 restoran", C.v.length === 876 && akt.length === 841 && say("cat.restaurant") === 716 || GUNCEL !== D.canliTaban.sha);

/* 3 */
const M = JSON.parse(readFileSync("data/arastirma/toplu-teslim/manifest.json", "utf8")).kayitlar as { anahtar: string; ad: string; ilce: string }[];
const K = D.kayitlar as any[];
t("883 kayıt, her manifest anahtarı tek satır", K.length === M.length && new Set(K.map((r) => r.anahtar)).size === K.length && M.every((m) => K.some((r) => r.anahtar === m.anahtar)));
const DUR = ["yayimlandi", "kabul-adayi", "kanit-bekliyor", "mukerrer", "kullanici-beklemesi", "kapsam-disi-veya-ret"];
t("durum ve kategori izinli kümede", K.every((r) => DUR.includes(r.durum) && ["restoran", "kafe", "bar", "belirsiz"].includes(r.kategori)));
const ILK = new Map<string, number | null>();
for (const p of D.canliPaketler as { pr: number | null; sha: string }[]) for (const x of katalog(p.sha).v) if (!ILK.has(x.slug)) ILK.set(x.slug, p.pr);
const PS = new Map(C.v.map((x) => [x.slug, x]));
const CAT: Record<string, string> = { "cat.restaurant": "restoran", "cat.cafe": "kafe", "cat.bar": "bar" };
const yay = K.filter((r) => r.durum === "yayimlandi");
t("yayımlanan slug'ların hepsi canlıda", yay.every((r) => r.canli.slug.every((s: string) => PS.has(s))), yay.filter((r) => !r.canli.slug.every((s: string) => PS.has(s))).map((r) => r.anahtar));
t("ekleyen PR = Production hattında ilk görünüş", yay.every((r) => r.canli.slug.every((s: string, i: number) => ILK.get(s) === r.canli.ekleyenPr[i])));
t("yayımlananın kategorisi canlı categoryId", yay.every((r) => r.canli.slug.every((s: string) => CAT[PS.get(s)!.categoryId] === r.kategori)));
t("yayımlanan aktif/kapalı canlı kapanış dosyasıyla aynı", yay.every((r) => (r.altDurum === "aktif") === r.canli.slug.every((s: string) => !C.kap.has(s))));

/* 4, 5 */
const PK = new Map<string, string[]>();
for (const x of C.v) { const k = fold(x.name) + "|" + fold(x.district); PK.set(k, [...(PK.get(k) ?? []), x.slug]); }
const acc = new Map<string, string>();
for (const f of ["toplu-848-kabul", "toplu-860-kabul", "toplu-870-kabul"]) for (const r of JSON.parse(show(GUNCEL, `docs/katalog/${f}.json`)).records) acc.set(r.candidateKey, r.slug);
const yayimlanmamis = K.filter((r) => r.durum !== "yayimlandi" && !(r.durum === "mukerrer" && r.altDurum === "canli-slug-paylasimi"));
t("yayımlanmamış kayıt #57/#59/#62 candidateKey ile canlıya bağlı değil", yayimlanmamis.every((r) => !(acc.has(r.anahtar) && PS.has(acc.get(r.anahtar)!))));
t("yayımlanmamış kayıt ad+ilçe birebir canlıda yok", yayimlanmamis.every((r) => !PK.has(r.anahtar)), yayimlanmamis.filter((r) => PK.has(r.anahtar)).map((r) => r.anahtar));
const accM = [...acc].filter(([k]) => M.some((m) => m.anahtar === k));
t("#57/#59/#62 kabul kayıtları manifestte yayimlandi ve aynı slug", accM.length === 28 && accM.every(([k, s]) => { const r = K.find((x) => x.anahtar === k); return r.durum === "yayimlandi" && r.canli.slug.includes(s); }), accM.length);
t("paylaşılan canlı slug yalnız mükerrer satırda tekrar ediyor", (() => { const c = new Map<string, number>(); for (const r of yay) for (const s of r.canli.slug) c.set(s, (c.get(s) ?? 0) + 1); return [...c.values()].every((n) => n === 1); })());

/* 6 */
const bul = (a: string) => K.find((r) => r.anahtar === a);
t("Maderia kullanıcı beklemesinde ve tek", bul("maderia sushi bar|sisli")?.durum === "kullanici-beklemesi" && K.filter((r) => r.durum === "kullanici-beklemesi").length === 1);
const suna = bul("suna nin yeri|uskudar");
t("Suna yayımlanmış; belirsizlik #60/#61 notuyla, yeniden araştırılmadı", suna?.durum === "yayimlandi" && (suna.notlar ?? []).some((n: string) => /#60/.test(n) && /#61/.test(n) && /yeniden araştırılmadı/.test(n)));
t("platform + editoryal istisnasına dayanan kayıtlar kabul adayı değil", K.filter((r) => r.altDurum === "kanit-politikasi-dogrulanmamis").length === 3 && K.filter((r) => r.altDurum === "kanit-politikasi-dogrulanmamis").every((r) => r.durum === "kanit-bekliyor" && r.kullaniciTeyidiGerekir === true));
const tab = D.sayim.durumKategori;
t("sayım tablosu kayıtlarla tutarlı", DUR.every((d) => tab[d].toplam === K.filter((r) => r.durum === d).length && ["restoran", "kafe", "bar", "belirsiz"].every((k) => tab[d][k] === K.filter((r) => r.durum === d && r.kategori === k).length)) && DUR.reduce((a, d) => a + tab[d].toplam, 0) === K.length);
t("pakete göre yayımlanan toplamı = yayımlanan kayıt", Object.values(D.sayim.yayimlandiPakete as Record<string, number>).reduce((a, b) => a + b, 0) === yay.length);

/* 7 */
t("puan alanı ya da rehber puanı yok", !/"(rating|puan|yorum|score)"\s*:/.test(ham) && !/\d+([,.]\d)?\/20\b/.test(ham) && !/TOQUE/i.test(ham));
t("koordinat yazılmadı", !/"(lat|lng|lon)"\s*:/.test(ham));

console.log(`toplu teslim eki 2 (yayın uzlaşması): ${ok}/${ok + fail}`);
process.exit(fail ? 1 : 0);
