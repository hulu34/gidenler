/* Ortak araştırma güncel durum — kalite testi (yalnız okur).
   1. Eski ek dosyaları, engel planı, kabul raporları (docs/katalog) ve data/real #68 tabanıyla aynı.
   2. 883 kayıt ek-2 ile aynı anahtarlar; yalnız Kör Agop ve Liman'ın durum/canlı bağı değişti, diğerleri ek-2 ile aynı.
   3. Kör Agop: kanıt bekliyor, canlı bağ yok, eski bağ izi duruyor; canlı Beyoğlu kaydı var ve değişmedi.
   4. Liman: yalnız liman-istanbul-beyoglu; mükerrer notu yok; liman-karakoy-beyoglu hiçbir kayda bağlı değil.
   5. Grandma güvenli eşleşme ama kanıt bekliyor; diğer 8 kimlik belirsiz ve KIMLIK grubunda.
   6. Sayımlar ve canlı taban güncel kataloğa göre yeniden hesaplanır; değişiklik günlüğü tam.
   Kullanım: GUNCEL=<ref> npx tsx scripts/arastirmaguncelduruntest.ts (varsayılan origin/feature/investor-v1) */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, typeof not === "string" ? not : JSON.stringify(not).slice(0, 300)); } };
const git = (...a: string[]) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 << 20 });
const show = (ref: string, p: string) => git("show", `${ref}:${p}`);
const ham = readFileSync("data/arastirma/toplu-teslim/guncel-durum.json", "utf8");
const D = JSON.parse(ham);
const T68 = D.temel.pr68, GUNCEL = process.env.GUNCEL ?? "origin/feature/investor-v1";
const B = "data/arastirma/toplu-teslim/";
for (const f of ["manifest.json", "ek-1.json", "ek-2-yayin-uzlasma.json", "ek-3-kanit-tamamlama.json", "ek-4-kanit-turu-2.json", "engel-plani.json", "ek-5-kimlik-uzlastirma.json"].map((x) => B + x).concat(["data/real/venues.json", "data/real/isletme.json", "data/real/kapanis.json"]))
  t(`${f} değişmedi (#68 tabanı)`, readFileSync(f, "utf8") === show(T68, f));
t("kabul raporları (docs/katalog) değişmedi", git("diff", "--name-only", T68, "--", "docs/katalog").trim() === "");
const E2 = JSON.parse(readFileSync(B + "ek-2-yayin-uzlasma.json", "utf8")).kayitlar as any[];
const K = D.kayitlar as any[];
const X = new Map(K.map((r) => [r.anahtar, r]));
t("883 kayıt, ek-2 ile aynı anahtarlar", K.length === 883 && E2.every((r) => X.has(r.anahtar)));
const DEGISEN = ["kor agop restaurant|fatih", "liman istanbul|beyoglu"];
const ozet = (r: any) => JSON.stringify([r.durum, r.altDurum, r.kategori, r.canli?.slug ?? null]);
t("yalnız Kör Agop ve Liman'ın durum/canlı bağı değişti", E2.filter((r) => ozet(r) !== ozet(X.get(r.anahtar))).map((r) => r.anahtar).sort().join() === "kor agop restaurant|fatih,liman istanbul|beyoglu");
t("diğer kayıtların ek-2 alanları aynen korundu", E2.filter((r) => !DEGISEN.includes(r.anahtar)).every((r) => { const y = { ...X.get(r.anahtar) }; delete y.kimlik; delete y.engel; delete y.ek6; delete y.kategoriOnerisi; /* ek-6 alanları ayrı testte */ if (y.canli && r.canli) y.canli = { ...y.canli, aktif: r.canli.aktif }; return JSON.stringify(y) === JSON.stringify(r); }));
const P = [...JSON.parse(show(GUNCEL, "data/real/venues.json")), ...JSON.parse(show(GUNCEL, "data/real/isletme.json"))] as any[];
const kap = JSON.parse(show(GUNCEL, "data/real/kapanis.json"));
const KAP = new Set(Object.entries(kap).filter(([a, b]: any) => a !== "_aciklama" && b?.state === "closed_confirmed").map(([a]) => a));
const kor = X.get("kor agop restaurant|fatih"), pk = P.find((x) => x.slug === "kor-agop-beyoglu");
t("Kör Agop kanıt bekliyor, canlı bağ yok, eski bağ izi var", kor.durum === "kanit-bekliyor" && kor.canli === null && kor.oncekiCanliBag?.slug?.[0] === "kor-agop-beyoglu" && kor.oncekiCanliBag.gecerli === false && kor.engel.grup === "ADRES_SUBE");
t("canlı Kör Agop Beyoğlu kaydı var ve #68 kanıtıyla aynı", !!pk && pk.address === "Asmalı Mescit Sokak No:55, Beyoğlu" && pk.phone === "+90 212 249 51 33");
const lim = X.get("liman istanbul|beyoglu");
t("Liman yalnız liman-istanbul-beyoglu; mükerrer notu yok", JSON.stringify(lim.canli.slug) === '["liman-istanbul-beyoglu"]' && !(lim.notlar ?? []).some((n: string) => /olası çift kayıt/.test(n)));
t("liman-karakoy-beyoglu hiçbir kayda bağlı değil, canlıda duruyor", !K.some((r) => r.canli?.slug?.includes("liman-karakoy-beyoglu")) && P.some((x) => x.slug === "liman-karakoy-beyoglu"));
const gr = X.get("grandma s wonderland|silivri");
t("Grandma güvenli eşleşme, kanıt bekliyor, engel kaynak eksiği", gr.kimlik.sonuc === "GUVENLI_ESLESME" && gr.durum === "kanit-bekliyor" && gr.engel.grup === "ISLETMECI_VE_BAGIMSIZ");
const E5 = JSON.parse(readFileSync(B + "ek-5-kimlik-uzlastirma.json", "utf8")).kayitlar as any[];
const bel = E5.filter((k) => k.sonuc === "BELIRSIZ").map((k) => X.get(k.anahtar));
t("diğer 8 kimlik belirsiz ve KIMLIK grubunda", bel.length === 8 && bel.every((r) => r.kimlik.sonuc === "BELIRSIZ" && r.durum === "kanit-bekliyor" && r.engel.grup === "KIMLIK") && K.filter((r) => r.engel?.grup === "KIMLIK").length === 8);
const yay = K.filter((r) => r.durum === "yayimlandi");
t("yayımlanan slug'lar güncel canlıda, aktiflik güncel kapanışla", yay.every((r) => r.canli.slug.every((s: string, i: number) => P.some((x) => x.slug === s) && r.canli.aktif[i] === !KAP.has(s))));
t("canlı taban güncel katalogdan yeniden hesaplandı", D.canliTaban.sha === git("rev-parse", GUNCEL).trim() && D.canliTaban.toplam === P.length && D.canliTaban.aktif === P.filter((x) => !KAP.has(x.slug)).length);
const tab = D.sayim.durumKategori;
t("durum × kategori sayımı satırlarla tutarlı", Object.keys(tab).every((d) => ["restoran", "kafe", "bar", "belirsiz"].every((k) => tab[d][k] === K.filter((r) => r.durum === d && r.kategori === k).length)));
const ys = new Set(yay.flatMap((r) => r.canli.slug));
t("yayımlanmış slug ve manifest dışı canlı sayısı tutarlı", D.sayim.yayimlandiSlug === ys.size && D.sayim.canliKatalogManifestDisi === P.length - ys.size);
t("engel grubu sayımı tutarlı", Object.entries(D.sayim.engelGrubu).every(([g, n]) => K.filter((r) => r.engel?.grup === g).length === n) && K.filter((r) => r.durum === "kanit-bekliyor").every((r) => !!r.engel));
t("değişiklik günlüğü: tarih, önceki/yeni, kaynak SHA, gerekçe", D.degisiklikler.length > 0 && D.degisiklikler.filter((d: any) => d.kaynak.pr === 68).length === 12 && D.degisiklikler.filter((d: any) => d.kaynak.pr === 68).every((d: any) => d.tarih === "2026-11-16" && "onceki" in d && d.yeni !== undefined && d.kaynak.sha === T68 && d.gerekce) && DEGISEN.every((a) => D.degisiklikler.some((d: any) => d.anahtar === a)));
t("puan/koordinat yok", !/"(rating|puan|score|lat|lng|lon)"\s*:/.test(ham));
console.log(`güncel durum: ${ok}/${ok + fail}`);
process.exit(fail ? 1 : 0);
