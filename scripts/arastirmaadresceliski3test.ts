/* Üç canlı adres çelişkisi — teslim dosyası kalite testi (yalnız okur).
   1. Katalog değişmedi (data/real taban ile aynı); teslim dosyasındaki canlı alanlar katalogla birebir.
   2. Her kayıtta en az üç kanıt satırı, URL/erişim tarihi; aynı şube / kaynak eskimiş / kapı ayrımı ayrı yazılı.
   3. "Destekleniyor" sonucunda canlı adres en az iki kaynakta aynı kapı no ve telefonla; açık kayıtta eksik kanıt listeli.
   4. Hiçbir öneri uygulanmış değil; puan/koordinat yok.
   Kullanım: TABAN=<ref> npx tsx scripts/arastirmaadresceliski3test.ts */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, typeof not === "string" ? not : JSON.stringify(not).slice(0, 300)); } };
const TABAN = process.env.TABAN ?? "origin/feature/investor-v1";
const show = (ref: string, p: string) => execFileSync("git", ["show", `${ref}:${p}`], { encoding: "utf8", maxBuffer: 256 << 20 });
type Kanit = { kaynak: string; url: string; erisim: string | null; adres: string | null; telefon: string | null };
type K = { slug: string; canli: { address: string; phone: string | null; website: string | null }; kanitlar: Kanit[]; analiz: Record<string, string>; sonuc: string;
  onerilenAlanDegisikligi: { alan: string; oneri: string; durum?: string }[]; eksikKanit: string[]; durum: string };
const D = JSON.parse(readFileSync("data/arastirma/canli-adres-celiski/uc-kayit.json", "utf8")) as { kayitlar: K[]; ozet: Record<string, number> };

/* 1 */
for (const f of ["data/real/venues.json", "data/real/isletme.json", "data/real/duzeltmeler.json"]) t(`${f} taban ile aynı`, readFileSync(f, "utf8") === show(TABAN, f));
const PV = [...JSON.parse(readFileSync("data/real/venues.json", "utf8")), ...JSON.parse(readFileSync("data/real/isletme.json", "utf8"))] as { slug: string; address?: string; phone?: string; website?: string }[];
t("üç kayıt: Eleos, Suna'nın Yeri, Deraliye", JSON.stringify(D.kayitlar.map((k) => k.slug).sort()) === JSON.stringify(["deraliye-fatih", "eleos-yesilkoy-bakirkoy", "suna-nin-yeri-uskudar"]));
for (const k of D.kayitlar) {
  const p = PV.find((x) => x.slug === k.slug);
  t(`${k.slug}: canlı adres ve telefon katalogla aynı`, !!p && p.address === k.canli.address && (p.phone ?? null) === k.canli.phone, { p, c: k.canli });
}

/* 2, 3 */
const no = (a: string | null) => (a ?? "").match(/No\s*[:.]?\s*(\d+[A-Za-z]?)/i)?.[1]?.toUpperCase() ?? null;
const dig = (s: string | null) => (s ?? "").replace(/\D/g, "").slice(-7);
for (const k of D.kayitlar) {
  t(`${k.slug}: en az üç kanıt, URL ve erişim tarihi`, k.kanitlar.length >= 3 && k.kanitlar.every((x) => !!x.url) && k.kanitlar.filter((x) => x.erisim && /^\d{4}-\d{2}-\d{2}$/.test(x.erisim)).length >= 2);
  t(`${k.slug}: aynı şube / kaynak eskimiş / kapı ayrımı ayrı`, ["ayniSube", "kaynakEskimis", "kapiAyrimi"].every((a) => (k.analiz[a] ?? "").length > 10));
  const canliNo = no(k.canli.address);
  const destek = k.kanitlar.filter((x) => !/OSM/.test(x.kaynak) && no(x.adres) === canliNo && dig(x.telefon) === dig(k.canli.phone));
  if (k.durum === "COZULDU_DEGISIKLIK_YOK") {
    t(`${k.slug}: destekleniyor — canlı kapı no + telefon en az iki OSM dışı kaynakta`, destek.length >= 2, destek.map((x) => x.kaynak));
    t(`${k.slug}: adres değişikliği önerilmiyor`, k.onerilenAlanDegisikligi.some((o) => o.alan === "address" && /değişiklik yok/.test(o.oneri)));
  } else {
    t(`${k.slug}: açık — eksik kanıt listeli ve canlı alanı destekleyen iki kaynak yok`, k.durum === "ACIK_EKSIK_KANIT" && k.eksikKanit.length > 0 && destek.length < 2);
  }
  t(`${k.slug}: hiçbir öneri uygulanmadı`, k.onerilenAlanDegisikligi.every((o) => /değişiklik yok/.test(o.oneri) || /uygulanmadı/.test(o.durum ?? "")));
}

/* 4 */
t("özet tutarlı, canlıya yazım yok", D.ozet.uygulananDegisiklik === 0 && D.ozet.canliyaYazilan === 0 && D.ozet.cozulduDegisiklikYok === D.kayitlar.filter((k) => k.durum === "COZULDU_DEGISIKLIK_YOK").length && D.ozet.acik === D.kayitlar.filter((k) => k.durum.startsWith("ACIK")).length);
const ham = readFileSync("data/arastirma/canli-adres-celiski/uc-kayit.json", "utf8");
t("puan alanı ya da rehber puanı yok", !/"(rating|puan|yorum)"\s*:/.test(ham) && !/\d+([,.]\d)?\/20\b/.test(ham) && !/TOQUE/i.test(ham));
t("koordinat yazılmadı", !/"(lat|lng|lon)"\s*:/.test(ham));

console.log(`adres çelişkisi (3 kayıt): ${ok}/${ok + fail}`);
process.exit(fail ? 1 : 0);
