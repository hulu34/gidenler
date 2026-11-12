/* KATALOG KALİTE DENETİMİ (2026-11-12) — Production kataloğundaki her kaydı otomatik kontrollerden geçirir; VERİYİ DEĞİŞTİRMEZ.
   Kullanım: npx tsx scripts/katalog/katalog-denetim.ts <cikti.json> [site-erisim.json] [gorunum.json]
   - site-erisim.json: scripts/katalog/site-erisim.mjs çıktısı (resmî site / kaynak bağlantısı durum kodları)
   - gorunum.json    : scripts/katalog/profil-denetim.mjs çıktısı (yerel derlemede profil, arama, sitemap, açıklama metinleri)
   Kalite sınıfı (mevcut modelle uyumlu, docs/katalog/KALITE-MODELI-ONERI.md):
     A              : kimlik + tarihli faaliyet kanıtı + kapı numaralı adres + kaynaklı (genel olmayan) tür + OSM koordinatı
     A-konumsuz     : aynısı, koordinat yok (işletme kaydı)
     B1             : sokak düzeyinde yaklaşık konum (kaliteSinifi B1, adresDuzeyi sokak) — kesin koordinat verilmez
     inceleme gerekli: en az bir eksen eksik/çelişkili; her kayıtta gerekçe yazılı
     kapalı          : kapanma doğrulanmış (kapanis.json closed_confirmed); profil korunur, önerilerde yok */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { invalidRecord, type RealVenueRecord } from "../../data/real/index";
import { districtOf, type SinirDosyasi } from "../../lib/katalog/geo";
import { hasHouseNo } from "../../lib/katalog/kalite";
import { fold, meters, phoneKey, siteKey } from "../../lib/katalog/aday";
import { kapsamDisiOf } from "../../lib/katalog/zincir";

const [outP, erisimP, gorunumP] = process.argv.slice(2);
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const V = J("data/real/venues.json") as RealVenueRecord[], I = J("data/real/isletme.json") as RealVenueRecord[];
const FIX = J("data/real/duzeltmeler.json") as Record<string, { kind?: string }>;
const KAP = J("data/real/kapanis.json") as Record<string, { state: string; checkedAt: string; note?: string }>;
const FOTO = J("data/real/izinli-fotograflar.json") as Record<string, { src: string; credit?: string; sourceUrl?: string; rightsRef?: string; license?: string }[]>;
const BEK = J("data/real/izinli-bekleyen.json") as Record<string, { neden: string }>;
const ADRESSIZ = new Set(J("data/real/sitemap-adressiz.json") as string[]);
const IST = J("data/katalog/istanbul-ilceler.json") as SinirDosyasi;
const ER = erisimP && existsSync(erisimP) ? J(erisimP) as Record<string, { status: number; final?: string; https: boolean }> : null;
const GR = gorunumP && existsSync(gorunumP) ? J(gorunumP) as Record<string, Record<string, boolean | number | string>> : null;
const PROFILES = new Set(existsSync("content/profiles") ? readdirSync("content/profiles").map((f) => f.replace(/\.json$/, "")) : []);

/* FAALIYET=<faaliyet-kaniti.json>: faaliyet kanıtı paketi uygulanmış gibi bellekte birleştirilir (dosyalar değişmez; öngörü ölçümü) */
const FA = process.env.FAALIYET ? new Map((J(process.env.FAALIYET).uygulanan as { slug: string; alanlar: Record<string, string> }[]).map((x) => [x.slug, x.alanlar])) : null;
const all: (RealVenueRecord & Record<string, any>)[] = [...V, ...I].map((r) => ({ ...r, ...(FA && !r.verifiedAt ? FA.get(r.slug) : undefined), kind: FIX[r.slug]?.kind ?? r.kind }));
const GENERIC_KIND = new Set(["Restoran", "Kafe", "Bar"]);
const CAFE_KINDS = new Set(["Kahveci", "Kafe", "Pastane", "Fırın", "Tatlıcı"]), BAR_KINDS = new Set(["Bar", "Pub"]);
const tel = (p?: string) => phoneKey(p) ?? "";
const host = (u?: string) => (u ? siteKey(u) : null);
type Sorun = { eksen: string; onem: "yüksek" | "orta" | "düşük"; not: string };
const rows: any[] = [];
const bySlug = new Map(all.map((r) => [r.slug, r]));
for (const r of all) {
  const S: Sorun[] = []; const add = (eksen: string, onem: Sorun["onem"], not: string) => S.push({ eksen, onem, not });
  const geo = typeof r.lat === "number" && typeof r.lng === "number";
  const isB1 = r.kaliteSinifi === "B1" || r.adresDuzeyi === "sokak";
  const biz = r.ref.startsWith("isletme/");
  const kap = KAP[r.slug];
  /* şema */
  const inv = invalidRecord(r); if (inv) add("şema", "yüksek", `invalidRecord: ${inv}`);
  /* ad + şube */
  const n = r.name.trim();
  if (!n) add("ad", "yüksek", "ad boş");
  if (/[|]|\s[–-]\s/.test(n)) add("ad", "orta", "adda SEO eki/ayraç var");
  if (n.length > 50) add("ad", "düşük", `ad çok uzun (${n.length} karakter)`);
  if (n === n.toLocaleUpperCase("tr") && /[A-ZÇĞİÖŞÜ]{4,}/.test(n) && n.length > 5) add("ad", "düşük", "ad tamamı büyük harf");
  if (kapsamDisiOf(r.name, null, r.website ?? null)) add("kapsam", "orta", `kapsam dışı zincir listesinde: ${kapsamDisiOf(r.name, null, r.website ?? null)}`);
  /* adres + ilçe */
  if (!r.address) add("adres", ADRESSIZ.has(r.slug) ? "orta" : "yüksek", ADRESSIZ.has(r.slug) ? "adres yok (sitemap-adressiz listesinde, profil yayımda)" : "adres yok");
  else {
    if (!fold(r.address).endsWith(fold(r.district))) add("adres", "düşük", "adres ilçe adıyla bitmiyor");
    if (!isB1 && !hasHouseNo(r.address)) add("adres", "orta", "kapı numarası yok (B1 değil)");
    if (isB1 && hasHouseNo(r.address)) add("adres", "yüksek", "B1 kaydında kapı numarası yazılı (sokak düzeyi iddiasıyla çelişir)");
  }
  if (geo) { const d = districtOf(r.lat!, r.lng!, IST); if (!d) add("konum", "orta", "koordinat ilçe sınır çokgenlerinin dışında (kıyı/deniz kenarı olabilir); ilçe elle doğrulanmalı"); else if (d !== r.district) add("konum", "yüksek", `koordinatın ilçesi ${d}, kayıt ${r.district}`); }
  /* konum güveni */
  const konum = !geo ? "yok (işletme kaydı, harita noktası gösterilmez)" : isB1 ? "yaklaşık (sokak düzeyi; kapı numarası doğrulanmadı)" : r.location?.precision === "building" ? "bina (OSM)" : r.location?.precision === "address" ? "adres (OSM)" : "OSM öğesi noktası";
  if (biz && geo && r.location?.provider !== "osm") add("konum", "yüksek", "işletme kaydında OSM dışı koordinat");
  /* kategori + tür */
  if (CAFE_KINDS.has(r.kind) && r.categoryId !== "cat.cafe" && r.kind !== "Tatlıcı") add("kategori", "orta", `tür ${r.kind}, kategori ${r.categoryId}`);
  if (r.kind === "Tatlıcı" && r.categoryId === "cat.restaurant") add("kategori", "orta", "tatlıcı restoran kategorisinde (kafe/tatlı olmalı)");
  if (BAR_KINDS.has(r.kind) && r.categoryId !== "cat.bar") add("kategori", "orta", `tür ${r.kind}, kategori ${r.categoryId}`);
  if (r.categoryId === "cat.cafe" && !CAFE_KINDS.has(r.kind) && r.kind !== "Kahvaltı") add("kategori", "orta", `kafe kategorisinde restoran türü: ${r.kind}`);
  if (r.osmAmenity && ((r.osmAmenity === "cafe" && r.categoryId === "cat.restaurant") || (r.osmAmenity === "restaurant" && r.categoryId === "cat.cafe") || (["bar", "pub"].includes(r.osmAmenity) && r.categoryId !== "cat.bar"))) add("kategori", "düşük", `OSM amenity ${r.osmAmenity} ↔ ${r.categoryId}`);
  if (GENERIC_KIND.has(r.kind)) add("tür", "orta", `genel tür ("${r.kind}"); kaynaklı mutfak türü yok`);
  /* faaliyet */
  if (kap?.state === "closed_confirmed") add("faaliyet", "yüksek", `kapanma doğrulandı (${kap.checkedAt}); önerilerden çıkarılmış, profil korunuyor`);
  else if (kap?.state === "closed_suspected") add("faaliyet", "yüksek", `kapanma şüphesi (${kap.checkedAt}); elle inceleme listesinde`);
  const faaliyetKanit = !!r.verifiedAt || kap?.state === "reopened";
  if (!faaliyetKanit) add("faaliyet", "orta", `kayıt düzeyinde tarihli faaliyet kanıtı yok (ilk OSM aktarımı, dalga ${r.wave ?? "—"})`);
  else if (r.verifiedAt && r.verifiedAt < "2026-01-01") add("faaliyet", "düşük", `faaliyet kanıtı eski (${r.verifiedAt})`);
  if (/google/i.test(r.verification ?? "")) add("kaynak", "orta", "doğrulama metninde Google kaynağı");
  /* bağlantı */
  if (r.website && !/^https?:\/\//.test(r.website)) add("bağlantı", "orta", "web sitesi adresi şemasız");
  if (biz && !/^https:\/\//.test(r.sourceUrl ?? "")) add("bağlantı", "yüksek", "işletme kaydında https kaynak bağlantısı yok");
  if (ER && r.website) { const e = ER[r.slug]; if (e && (!e.status || e.status >= 400)) add("bağlantı", "orta", `resmî site açılmadı (${e.status || "bağlantı yok"})`); else if (e && !e.https) add("bağlantı", "düşük", "resmî site yalnız http"); }
  if (r.instagram && !/^[A-Za-z0-9._]{1,30}$/.test(r.instagram)) add("bağlantı", "düşük", `Instagram kullanıcı adı biçimi şüpheli: ${r.instagram}`);
  /* fotoğraf */
  const foto = [...(FOTO[r.slug] ?? []).map((p) => ({ ...p, tip: "izinli" })), ...(r.image ? [{ ...r.image, tip: "commons" }] : [])];
  for (const p of foto as any[]) {
    if (p.tip === "izinli" && !p.rightsRef) add("fotoğraf", "yüksek", "izinli fotoğrafta hak kaydı (rightsRef) yok");
    if (p.tip === "commons" && !(p.license && p.credit && p.sourceUrl)) add("fotoğraf", "yüksek", "Commons fotoğrafında lisans/atıf/kaynak eksik");
    if (p.src?.startsWith("/media/") && !existsSync(`public${p.src}`)) add("fotoğraf", "yüksek", `fotoğraf dosyası yok: ${p.src}`);
  }
  if (BEK[r.slug]) add("fotoğraf", "düşük", `bekleyen fotoğraf (yayında değil): ${BEK[r.slug].neden.slice(0, 80)}`);
  /* görünüm (yerel derleme) */
  if (GR) { const g = GR[r.slug];
    if (!g) add("görünüm", "orta", "yerel profil denetimi çalıştırılmadı");
    else {
      if (g.profil !== true) add("görünüm", "yüksek", `profil açılmadı ya da ad/ilçe yok (${g.status})`);
      if (g.arama !== true) add("arama", "orta", "arama ilk 8'de yok (ad, ad + mahalle/ilçe)");
      if (g.sitemap !== true && !kap) add("seo", "orta", "sitemap'te yok");
      if (isB1 && g.b1Uyari !== true) add("açıklama", "yüksek", "B1 kaydında sokak düzeyi uyarısı görünmüyor");
      if (isB1 && g.kesinKonumIddiasi === true) add("kod", "yüksek", "B1 kaydında 360° bağlantısı kesin koordinatla açılıyor (map_action=pano&viewpoint); kod düzeyi, PR #22'de kaldırılıyor");
      if (!geo && g.osmAtfiKonumsuz === true) add("kod", "orta", "koordinatsız kayıtta 'Konum OpenStreetMap adres verisinden' yazıyor; kod düzeyi, PR #14 düzeltmesi bekliyor");
      if (!geo && g.jsonLdGeo === true) add("seo", "yüksek", "koordinatsız kayıtta JSON-LD geo var");
      if (geo && !isB1 && g.jsonLdGeo === false) add("seo", "düşük", "koordinatlı kayıtta JSON-LD geo yok");
      if (kap?.state === "closed_confirmed" && g.kapaliUyari !== true) add("açıklama", "yüksek", "kapanmış mekân profilinde kapanış uyarısı görünmüyor");
    } }
  /* sınıf: kod düzeyi sorunlar (bütün kayıtları aynı biçimde etkileyen şablon hataları) ve bağlantı/arama/seo notları sınıfı değiştirmez; ayrıca sayılır */
  const SINIF_EKSEN = new Set(["şema", "ad", "adres", "konum", "kategori", "tür", "faaliyet", "fotoğraf", "görünüm", "kapsam", "kaynak", "açıklama"]);
  const ciddi = S.filter((s) => SINIF_EKSEN.has(s.eksen) && (s.onem === "yüksek" || (s.onem === "orta" && !["ad"].includes(s.eksen))));
  const sinif = kap?.state === "closed_confirmed" ? "kapalı" : isB1 ? (ciddi.some((s) => s.onem === "yüksek") ? "inceleme gerekli" : "B1") : ciddi.length ? "inceleme gerekli" : geo ? "A" : "A-konumsuz";
  rows.push({ slug: r.slug, ad: r.name, ilce: r.district, kategori: r.categoryId, tur: r.kind, dalga: r.wave ?? null, kaynak: biz ? "işletme kaydı" : "OSM", konumGuveni: konum, sinif, sorunlar: S, profilMetni: PROFILES.has(r.slug), fotograf: foto.length });
}
/* mükerrer (çapraz kayıt) */
const dupPairs: any[] = [];
for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const a = all[i], b = all[j]; const why: string[] = [];
  if (tel(a.phone).length === 10 && tel(a.phone) === tel(b.phone)) why.push("aynı telefon");
  if (fold(a.name) === fold(b.name) && a.district === b.district) why.push("aynı ad + ilçe");
  if (typeof a.lat === "number" && typeof b.lat === "number" && meters(a as any, b as any) < 60 && fold(a.name).split(" ")[0] === fold(b.name).split(" ")[0]) why.push("60 m içinde aynı ilk ad sözcüğü");
  const ha = host(a.website), hb = host(b.website); if (ha && ha === hb && a.district === b.district && fold(a.name).split(" ")[0] === fold(b.name).split(" ")[0]) why.push("aynı site alanı + ilçe + ad");
  if (why.length) dupPairs.push({ a: a.slug, b: b.slug, neden: why }); }
/* ayrı şube/tesis: iki kayıt da koordinatlı, ≥ 1 km uzak ve adresleri farklıysa (aynı marka/kurum: Burger Yiyelim, İBB Kent Lokantası) mükerrer sayılmaz; not düşer */
for (const d of dupPairs) { const a = bySlug.get(d.a)!, b = bySlug.get(d.b)!; const uzak = typeof a.lat === "number" && typeof b.lat === "number" ? Math.round(meters(a as any, b as any)) : null;
  d.mesafeM = uzak; d.karar = uzak !== null && uzak >= 1000 && (a.address ?? "") !== (b.address ?? "") ? "ayrı şube/tesis" : "olası mükerrer — elle karar";
  for (const s of [d.a, d.b]) { const r = rows.find((x) => x.slug === s);
    if (d.karar === "ayrı şube/tesis") r.sorunlar.push({ eksen: "mükerrer", onem: "düşük", not: `aynı marka/kurum, ayrı şube: ${s === d.a ? d.b : d.a} (${uzak} m, farklı adres)` });
    else { r.sorunlar.push({ eksen: "mükerrer", onem: "yüksek", not: `olası mükerrer: ${s === d.a ? d.b : d.a} (${d.neden.join(", ")}; ${uzak ?? "—"} m)` }); if (r.sinif !== "kapalı") r.sinif = "inceleme gerekli"; } } }
/* özet */
const cnt = (a: string[]) => a.reduce((m: Record<string, number>, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});
const sorunSay: Record<string, number> = {}; for (const r of rows) for (const s of new Set(r.sorunlar.map((x: Sorun) => `${x.eksen} · ${x.not.replace(/\(.*?\)|: .*$|\d{4}-\d\d-\d\d|dalga \d+/g, "").trim()}`))) sorunSay[s as string] = (sorunSay[s as string] ?? 0) + 1;
const ozet = { tarih: "2026-11-12", kaynak: "feature/investor-v1 @ 721b1a1 (Production kodu, salt okunur)", kayit: rows.length, sinif: cnt(rows.map((r) => r.sinif)), kategori: cnt(rows.map((r) => r.kategori)), konumGuveni: cnt(rows.map((r) => r.konumGuveni)), kaynakTuru: cnt(rows.map((r) => r.kaynak)),
  incelemeNedeni: cnt(rows.filter((r) => r.sinif === "inceleme gerekli").flatMap((r) => [...new Set(r.sorunlar.filter((s: Sorun) => s.onem !== "düşük" && !["kod", "bağlantı", "seo", "arama"].includes(s.eksen) && !(s.eksen === "ad" && s.onem === "orta")).map((s: Sorun) => s.eksen))] as string[])),
  kodDuzeyi: cnt(rows.flatMap((r) => r.sorunlar.filter((s: Sorun) => s.eksen === "kod").map((s: Sorun) => s.not))),
  yalnizFaaliyetEksik: rows.filter((r) => r.sinif === "inceleme gerekli" && r.sorunlar.filter((s: Sorun) => s.onem !== "düşük").every((s: Sorun) => s.eksen === "faaliyet" && /tarihli faaliyet kanıtı yok/.test(s.not))).length,
  olasiMukerrerCift: dupPairs.filter((d) => d.karar !== "ayrı şube/tesis").length, ayriSubeCift: dupPairs.filter((d) => d.karar === "ayrı şube/tesis").length, sorunlar: Object.fromEntries(Object.entries(sorunSay).sort((a, b) => b[1] - a[1])), siteErisim: !!ER, gorunum: !!GR };
writeFileSync(outP, JSON.stringify({ _aciklama: "Gidenler katalog kalite envanteri. Otomatik denetim; veri değiştirilmedi. Sınıflar ve kurallar scripts/katalog/katalog-denetim.ts başlığında.", ozet, mukerrer: dupPairs, kayitlar: rows }, null, 1));
console.log(JSON.stringify(ozet, null, 1));
