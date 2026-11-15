/* Toplu teslim manifesti — kalite testi (yalnız okur; katalog dosyalarına yazmaz).
   1. Katalog korunur: data/real taban ile aynı; canlı taban sayıları manifestle aynı.
   2. Kapsam: PR #48 (ac9aee9) ve PR #50 (77bc434) kaynak satırlarının her biri manifestte tam bir kez.
   3. Tekilleştirme anahtarı tekil; sayım ve listeler kayıtlarla tutarlı.
   4. Paket: yayımlanmamış, #55 dışında, sorunsuz; resmî/bağımsız iki kaynak, tarihli bağımsız kaynak, kapı no; harita verisi kanıt sayılmaz.
   5. Sorunlu kayıtların gerekçesi var; yayımlananlar Production'da.
   6. #55 (7924559) adayları ve bekletmeleri işaretli, pakette yok; Kıbrıs dahil değil; puan/yorum/koordinat yok.
   Kullanım: TABAN=<sha> npx tsx scripts/arastirmatopluteslimtest.ts (TABAN verilmezse origin/feature/investor-v1) */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, typeof not === "string" ? not : JSON.stringify(not).slice(0, 300)); } };
const TABAN = process.env.TABAN ?? "origin/feature/investor-v1";
const show = (ref: string, p: string) => execFileSync("git", ["show", `${ref}:${p}`], { encoding: "utf8", maxBuffer: 256 << 20 });
const ESIK = "2025-11-15";

type Kaynak = { tur: string | null; url: string; yayin: string | null; erisim: string | null };
type Kayit = { anahtar: string; ad: string; ilce: string; kategori: string; categoryId: string | null; kind: string | null;
  subeAdres: { adres: string | null; sube: string | null; kapiNo: string | null; kaynakAdresleri: { pr: number | string; adres: string }[] };
  kaynaklar: Kaynak[]; faaliyetKaniti: { metin: string; tarih: string | null; pr: number | string }[];
  kaynakKayitlari: { pr: number | string; id: string }[]; yayin: { durum: string; slug: string[] | null; kapali: string[] | null };
  pr55: { rol: string } | null; teslim: string; sorunlar: { kod: string; gerekce: string }[]; celiski: string | null };
type Man = { canliTaban: { sha: string; toplam: number; aktif: number; kapali: number }; sayim: { kaynakSatiri: number; benzersizKayit: number; teslim: Record<string, number>; paket: Record<string, number>; sorunluKod: Record<string, number> };
  paket: Record<string, string[]>; sorunlu: Record<string, string[]>; kayitlar: Kayit[]; haric: { kibris: { pr: number; sha: string } } };

const M = JSON.parse(readFileSync("data/arastirma/toplu-teslim/manifest.json", "utf8")) as Man;
const D = M.kayitlar;

/* 1 */
for (const f of ["data/real/venues.json", "data/real/isletme.json", "data/real/kapanis.json"]) t(`${f} taban ile aynı`, readFileSync(f, "utf8") === show(TABAN, f));
const PV = [...JSON.parse(readFileSync("data/real/venues.json", "utf8")), ...JSON.parse(readFileSync("data/real/isletme.json", "utf8"))] as { slug: string; name: string; district: string }[];
const KAP = JSON.parse(readFileSync("data/real/kapanis.json", "utf8")) as Record<string, { state?: string }>;
const kapali = PV.filter((x) => KAP[x.slug]?.state === "closed_confirmed").length;
t("canlı taban: toplam/aktif/kapalı manifestle aynı", M.canliTaban.toplam === PV.length && M.canliTaban.aktif === PV.length - kapali && M.canliTaban.kapali === kapali, { m: M.canliTaban, PV: PV.length, kapali });
const PS = new Set(PV.map((x) => x.slug));

/* 2 */
const B48 = JSON.parse(show("ac9aee9", "data/katalog/gece-2000/birlesik-aday.json")) as { kabul: { slug: string }[] };
const GM = JSON.parse(show("77bc434", "data/arastirma/gm2026/adaylar.json")) as { kayitlar: { id: string }[] };
const SY = JSON.parse(show("77bc434", "data/arastirma/seyrek/adaylar.json")) as { kayitlar: { id: string }[] };
const kaynakId = [...B48.kabul.map((x) => "pr48/" + x.slug), ...GM.kayitlar.map((x) => x.id), ...SY.kayitlar.map((x) => x.id)];
const manId = D.flatMap((r) => r.kaynakKayitlari.map((k) => k.id));
t("kaynak satırı sayısı", M.sayim.kaynakSatiri === kaynakId.length && manId.length === kaynakId.length, { m: M.sayim.kaynakSatiri, kaynak: kaynakId.length, man: manId.length });
t("her kaynak satırı tam bir kez", JSON.stringify([...manId].sort()) === JSON.stringify([...kaynakId].sort()));

/* 3 */
t("tekilleştirme anahtarı tekil", new Set(D.map((r) => r.anahtar)).size === D.length && M.sayim.benzersizKayit === D.length);
const say: Record<string, number> = {};
for (const r of D) say[r.teslim] = (say[r.teslim] ?? 0) + 1;
t("teslim sayımı", JSON.stringify(Object.entries(say).sort()) === JSON.stringify(Object.entries(M.sayim.teslim).sort()), { say, m: M.sayim.teslim });
t("teslim durumları bilinen", D.every((r) => ["paket", "sorunlu", "yayimlandi", "pr55"].includes(r.teslim)));
const paketIds = Object.values(M.paket).flat();
t("paket listesi = paket kayıtları", JSON.stringify([...paketIds].sort()) === JSON.stringify(D.filter((r) => r.teslim === "paket").map((r) => r.anahtar).sort()));
t("paket kategori listeleri doğru", Object.entries(M.paket).every(([k, ids]) => ids.every((i) => D.find((r) => r.anahtar === i)?.kategori === k)) && Object.entries(M.paket).every(([k, v]) => M.sayim.paket[k] === v.length));
const sorunluIds = Object.values(M.sorunlu).flat();
t("sorunlu listesi = sorunlu kayıtlar (ilk sorun koduna göre)", JSON.stringify([...sorunluIds].sort()) === JSON.stringify(D.filter((r) => r.teslim === "sorunlu").map((r) => r.anahtar).sort())
  && Object.entries(M.sorunlu).every(([k, ids]) => ids.every((i) => D.find((r) => r.anahtar === i)?.sorunlar[0]?.kod === k)));

/* her kayıtta zorunlu alanlar */
const TARIH = /^\d{4}-\d{2}-\d{2}$/;
for (const r of D) {
  t(`${r.anahtar}: zorunlu alanlar`, !!r.ad && !!r.ilce && !!r.kategori && Array.isArray(r.kaynaklar) && r.kaynaklar.length > 0 && !!r.subeAdres && !!r.yayin && Array.isArray(r.kaynakKayitlari) && r.kaynakKayitlari.length > 0);
  t(`${r.anahtar}: kaynaklarda URL ve erişim tarihi`, r.kaynaklar.every((k) => !!k.url && (k.erisim === null || TARIH.test(k.erisim))) && r.kaynaklar.some((k) => k.erisim && TARIH.test(k.erisim)));
}

/* 4 */
const HARITA = (k: Kaynak) => /^harita/.test(k.tur ?? "") || /^overture:|openstreetmap\.org/.test(k.url);
const host = (u: string) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return u.split(":")[0]; } };
for (const r of D.filter((x) => x.teslim === "paket")) {
  const bag = r.kaynaklar.filter((k) => !HARITA(k) && !/resmî/.test(k.tur ?? ""));
  const tarihli = bag.filter((k) => (k.yayin ?? "") >= ESIK || k.yayin === "2026 rehberi");
  const hosts = new Set(r.kaynaklar.filter((k) => !HARITA(k)).map((k) => host(k.url)));
  t(`${r.anahtar}: paket — yayımlanmamış ve Production'da yok`, r.yayin.durum === "yayimlanmadi" && !r.kaynakKayitlari.some((k) => PS.has(k.id.replace(/^pr48\//, ""))));
  t(`${r.anahtar}: paket — #55 dışında, sorun/çelişki yok`, r.pr55 === null && r.sorunlar.length === 0 && r.celiski === null);
  t(`${r.anahtar}: paket — tarihli bağımsız kaynak + iki ayrı alan adı (harita hariç)`, tarihli.length > 0 && hosts.size >= 2, { tarihli: tarihli.map((k) => k.yayin), hosts: [...hosts] });
  t(`${r.anahtar}: paket — kapı numaralı adres ve faaliyet kanıtı`, !!r.subeAdres.adres && !!r.subeAdres.kapiNo && r.faaliyetKaniti.length > 0);
  t(`${r.anahtar}: paket — kategori restoran/kafe/bar`, ["restoran", "kafe", "bar"].includes(r.kategori) && !!r.categoryId);
}

/* 5 */
for (const r of D.filter((x) => x.teslim === "sorunlu")) t(`${r.anahtar}: sorunlu — gerekçe`, r.sorunlar.length > 0 && r.sorunlar.every((s) => !!s.kod && !!s.gerekce));
for (const r of D.filter((x) => x.teslim === "yayimlandi")) t(`${r.anahtar}: yayımlandı — slug Production'da`, (r.yayin.slug ?? []).length > 0 && (r.yayin.slug ?? []).every((s) => PS.has(s)));
t("bağımsız kaynaksız (yalnız resmî site + harita) kayıt pakette değil", D.filter((r) => r.kaynaklar.every((k) => HARITA(k) || /resmî/.test(k.tur ?? ""))).every((r) => r.teslim !== "paket"));

/* 6 */
const P55 = JSON.parse(show("7924559", "docs/katalog/toplu-842-kabul.json")) as { records: { candidateId: string }[]; holds: { ids: string[] }[] };
const p55ids = new Set([...P55.records.map((x) => x.candidateId), ...P55.holds.flatMap((h) => h.ids)]);
const p55Kayit = D.filter((r) => r.kaynakKayitlari.some((k) => p55ids.has(k.id) || p55ids.has(k.id.replace(/^pr48\//, ""))));
t("#55 adayları/bekletmeleri işaretli ve pakette değil", p55Kayit.every((r) => r.teslim !== "paket" && (r.pr55 !== null || r.teslim === "yayimlandi")), p55Kayit.filter((r) => r.pr55 === null).map((r) => r.anahtar));
t("Kıbrıs dahil değil (ayrı #52)", !D.some((r) => r.kaynakKayitlari.some((k) => k.id.startsWith("kibris/"))) && M.haric.kibris.pr === 52 && M.haric.kibris.sha === "29b9c9b");
const ham = readFileSync("data/arastirma/toplu-teslim/manifest.json", "utf8");
t("puan/yorum alanı yok", !/"(rating|reviews?|puan|yorum|googlePuani)"\s*:/.test(ham));
t("koordinat yazılmadı", !/"(lat|lng|lon)"\s*:/.test(ham));

console.log(`toplu teslim: ${ok}/${ok + fail} · kayıt ${D.length} · paket ${paketIds.length} · sorunlu ${say["sorunlu"] ?? 0} · yayımlandı ${say["yayimlandi"] ?? 0} · #55 ${say["pr55"] ?? 0}`);
process.exit(fail ? 1 : 0);
