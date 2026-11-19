/* Kıbrıs pilot araştırması — aday dosyasının kalite testi (yalnız okur; katalog dosyalarına yazmaz).
   1. Katalog korunur: data/real taban SHA ile aynı; Kıbrıs kaydı katalogda yok (canlıda sayılmaz).
   2. Pilot sınırı: en fazla 20 aday (tam kanıtlı + koşullu).
   3. Her kayıtta coğrafi bölge ile yerel yönetim/operasyon alanı ayrı alanlarda; hukuki not var.
   4. Aday: resmî işletme kaynağı + son 12 ayda tarihli bağımsız kaynak, tür, kategori, adres; eksikler açık; koordinat yok.
   4b. Satır bazında adres kanıtı: tam kanıtlı = iki kaynakta aynı sokak ve kapı no; eksiği olan kayıt koşullu (tam kabul edilmiş değil).
   5. Telefon ülke kodu ile operasyon alanı tutarlı (+90 392 ↔ kuzey, +357 ↔ güney).
   6. Puan, yorum, Google/harita verisi ve koordinat yok (aday dosyası + kabul manifesti).
   7. Kabul manifesti: tam/koşullu/bekleyen aday dosyasıyla birebir; kuzey ve güney ayrı; tam kayıtta ham adres, eşleşme, gerekçe, boş koordinat, doğrulanmış telefon E.164.
   Kullanım: TABAN=<sha> npx tsx scripts/arastirmakibristest.ts (TABAN verilmezse origin/feature/investor-v1) */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, typeof not === "string" ? not : JSON.stringify(not).slice(0, 300)); } };
const TABAN = process.env.TABAN ?? "origin/feature/investor-v1";
const git = (p: string) => execFileSync("git", ["show", `${TABAN}:${p}`], { encoding: "utf8", maxBuffer: 64 << 20 });
const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
type Kaynak = { tur: string; url: string; kontrol: string; yayin?: string; kanitladigi?: string };
type Bolge = { ada: string; cografiBolge: string; operasyonelBolge: string; telefonUlkeKodu: string; paraBirimiVarsayimi: string; hukukiNot: string; yerelAdlar?: string };
type K = { id: string; ad: string; durum: string; bolge: Bolge; kind?: string; categoryId?: string; adres?: string; kaynaklar: Kaynak[]; eksik?: string[]; neden?: string;
  koordinat?: unknown; kaliteSinifiOnerisi?: string; guven?: string; kosul?: string;
  adresKaniti?: { durum: string; resmiKaynak: string; bagimsizKaynak: string; eslesme: Record<string, string> } };

/* 1 */
for (const f of ["data/real/venues.json", "data/real/isletme.json"]) t(`${f} taban ile aynı`, readFileSync(f, "utf8") === git(f));
const PROD = [...JSON.parse(readFileSync("data/real/venues.json", "utf8")), ...JSON.parse(readFileSync("data/real/isletme.json", "utf8"))] as { name: string; district: string; address?: string }[];
const doc = JSON.parse(readFileSync("data/arastirma/kibris/adaylar.json", "utf8")) as { sayim: Record<string, number>; kayitlar: K[] };
const D = doc.kayitlar;
const prodAd = new Set(PROD.map((r) => fold(r.name)));
t("Kıbrıs adayları katalogda yok (canlıda sayılmaz)", D.every((x) => !prodAd.has(fold(x.ad))), D.filter((x) => prodAd.has(fold(x.ad))).map((x) => x.ad));
t("katalogda Kıbrıs adresi yok", !PROD.some((r) => /kıbrıs|kktc|cyprus|lefkoşa|girne|kyrenia|nicosia|limassol|larnaca|paphos/i.test(`${r.district} ${r.address ?? ""}`)));

/* 2 */
const say: Record<string, number> = {};
for (const x of D) say[x.durum] = (say[x.durum] ?? 0) + 1;
t("sayım kayıtlarla aynı", JSON.stringify(Object.entries(say).sort()) === JSON.stringify(Object.entries(doc.sayim).sort()), { say, sayim: doc.sayim });
const ADAY = ["aday-tam", "aday-kosullu"];
const G = D.filter((x) => ADAY.includes(x.durum));
const TAM = D.filter((x) => x.durum === "aday-tam"), KOS = D.filter((x) => x.durum === "aday-kosullu");
t("pilot en fazla 20 aday", G.length > 0 && G.length <= 20, G.length);
t("durumlar bilinen", D.every((x) => [...ADAY, "inceleme", "kapsam-disi"].includes(x.durum)), [...new Set(D.map((x) => x.durum))]);
t("id'ler tekil", new Set(D.map((x) => x.id)).size === D.length);
t("ad + coğrafi bölge tekil", new Set(D.map((x) => `${fold(x.ad)}|${x.bolge.cografiBolge}`)).size === D.length);

/* 3, 5 */
for (const x of D) {
  const b = x.bolge;
  t(`${x.id}: coğrafi bölge ve operasyon alanı ayrı`, b.ada === "Kıbrıs" && !!b.cografiBolge && !!b.operasyonelBolge && b.cografiBolge !== b.operasyonelBolge && !!b.hukukiNot);
  t(`${x.id}: telefon/para varsayımı yazılı`, !!b.telefonUlkeKodu && !!b.paraBirimiVarsayimi);
  const kuzey = /^kuzey/.test(b.operasyonelBolge), guney = /^güney/.test(b.operasyonelBolge);
  t(`${x.id}: operasyon alanı ile telefon kodu tutarlı`, (kuzey && b.telefonUlkeKodu === "+90 392") || (guney && b.telefonUlkeKodu === "+357"), b);
  if (!ADAY.includes(x.durum)) t(`${x.id}: gerekçe yazılı`, !!x.neden);
}

/* 4 */
const TARIH = /^\d{4}-\d{2}-\d{2}$/;
for (const x of G) {
  const resmi = x.kaynaklar.filter((k) => /resmî işletme/.test(k.tur));
  const bagimsiz = x.kaynaklar.filter((k) => /bağımsız/.test(k.tur));
  t(`${x.id}: resmî işletme kaynağı`, resmi.length > 0);
  t(`${x.id}: son 12 ayda tarihli bağımsız kaynak`, bagimsiz.some((k) => (k.yayin ?? "") >= "2025-11-15"), bagimsiz.map((k) => k.yayin));
  t(`${x.id}: resmî ve bağımsız kaynak farklı alan adı`, new Set(x.kaynaklar.map((k) => new URL(k.url).host.replace(/^www\./, ""))).size >= 2);
  t(`${x.id}: kontrol tarihleri`, x.kaynaklar.every((k) => TARIH.test(k.kontrol)));
  t(`${x.id}: tür, kategori, adres`, !!x.kind && x.kind !== "Restoran" && ["cat.restaurant", "cat.cafe"].includes(x.categoryId ?? "") && !!x.adres && x.adres.length > 8);
  t(`${x.id}: eksikler alanı var`, Array.isArray(x.eksik));
  t(`${x.id}: koordinat yok, A-konumsuz`, x.koordinat === null && x.kaliteSinifiOnerisi === "A-konumsuz");
}

/* 4b */
const IKI = "iki-kaynak-sokak-ve-kapi-no", OTEL = "uc-kaynak-otel-adresi-bagimsiz-rehber";
for (const x of G) {
  const a = x.adresKaniti;
  t(`${x.id}: satır bazında adres kanıtı`, !!a && !!a.durum && !!a.resmiKaynak && !!a.bagimsizKaynak && !!a.eslesme && !!a.eslesme.kapiNo, a);
  if (!a) continue;
  const tamAdres = (a.durum === IKI || (a.durum === OTEL && x.kaynaklar.some((k) => /bağımsız rehber/.test(k.tur)) && x.kaynaklar.length >= 3)) && /^eşleşti/.test(a.eslesme.sokak ?? "") && /^eşleşti/.test(a.eslesme.kapiNo ?? "");
  if (x.durum === "aday-tam") {
    t(`${x.id}: tam kanıtlı — iki kaynakta aynı sokak ve kapı no`, tamAdres, a);
    t(`${x.id}: tam kanıtlı — eksik ve koşul yok`, (x.eksik ?? []).length === 0 && !x.kosul, { eksik: x.eksik, kosul: x.kosul });
  } else {
    t(`${x.id}: koşullu — adres iki kaynakla tam eşleşmiyor`, !tamAdres, a);
    t(`${x.id}: koşullu — koşul yazılı, tam kabul değil`, /tam kabul edilmiş kayıt değildir/.test(x.kosul ?? ""), x.kosul);
    t(`${x.id}: koşullu — eksikler listeli`, (x.eksik ?? []).length > 0);
    t(`${x.id}: koşullu — güven 'koşullu'`, x.guven === "koşullu");
  }
}
const ad = (s: string) => G.find((x) => x.ad.startsWith(s));
t("Silver Rocks: sokak tek kaynakta → koşullu", ad("Silver Rocks")?.durum === "aday-kosullu" && /tek-kaynak/.test(ad("Silver Rocks")?.adresKaniti?.durum ?? ""));
t("otel adresi yolu: bağımsız editoryal kaynak yine var (kimlik + faaliyet)", G.filter((x) => x.adresKaniti?.durum === OTEL).every((x) => x.kaynaklar.some((k) => /bağımsız editoryal/.test(k.tur) && (k.yayin ?? "") >= "2025-11-15")));
t("Bellapais: sokak adı farkı ayrı durum → koşullu", ad("Bellapais")?.durum === "aday-kosullu" && /sokak-adi-farkli/.test(ad("Bellapais")?.adresKaniti?.durum ?? ""));
t("kuzeyde kapı no yoksa tam kanıtlı değil", G.filter((x) => /^kuzey/.test(x.bolge.operasyonelBolge) && !/^eşleşti/.test(x.adresKaniti?.eslesme.kapiNo ?? "")).every((x) => x.durum === "aday-kosullu"));
t("yer tarifli adres tam kanıtlı sayılmadı", G.filter((x) => /yer-tarifi/.test(x.adresKaniti?.durum ?? "")).every((x) => x.durum === "aday-kosullu"));

/* 7 — kabul manifesti */
type MK = { id: string; ad: string; koordinat?: unknown; hamAdres?: { resmiKaynak: string; bagimsizKaynak: string }; karsilastirma?: Record<string, string>; kanitGerekcesi?: string;
  telefon?: { e164: string | null; dogrulama: string }; bolge?: Bolge; kaynaklar?: Kaynak[]; aktarim?: unknown; kosul?: string };
const M = JSON.parse(readFileSync("data/arastirma/kibris/kabul-manifesti.json", "utf8")) as {
  sayim: Record<string, Record<string, number>>; tamKanitli: Record<string, MK[]>; kosullu: Record<string, MK[]>; bekleyen: Record<string, MK[]>; kapsamDisi: Record<string, MK[]> };
const ids = (o: Record<string, MK[]>) => Object.values(o).flat().map((r) => r.id).sort();
const dIds = (d: string) => D.filter((x) => x.durum === d).map((x) => x.id).sort();
t("manifest: tam kanıtlı = aday-tam", JSON.stringify(ids(M.tamKanitli)) === JSON.stringify(dIds("aday-tam")));
t("manifest: koşullu = aday-kosullu (tama karışmadı)", JSON.stringify(ids(M.kosullu)) === JSON.stringify(dIds("aday-kosullu")));
t("manifest: bekleyen = inceleme", JSON.stringify(ids(M.bekleyen)) === JSON.stringify(dIds("inceleme")));
t("manifest: kapsam dışı aynı", JSON.stringify(ids(M.kapsamDisi)) === JSON.stringify(dIds("kapsam-disi")));
for (const [ad, o] of [["tamKanitli", M.tamKanitli], ["kosullu", M.kosullu], ["bekleyen", M.bekleyen], ["kapsamDisi", M.kapsamDisi]] as const) {
  t(`manifest: ${ad} sayımı`, M.sayim[ad].toplam === Object.values(o).flat().length && M.sayim[ad]["kuzey"] === (o["kuzey"] ?? []).length && M.sayim[ad]["güney"] === (o["güney"] ?? []).length, M.sayim[ad]);
  for (const [kesim, rs] of Object.entries(o)) for (const r of rs) t(`manifest: ${r.id} doğru kesimde (${kesim})`, new RegExp(`^${kesim}`).test(K_(r.id).bolge.operasyonelBolge));
}
function K_(id: string) { return D.find((x) => x.id === id)!; }
for (const r of Object.values(M.tamKanitli).flat()) {
  const ak = (typeof r.aktarim === "object" && r.aktarim ? r.aktarim : {}) as { hazir?: Record<string, unknown>; kararBekleyen?: Record<string, string> };
  const h = ak.hazir ?? {}, kb = ak.kararBekleyen ?? {};
  t(`${r.id}: ham adres iki kaynaktan`, !!r.hamAdres?.resmiKaynak && !!r.hamAdres?.bagimsizKaynak);
  t(`${r.id}: sokak ve kapı no eşleşti`, /^eşleşti/.test(r.karsilastirma?.sokak ?? "") && /^eşleşti/.test(r.karsilastirma?.kapiNo ?? ""));
  t(`${r.id}: kanıt gerekçesi ve kaynak tarihleri`, !!r.kanitGerekcesi && (r.kaynaklar ?? []).every((k) => TARIH.test(k.kontrol)) && (r.kaynaklar ?? []).some((k) => !!k.yayin));
  t(`${r.id}: koordinat açıkça boş`, r.koordinat === null && h.lat === null && h.lng === null && h.kaliteSinifi === "A-konumsuz");
  const tel = r.telefon?.e164 ?? null;
  t(`${r.id}: telefon yalnız iki kaynakta aynıysa, uluslararası biçimde`, tel === null ? h.phone === null : /^\+357\d{8}$/.test(tel) && /^iki kaynakta aynı/.test(r.telefon!.dogrulama) && h.phone === tel, r.telefon);
  t(`${r.id}: aktarım alanları`, ["name", "categoryId", "kind", "address", "website", "sourceKind", "sourceUrl", "verifiedAt", "verification"].every((k) => !!h[k]) && h.kind !== "Restoran");
  t(`${r.id}: ilçe/saat/para kesinleştirilmedi`, !("district" in h) && !("openingHours" in h) && !!kb.district && !!kb.openingHours && !!kb.paraBirimi);
}
const MT = M as unknown as { teslim: { kayitlar: string[]; canliSayilmaz: boolean; disarida: { kosullu: string[]; bekleyen: number }; acikBolgeAdresKararlari: { konu: string; durum: string }[] } };
t("teslim: yalnız tam kanıtlı kayıtlar", JSON.stringify([...MT.teslim.kayitlar].sort()) === JSON.stringify(dIds("aday-tam")));
t("teslim: koşullu ve bekleyen dışarıda", JSON.stringify([...MT.teslim.disarida.kosullu].sort()) === JSON.stringify(dIds("aday-kosullu")) && MT.teslim.disarida.bekleyen === dIds("inceleme").length && MT.teslim.kayitlar.every((i) => !MT.teslim.disarida.kosullu.includes(i)));
t("teslim: canlı sayılmaz", MT.teslim.canliSayilmaz === true);
t("teslim: açık bölge/adres kararları listeli", ["district", "slug", "posta kodu", "saat dilimi", "hukuki"].every((k) => MT.teslim.acikBolgeAdresKararlari.some((c) => c.konu.toLocaleLowerCase("tr").includes(k))));
{ const l = Object.values(M.tamKanitli).flat().find((r) => r.id === "kibris/lpm-restaurant-bar-limassol") as MK & { postaKodu?: string | null; acikAlanlar?: Record<string, string>; aktarim: { hazir: { address: string } } };
  t("LPM: posta kodu çelişkisi açık alan, yanlış kesinlik yok", !!l && l.postaKodu === null && /4534/.test(l.acikAlanlar?.postaKodu ?? "") && /56560/.test(l.acikAlanlar?.postaKodu ?? "") && !/4534|56560/.test(l.aktarim.hazir.address)); }
for (const r of Object.values(M.tamKanitli).flat().filter((r) => K_(r.id).adresKaniti?.durum === OTEL))
  t(`${r.id}: otel sayfası restoranı adıyla anıyor`, K_(r.id).kaynaklar.some((k) => /bağımsız rehber/.test(k.tur) && /'[^']+' adıyla|bistrosu '|bistro '/.test(k.kanitladigi ?? "")));
for (const r of Object.values(M.kosullu).flat()) t(`${r.id}: koşullu kayıt aktarılmıyor`, typeof r.aktarim === "string" && /^yok/.test(r.aktarim as string) && !!r.kosul);

/* 6 */
const ham = readFileSync("data/arastirma/kibris/adaylar.json", "utf8") + readFileSync("data/arastirma/kibris/kabul-manifesti.json", "utf8");
t("puan/yorum alanı yok", !/"(rating|reviews?|puan|yorum|degerlendirmePuani)"\s*:/.test(ham));
t("Google/harita verisi yok", !/google\.(com|com\.tr)\/maps|maps\.app\.goo\.gl|place_id|plus\.codes|[0-9A-Z]{4}\+[0-9A-Z]{2,3}/.test(ham));
t("koordinat yazılmadı (yalnız açık boş değer)", !/"(lat|lng|lon)"\s*:(?!\s*null\b)/.test(ham));

console.log(`kıbrıs pilotu: ${ok}/${ok + fail} · tam kanıtlı ${TAM.length} · koşullu ${KOS.length} · inceleme ${say["inceleme"] ?? 0} · kapsam dışı ${say["kapsam-disi"] ?? 0}`);
process.exit(fail ? 1 : 0);
