/* Ek 6 — Hamdi Eminönü kapı no + Az Çok Thai kategori — kalite testi (yalnız okur).
   1. Eski ekler, engel planı, kabul raporları (docs/katalog), data/real ve eski test betikleri #69 tabanıyla aynı.
   2. Her kaynak satırı: URL, erişim tarihi, yayın/güncelleme alanı, şube adı, ham adres, kapı no ve kanıtladığı alan.
   3. Hamdi: 11/17 çelişkisi açıkça BEKLIYOR; telefonlar ham ve birbirine dönüştürülmemiş; telefon alanı boş; Şişli karışmamış.
   4. Az Çok Thai: kategori kararı işletmeci öz tanımı + yemek servisine dayanır; kategori alanı ve sayımlar değişmez.
   5. Koşullu kayıtlar otomatik kabul edilmez; ortak güncel kayıttaki engel ek-6 sonucuyla aynı; günlük tam.
   Kullanım: GUNCEL=<ref> npx tsx scripts/arastirmatopluteslimek6test.ts (varsayılan origin/feature/investor-v1) */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, typeof not === "string" ? not : JSON.stringify(not).slice(0, 300)); } };
const git = (...a: string[]) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 << 20 });
const show = (ref: string, p: string) => git("show", `${ref}:${p}`);
const B = "data/arastirma/toplu-teslim/";
const ham6 = readFileSync(B + "ek-6-hamdi-azcok-karar.json", "utf8");
const E6 = JSON.parse(ham6);
const D = JSON.parse(readFileSync(B + "guncel-durum.json", "utf8"));
const T69 = E6.temel.pr69, GUNCEL = process.env.GUNCEL ?? "origin/feature/investor-v1";
const D69 = JSON.parse(show(T69, B + "guncel-durum.json"));
const HAM = "hamdi restaurant|fatih", AZ = "az cok thai|beyoglu", HAMS = "hamdi restaurant sisli|sisli";

// 1. eski dosyalar
t("temel #69 tam SHA'sı ve ortak girişteki pr69 aynı", /^[0-9a-f]{40}$/.test(T69) && D.temel.pr69 === T69);
for (const f of ["manifest.json", "ek-1.json", "ek-2-yayin-uzlasma.json", "ek-3-kanit-tamamlama.json", "ek-4-kanit-turu-2.json", "engel-plani.json", "ek-5-kimlik-uzlastirma.json"].map((x) => B + x).concat(["data/real/venues.json", "data/real/isletme.json", "data/real/kapanis.json"]))
  t(`${f} değişmedi (#69 tabanı)`, readFileSync(f, "utf8") === show(T69, f));
t("kabul raporları (docs/katalog) değişmedi", git("diff", "--name-only", T69, "--", "docs/katalog").trim() === "");
const eskiTest = ["arastirmatopluteslimtest.ts", "arastirmatopluteslimek2test.ts", "arastirmatopluteslimek3test.ts", "arastirmatopluteslimek4test.ts", "arastirmaengelplanitest.ts", "arastirmatopluteslimek5test.ts"].map((x) => "scripts/" + x);
t("eski ek test betikleri değişmedi", eskiTest.every((f) => { try { return readFileSync(f, "utf8") === show(T69, f); } catch { return false; } }));
const E3 = JSON.parse(readFileSync(B + "ek-3-kanit-tamamlama.json", "utf8")).kayitlar as any[];
t("#65'in tarihî 'TAMAMLANDI' kayıtları yerinde (geriye dönük yazım yok)", [HAM, AZ].every((a) => E3.find((r) => r.anahtar === a)?.sonuc === "TAMAMLANDI"));

// 2. kaynak satırları
const K6 = E6.kayitlar as any[];
t("ek-6 yalnız Hamdi Eminönü ve Az Çok Thai", K6.length === 2 && K6.map((r) => r.anahtar).sort().join() === [AZ, HAM].sort().join());
const tarih = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const h = K6.find((r) => r.anahtar === HAM), a = K6.find((r) => r.anahtar === AZ);
const hk = (h.kaynaklar as any[]).filter((k) => k.url);
t("Hamdi: açılan her kaynakta URL, erişim tarihi, HTTP 200, yayın/güncelleme alanı, şube adı, ham adres, sokak, kapı no, kanıtladığı alan",
  hk.length === 4 && hk.every((k) => tarih(k.erisim) && k.http === 200 && "yayin" in k && "guncelleme" in k && k.tarihNotu && k.subeAdi && k.hamAdres && k.sokak && k.kapiNo && "icKapi" in k && k.kanitladigi.length > 0));
t("Hamdi: tarih alanları ya null ya tam tarih", hk.every((k) => (k.yayin === null || tarih(k.yayin)) && (k.guncelleme === null || tarih(k.guncelleme))));
const ak = a.kaynaklar as any[];
t("Az Çok Thai: her kaynakta URL, erişim tarihi, HTTP 200, alıntı ve kanıtladığı alan", ak.length >= 2 && ak.every((k) => k.url?.startsWith("https://azcokthai.com") && tarih(k.erisim) && k.http === 200 && k.ifadeler.length > 0 && k.kanitladigi.length > 0));

// 3. Hamdi
const kapi = new Set(hk.map((k) => k.kapiNo));
t("Hamdi: 11 ve 17 kaynakları ayrı ayrı korunmuş", kapi.has("11") && kapi.has("17"));
t("Hamdi: çelişki açıkken sonuç BEKLIYOR ve kabul hazır değil", h.sonuc === "BEKLIYOR" && h.kabulHazir === false && h.otomatikKabul === false && h.kalanEksik.length > 0);
t("Hamdi: hiçbir hipotez kanıtlanmış sayılmadı", h.hipotezler.length === 4 && h.hipotezler.every((x: any) => x.sonuc !== "KANITLANDI" && x.gerekce));
t("Hamdi: 'eski' nitelemesi ölçümle (Time Out tarihi, Falstaff ölçülemedi)", /2024-04-10/.test(h.tarihOlcumu.timeOut) && /denemez/.test(h.tarihOlcumu.falstaff));
const rehber = (h.kaynaklar as any[]).find((k) => /2025 rehberi/.test(k.kaynak));
t("Hamdi: URL'si olmayan '2025 rehberi' kanıt sayılmadı", rehber && rehber.url === null && rehber.kanitladigi.length === 0);
const tel = h.telefon;
t("Hamdi: telefon alanı boş, resmî ve G&M numaraları ham ve farklı", tel.deger === null && tel.kaynaklar.resmi.includes("+90 212 528 03 90") && tel.kaynaklar.gm2026.includes("+90 212 528 09 30") && !tel.kaynaklar.gm2026.includes("+90 212 528 03 90"));
t("Hamdi: kaynak satırlarındaki telefonlar ham (G&M satırı 528 09 30, resmî satır 528 03 90)", hk.find((k) => /gault/.test(k.url)).telefon.join() === "+90 212 528 09 30" && hk.find((k) => /hamdi\.com\.tr/.test(k.url)).telefon.includes("+90 212 528 03 90"));
t("Hamdi: Eminönü kaynaklarında Şişli adresi yok", hk.every((k) => !/19 Mayıs|Şişli|Sisli/i.test(k.hamAdres) && /Kal[cç][iı]n/.test(k.hamAdres)));
t("Hamdi Şişli kaydı ortak girişte #69 ile aynı", JSON.stringify(D.kayitlar.find((r: any) => r.anahtar === HAMS)) === JSON.stringify(D69.kayitlar.find((r: any) => r.anahtar === HAMS)));

// 4. Az Çok Thai
const tum = ak.flatMap((k) => k.ifadeler).join(" | ");
t("Az Çok Thai: sonuç izinli değerlerden", ["RESTORAN_ONERISI", "KAFE_ONERISI", "KARAR_GEREKLI"].includes(a.sonuc));
t("Az Çok Thai: öneri işletmeci öz tanımı + öğle/akşam yemeği servisine dayanıyor", a.sonuc !== "RESTORAN_ONERISI" || (/restoranımız/.test(tum) && /öğle ve akşam yemeği/.test(tum) && /lunch and dinner/.test(tum)));
t("Az Çok Thai: 'kafe' ifadesi ortam bağlamıyla kayıtlı (tek kelimeyle karar yok)", /kafe ortamında/.test(tum) && /café setting/.test(tum) && a.degerlendirme.length >= 3);
t("Az Çok Thai: şema işareti karar dayanağı değil", /Restaurant ya da CafeOrCoffeeShop türü yok/.test(a.sema.bulgu));
t("Az Çok Thai: No:12/A korunmuş, menü/yemek eşleşmesi yok", a.kapiNo === "12/A" && a.menu.acildi === false && !("yemekler" in a) && !("menuOgeleri" in a));
t("Az Çok Thai: kabul hazır değil, sayım etkisi yok", a.kabulHazir === false && a.otomatikKabul === false && /Yok/.test(a.sayimEtkisi));

// 5. ortak güncel kayıt
const X = new Map((D.kayitlar as any[]).map((r) => [r.anahtar, r])), X69 = new Map((D69.kayitlar as any[]).map((r) => [r.anahtar, r]));
t("ortak girişte 883 kayıt, #69 ile aynı anahtarlar", X.size === 883 && [...X69.keys()].every((k) => X.has(k)));
t("yalnız iki kayıt değişti", [...X69.keys()].filter((k) => JSON.stringify(X.get(k)) !== JSON.stringify(X69.get(k))).sort().join() === [AZ, HAM].sort().join());
const oz = (r: any) => JSON.stringify([r.durum, r.altDurum, r.kategori, r.canli]);
t("hiçbir kaydın durum/kategori/canlı bağı değişmedi", [...X69.keys()].every((k) => oz(X.get(k)) === oz(X69.get(k))));
const gh = X.get(HAM), ga = X.get(AZ);
t("ortak giriş Hamdi: kanıt bekliyor, engel ADRES_SUBE, ek-6 BEKLIYOR (kaynakla aynı)", gh.durum === "kanit-bekliyor" && gh.engel.grup === "ADRES_SUBE" && gh.ek6.sonuc === h.sonuc);
t("ortak giriş Az Çok Thai: kategori belirsiz kaldı, öneri ayrı alanda (kaynakla aynı)", ga.durum === "kanit-bekliyor" && ga.kategori === "belirsiz" && ga.kategoriOnerisi.sonuc === a.sonuc && ga.engel.grup === "KANIT_TAMAM_KARAR_BEKLIYOR");
t("koşullu kayıtlar kabul adayı sayılmadı", ![gh, ga].some((r) => r.durum === "kabul-adayi" || r.durum === "yayimlandi") && D.sayim.durumKategori["kabul-adayi"].toplam === D69.sayim.durumKategori["kabul-adayi"].toplam);
t("durum × kategori sayımı #69 ile aynı", JSON.stringify(D.sayim.durumKategori) === JSON.stringify(D69.sayim.durumKategori));
const K = D.kayitlar as any[];
t("engel grubu sayımı satırlarla tutarlı", Object.entries(D.sayim.engelGrubu).every(([g, n]) => K.filter((r) => r.engel?.grup === g).length === n));
t("engel farkı #69'a göre: kanıt tamam −1, adres/şube +1", JSON.stringify(Object.entries(D.sayim.engelGrubuFarkPr69).sort()) === JSON.stringify([["ADRES_SUBE", 1], ["KANIT_TAMAM_KARAR_BEKLIYOR", -1]]));
t("önceki 12 günlük satırı aynen korundu", JSON.stringify(D.degisiklikler.slice(0, D69.degisiklikler.length)) === JSON.stringify(D69.degisiklikler) && D69.degisiklikler.length === 12);
const yeni = D.degisiklikler.slice(D69.degisiklikler.length);
t("yeni günlük satırları: iki kayıt, tarih, önceki/yeni, ek-6 dosyası, gerekçe", yeni.length === 2 && yeni.map((d: any) => d.anahtar).sort().join() === [AZ, HAM].sort().join() && yeni.every((d: any) => d.tarih === "2026-11-16" && "onceki" in d && d.yeni && d.kaynak.dosya === B + "ek-6-hamdi-azcok-karar.json" && d.gerekce));
t("ortak girişte ek-6 bağlantısı", D.ekler?.ek6?.dosya === B + "ek-6-hamdi-azcok-karar.json");

// canlı
const P = [...JSON.parse(show(GUNCEL, "data/real/venues.json")), ...JSON.parse(show(GUNCEL, "data/real/isletme.json"))] as any[];
const kap = JSON.parse(show(GUNCEL, "data/real/kapanis.json"));
const KAP = new Set(Object.entries(kap).filter(([x, b]: any) => x !== "_aciklama" && b?.state === "closed_confirmed").map(([x]) => x));
t("iki kayıt da canlıda yok (yeniden doğrulandı)", !P.some((v) => /^hamdi restaurant/i.test(v.name ?? "") || /^az [cç]ok thai/i.test(v.name ?? "")));
t("canlı taban güncel katalogla aynı ve değişmedi", E6.canliTaban.sha === git("rev-parse", GUNCEL).trim() && E6.canliTaban.toplam === P.length && E6.canliTaban.aktif === P.filter((x) => !KAP.has(x.slug)).length && JSON.stringify(E6.canliTaban) === JSON.stringify(D69.canliTaban));
t("kod adayı ve Preview'a uygulanan sayısı ayrı ve sıfır", E6.sayilar.kodAdayi === 0 && E6.sayilar.previewaUygulanan === 0 && E6.ozet.kabulEdilen === 0);
t("puan, koordinat ve Google yok", !/"(rating|puan|score|lat|lng|lon|geo)"\s*:/.test(ham6) && !/google/i.test(ham6));
console.log(`ek 6: ${ok}/${ok + fail}`);
process.exit(fail ? 1 : 0);
