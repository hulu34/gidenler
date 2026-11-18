/* 2.000 MEKÂN OPERASYONU — paket 15–29 yayın havuzunun kalite testi (yalnız okur; katalog dosyalarına yazmaz).
   1. Mevcut 793 korunur: data/real/venues.json + isletme.json taban SHA'daki hâliyle aynı (git), kimlikler değişmez.
   2. Kabul standardı her kayıtta: ad, ilçe (39 ilçeden), kapı numaralı adres, kaynak URL'si, son kontrol tarihi, güven "güçlü", tür.
   3. Tekillik: slug ve ref Production'la ve paketler arasında çakışmaz; aynı ad + ilçe iki kez yok.
   4. Yanlış şube: aynı resmî site alanını paylaşan kayıtların adresi (sokak + kapı no) ve ilçe/adres ikilisi farklı.
   5. Kafe paketi (26): cat.cafe, tür Pastane/Fırın/Tatlıcı/Kahveci/Kafe; bar/pub/nargile/lounge yok.
   6. Google içeriği yok: kayıtlarda Google alanı ya da Google kaynak bağlantısı yok; puan/yorum alanı yok.
   7. A-konumsuz kayıtta koordinat ve konum yazılmaz; A kaydında OSM kimliği ve İstanbul kutusunda koordinat var.
   Kullanım: TABAN=<sha> npx tsx scripts/katalog2000test.ts  (TABAN verilmezse origin/feature/investor-v1) */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, typeof not === "string" ? not : JSON.stringify(not).slice(0, 400)); } };
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const TABAN = process.env.TABAN ?? "origin/feature/investor-v1";
const git = (p: string) => execFileSync("git", ["show", `${TABAN}:${p}`], { encoding: "utf8", maxBuffer: 64 << 20 });
type R = { slug: string; ref: string; name: string; district: string; address?: string; categoryId: string; kind: string; website?: string; sourceUrl?: string;
  verifiedAt?: string; confidence?: string; verification?: string; kaliteSinifi?: string; lat?: number; lng?: number; location?: unknown; osmRef?: string; _p: number };

/* 1 */
t("venues.json taban ile aynı", readFileSync("data/real/venues.json", "utf8") === git("data/real/venues.json"));
t("isletme.json taban ile aynı", readFileSync("data/real/isletme.json", "utf8") === git("data/real/isletme.json"));
const PROD = [...J("data/real/venues.json"), ...J("data/real/isletme.json")] as R[];
t("Production 793 kayıt", PROD.length === 793, PROD.length);

const ILCE = new Set((J("data/katalog/istanbul-ilceler.json").ilceler as { ad: string }[]).map((x) => x.ad));
const pool: R[] = [];
const SON = Number(process.env.SON_PAKET ?? 29), KAFE_P = new Set([26, 29]);
for (let n = 15; n <= SON; n++) for (const f of ["kayitlar.json", "isletme-kayitlari.json"]) {
  const p = `data/paket/istanbul-${n}/${f}`;
  if (existsSync(p)) for (const r of J(p) as R[]) pool.push({ ...r, _p: n });
}
const BEKLENEN = (J("data/katalog/gece-2000/birlesik-aday.json").kabul as unknown[]).length;
t(`havuz birleşik denetimin kabul sayısına eşit (${BEKLENEN})`, pool.length === BEKLENEN, pool.length);

/* 2 */
const KAPI = /No\s*[:.]?\s*\d/i;
for (const r of pool) {
  const id = `p${r._p}/${r.slug}`;
  const miss = [
    !r.name && "ad", !ILCE.has(r.district) && `ilçe (${r.district})`, !(r.address && KAPI.test(r.address)) && `kapı no (${r.address})`,
    !(r.sourceUrl || r.website || /https?:\/\//.test(r.verification ?? "")) && "kaynak URL", !/^\d{4}-\d{2}-\d{2}$/.test(r.verifiedAt ?? "") && "kontrol tarihi",
    r.confidence !== "güçlü" && "güven", (!r.kind || r.kind === "Restoran") && `tür (${r.kind})`,
  ].filter(Boolean);
  t(`${id}: kabul standardı`, miss.length === 0, miss.join(", "));
}

/* 3 */
const prodSlug = new Set(PROD.map((r) => r.slug)), prodRef = new Set([...PROD.map((r) => r.ref), ...PROD.map((r) => r.osmRef).filter(Boolean)]);
const seenS = new Map<string, number>(), seenR = new Map<string, number>(), seenNI = new Map<string, string>();
const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
for (const r of pool) {
  t(`${r.slug}: slug Production'da yok`, !prodSlug.has(r.slug));
  t(`${r.slug}: ref Production'da yok`, !prodRef.has(r.ref) && !(r.osmRef && prodRef.has(r.osmRef)));
  t(`${r.slug}: slug paketlerde tekil`, !seenS.has(r.slug), seenS.get(r.slug)); seenS.set(r.slug, r._p);
  t(`${r.slug}: ref paketlerde tekil`, !seenR.has(r.ref), seenR.get(r.ref)); seenR.set(r.ref, r._p);
  const ni = `${fold(r.name)}|${r.district}`;
  t(`${r.slug}: ad + ilçe tekil`, !seenNI.has(ni), seenNI.get(ni)); seenNI.set(ni, r.slug);
}

/* 4 */
const host = (u?: string) => { try { return u ? new URL(u).host.replace(/^www\./, "") : null; } catch { return null; } };
const adrKey = (a?: string) => fold((a ?? "").split(",")[0]);
const byHost = new Map<string, R[]>();
for (const r of [...PROD, ...pool]) { const h = host(r.website); if (h) byHost.set(h, [...(byHost.get(h) ?? []), r]); }
let zincir = 0;
for (const [h, rs] of byHost) {
  const yeni = rs.filter((r) => "_p" in r);
  if (rs.length < 2 || !yeni.length) continue;
  zincir++;
  /* aynı adreste iki kayıt yalnız adları da aynı markayı söylüyorsa hatadır (aynı oteldeki iki ayrı restoran — Spago / St. Regis Brasserie — hata değil) */
  const first = (n: string) => fold(n).split(" ")[0];
  const clash = rs.flatMap((x, i) => rs.slice(i + 1).filter((y) => adrKey(x.address) === adrKey(y.address) && x.district === y.district && first(x.name) === first(y.name)).map((y) => `${x.slug} = ${y.slug}: ${x.address}`));
  t(`${h}: aynı alan adlı ${rs.length} kayıtta aynı adreste aynı marka yok`, clash.length === 0, clash);
}

/* 5 */
const kafe = pool.filter((r) => KAFE_P.has(r._p));
t("kafe paketleri (26, 29) tamamı cat.cafe", kafe.length > 0 && kafe.every((r) => r.categoryId === "cat.cafe"));
t("kafe paketlerinde türler kafe aileleri", kafe.every((r) => ["Pastane", "Fırın", "Tatlıcı", "Kahveci", "Kafe"].includes(r.kind)), [...new Set(kafe.map((r) => r.kind))]);
t("kafe paketlerinde bar/pub/nargile/lounge adı yok", kafe.every((r) => !/\b(bar|pub|nargile|hookah|lounge|cocktail)\b/i.test(r.name)), kafe.filter((r) => /\b(bar|pub|nargile|hookah|lounge|cocktail)\b/i.test(r.name)).map((r) => r.name));
t("restoran paketleri tamamı cat.restaurant", pool.filter((r) => !KAFE_P.has(r._p)).every((r) => r.categoryId === "cat.restaurant"));

/* 6 */
for (const r of pool) {
  const s = JSON.stringify(r);
  t(`${r.slug}: Google içeriği yok`, !/google\.(com|com\.tr)\/maps|maps\.app\.goo\.gl|place_id|googlePlaceId|"rating"|"reviews?"|"puan"/.test(s));
}

/* 7 */
for (const r of pool) {
  if (r.kaliteSinifi === "A-konumsuz") t(`${r.slug}: A-konumsuz kayıtta koordinat yok`, r.lat === undefined && r.lng === undefined && !r.location && r.ref.startsWith("isletme/"));
  else if (r.kaliteSinifi === "A") t(`${r.slug}: A kaydı OSM kimlikli ve İstanbul'da`, /^(node|way|relation)\/\d+$/.test(r.ref) && typeof r.lat === "number" && r.lat > 40.8 && r.lat < 41.6 && typeof r.lng === "number" && r.lng > 27.9 && r.lng < 29.95);
  else t(`${r.slug}: kalite sınıfı A ya da A-konumsuz`, false, r.kaliteSinifi);
}

console.log(`katalog 2000 havuzu: ${ok}/${ok + fail} · ${pool.length} kayıt · ${zincir} ortak alan adı grubu`);
process.exit(fail ? 1 : 0);
