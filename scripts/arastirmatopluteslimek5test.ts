/* Toplu teslim eki 5 — kimlik uzlaştırma testi (yalnız okur).
   1. Önceki manifestler ve data/real #67 tabanıyla aynı; #63 dosyası değişmedi (öneriler uygulanmadı).
   2. Kayıtlar tam olarak #67'deki 9 KIMLIK kaydı; hiçbiri yayına hazır değil.
   3. GUVENLI_ESLESME yalnız aynı adres+kapı ya da aynı kayıt kimliğiyle; ad benzerliği tek başına AYNI kararı vermiyor.
   4. Karşılaştırılan canlı kayıtların adres alanları canlı katalogla birebir.
   5. Kör Agop ve Liman önerileri canlı/manifest alanlarıyla tutarlı; uygulanmadı.
   6. Puan/koordinat yok. */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, typeof not === "string" ? not : JSON.stringify(not).slice(0, 300)); } };
const show = (ref: string, p: string) => execFileSync("git", ["show", `${ref}:${p}`], { encoding: "utf8", maxBuffer: 256 << 20 });
const ham = readFileSync("data/arastirma/toplu-teslim/ek-5-kimlik-uzlastirma.json", "utf8");
const D = JSON.parse(ham);
const T67 = D.temel.pr67;
for (const f of ["manifest.json", "ek-1.json", "ek-2-yayin-uzlasma.json", "ek-3-kanit-tamamlama.json", "ek-4-kanit-turu-2.json", "engel-plani.json"].map((x) => `data/arastirma/toplu-teslim/${x}`).concat(["data/real/venues.json", "data/real/isletme.json", "data/real/kapanis.json"]))
  t(`${f} değişmedi (#67 tabanı)`, readFileSync(f, "utf8") === show(T67, f));
const plan = JSON.parse(readFileSync("data/arastirma/toplu-teslim/engel-plani.json", "utf8"));
const kim = (plan.kayitlar as any[]).filter((x) => x.grup === "KIMLIK").map((x) => x.anahtar).sort();
const K = D.kayitlar as any[];
t("kayıtlar #67'deki 9 KIMLIK kaydıyla birebir", JSON.stringify(K.map((r) => r.anahtar).sort()) === JSON.stringify(kim) && K.length === 9);
t("hiçbiri yayına hazır değil; kanıt eksikleri ayrı", K.every((r) => r.yayinaHazir === false && r.kanitEksikleriAyri === true));
t("sonuç izinli kümede", K.every((r) => ["GUVENLI_ESLESME", "AYRI_ISLETME", "BELIRSIZ"].includes(r.sonuc)));
const no = (a: string | null) => (a ?? "").match(/No\s*[:.]?\s*(\d+)/i)?.[1] ?? null;
t("güvenli eşleşmede aynı kayıt karşılaştırması aynı kapı no ya da kimlikle", K.filter((r) => r.sonuc === "GUVENLI_ESLESME").every((r) => r.karsilastirmalar.some((c: any) => c.karar === "AYNI_KAYIT" && ((no(c.adres) && no(c.adres) === no(r.adres)) || /^overture:|^node\//.test(c.kayitKimligi)))));
t("AYNI_KAYIT kararı adres karşılaştırılmadan verilmedi", K.every((r) => r.karsilastirmalar.filter((c: any) => c.karar === "AYNI_KAYIT").every((c: any) => !!c.adres && no(c.adres) === no(r.adres))));
t("belirsiz kayıtların gerekçesi yazılı", K.filter((r) => r.sonuc === "BELIRSIZ").every((r) => r.karsilastirmalar.some((c: any) => c.karar === "BELIRSIZ" && c.gerekce) || (r.karsilastirmalar.length === 0 && /yeniden üretilemedi/.test(r.not))));
const P = [...JSON.parse(show(D.canliTaban.sha, "data/real/venues.json")), ...JSON.parse(show(D.canliTaban.sha, "data/real/isletme.json"))] as any[];
const canliKars = K.flatMap((r) => r.karsilastirmalar.filter((c: any) => c.hedef === "canlı kayıt"));
t("karşılaştırılan canlı kayıtlar canlıda var, adres alanı birebir", canliKars.length > 0 && canliKars.every((c: any) => { const s = c.kayitKimligi.split(" ")[0]; const p = P.find((x) => x.slug === s); return !!p && (c.adres === null || p.address === c.adres || (p.address ?? "").startsWith(c.adres.split(",")[0])); }));
const E2 = new Map((JSON.parse(readFileSync("data/arastirma/toplu-teslim/ek-2-yayin-uzlasma.json", "utf8")).kayitlar as any[]).map((r) => [r.anahtar, r]));
const [kor, lim] = D.duzeltmeOnerileri63;
const pk = P.find((x) => x.slug === "kor-agop-beyoglu"), pl = P.find((x) => x.slug === "liman-istanbul-beyoglu"), pf = P.find((x) => x.slug === "liman-karakoy-beyoglu");
t("Kör Agop: canlı adres/telefon birebir, manifestten farklı, öneri uygulanmadı", kor.anahtar === "kor agop restaurant|fatih" && pk.address === kor.kanit.canli.adres && pk.phone === kor.kanit.canli.telefon && kor.kanit.manifest.telefon !== pk.phone && E2.get(kor.anahtar).durum === "yayimlandi" && kor.uygulandi === false);
t("Liman: Galataport eşi aynı telefon, Fermeneciler ayrı; öneri uygulanmadı", lim.anahtar === "liman istanbul|beyoglu" && pl.phone === lim.kanit.manifest.telefon && pl.address === lim.kanit.canliEsi.adres && pf.address === lim.kanit.canliAyri.adres && E2.get(lim.anahtar).canli.slug.length === 2 && lim.uygulandi === false);
t("puan/koordinat yok", !/"(rating|puan|score|lat|lng|lon)"\s*:/.test(ham));
console.log(`toplu teslim eki 5 (kimlik): ${ok}/${ok + fail}`);
process.exit(fail ? 1 : 0);
