#!/usr/bin/env node
/* SEYREK İLÇE PAKETİ — aday seçimi ve AÇIK OLMA doğrulaması (Google KULLANILMAZ; ücretli ya da ücretsiz hiçbir Google ucu yok).
   Kullanım: node scripts/seyrek-aday.mjs <ham-dizin> <katalog.json> <çıktı-dizini> [önceki-havuz.json ...]
     ham-dizin   : ilçe başına Overpass JSON'u ({ district, elements }, `out meta` ile)
     katalog.json: mükerrer denetimi için TAM katalog (Production 456 + bekleyen 140/104/206 paketleri = 906)
     önceki havuz: daha önce denenmiş aday havuzları — orada olup katalogda olmayan kayıt önceki doğrulamadan geçmemiştir
   Kurallar:
   · yalnız amenity=restaurant / fast_food (+ kahvaltı kafesi); zincir (brand) yok; jenerik ad yok; kapalı/disused yok;
     otel, kurum yemekhanesi, düğün salonu yok; sokak adresi ZORUNLU (adres OSM'den, başka kaynaktan kopyalanmaz)
   · mükerrer: aynı OSM kaydı, aynı ad (aynı ilçe / 150 m), aynı çekirdek ad 400 m, aynı telefon, aynı alan adı 300 m
   · AÇIK OLMA kanıtı (biri şart): (a) işletmenin kendi web sitesi bugün yanıt veriyor ve sayfada işletmenin adı geçiyor;
     (b) OSM'de son 18 ay içinde yerinde kontrol tarihi (check_date / survey:date)
   · kanıtı olmayan, zincir şüphesi olan, türü yalnız "Restoran" olan, önceki doğrulamadan geçmemiş adaylar AYRI inceleme
     listesine gider; pakete girmez. Sayı doldurmak için kural gevşetilmez.
   Çıktı: <çıktı>/paket.json (doğrulananlar, venues.json biçiminde + kanıt), <çıktı>/inceleme.json, rapor (stdout).
   Kaynak: © OpenStreetMap katkıcıları (ODbL). */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { cleanVenues, selectVenues } from "./osm-select.mjs";

const [rawDir, katalogFile, outDir, ...prevPools] = process.argv.slice(2);
if (!rawDir || !katalogFile || !outDir) { console.error("kullanım: seyrek-aday.mjs <ham> <katalog> <çıktı> [havuz...]"); process.exit(2); }
mkdirSync(outDir, { recursive: true });
const TODAY = process.env.KONTROL_TARIHI ?? new Date().toISOString().slice(0, 10);
const PER_DISTRICT = Number(process.env.ILCE_TAVAN ?? 4), TOTAL = Number(process.env.TOPLAM_TAVAN ?? 60);
const CHECK_SINCE = new Date(Date.parse(`${TODAY}T00:00:00Z`) - 548 * 864e5).toISOString().slice(0, 10);   // 18 ay

const katalog = JSON.parse(readFileSync(katalogFile, "utf8"));
/* elle bulunan ek kanıtlar ve zincir işaretleri (data/paket/seyrek-kanit.json) */
const EK = process.env.EK_KANIT ? JSON.parse(readFileSync(process.env.EK_KANIT, "utf8")) : { kanit: {}, zincir: {} };
const prevRefs = new Set(prevPools.flatMap((f) => JSON.parse(readFileSync(f, "utf8")).map((v) => v.ref)));
const katalogRefs = new Set(katalog.map((v) => v.ref));

const fold = (s) => (s ?? "").toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
const GEN = /\b(restoran|restaurant|lokanta|lokantasi|cafe|kafe|kebap|kebapcisi|kebab|ocakbasi|balik|balikcisi|pide|pidecisi|salonu|evi|bistro|steakhouse|et|burger|pizza|pizzeria|ve|the|and|izgara|sofrasi|mutfagi)\b/g;
const core = (n) => fold(n).replace(GEN, " ").replace(/\s+/g, " ").trim();
const phoneKey = (p) => { const d = String(p ?? "").replace(/\D/g, ""); return d.length >= 10 ? d.slice(-10) : ""; };
const SHARED = /(^|\.)(instagram|facebook|linktr|linktree|bit|wa|whatsapp|google|goo|tripadvisor|yemeksepeti|getir|trendyol|menu|qr|sites|business|wixsite|blogspot|foursquare|zomato)\./i;
const webKey = (u) => { if (!u) return ""; try { const h = new URL(/^https?:/i.test(u ?? "") ? u : `https://${u}`).hostname.toLowerCase().replace(/^www\./, ""); return !h || SHARED.test(`.${h}`) ? "" : h; } catch { return ""; } };
const distM = (a, b) => { const R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const IN_IST = (lat, lng) => lat > 40.8 && lat < 41.6 && lng > 27.9 && lng < 29.95;
const HOTEL = /\b(hotel|otel|hostel|pansiyon|suites?|apart|resort)\b/i;
const NOT_PUBLIC = /\b(yemekhane|kantin|catering|düğün salonu|dugun salonu|sosyal tesis|orduevi|polisevi|öğretmenevi|ogretmenevi|misafirhane|dining hall|kafeterya|cafeteria)\b|belediye|üniversite|universite|kampüs|kampus|hastane/i;
const CLOSED_TAG = (t) => t.disused === "yes" || Object.keys(t).some((k) => /^(disused|was|abandoned|demolished|razed):/.test(k)) || /^(closed|off)$/i.test(t.opening_hours ?? "") || /kapand|kapalı|kapali/i.test(t.name ?? "") || !!t["end_date"];

/* ── ham veri ─────────────────────────────────────────────────────────────── */
/* OSM sınır adı ≠ katalogdaki ilçe adı (ör. "Kâğıthane" → "Kağıthane") */
const DISTRICT_NAME = { "Kâğıthane": "Kağıthane" };
const raws = readdirSync(rawDir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${rawDir}/${f}`, "utf8"))).map((r) => ({ ...r, district: DISTRICT_NAME[r.district] ?? r.district }));
/* zincir şüphesi: aynı çekirdek ad ham veride 3+ kez ya da katalogda başka ilçede */
const coreCount = new Map();
for (const { elements } of raws) for (const e of elements) { const c = core(e.tags?.name); if (c) coreCount.set(c, (coreCount.get(c) ?? 0) + 1); }

const sayac = { ham: 0, uygunTur: 0, jenerikAd: 0, otelKurum: 0, kapali: 0, adresYok: 0, konum: 0, zincirEtiketi: 0, mukerrer: 0 };
const mukerrer = [], inceleme = [], adaylar = [];
const pool = [...katalog];
const dupOf = (v) => {
  const n = fold(v.name), c = core(v.name), p = phoneKey(v.phone), w = webKey(v.website);
  for (const e of pool) {
    if (e.ref === v.ref) return { neden: "aynı OSM kaydı", ile: e.slug };
    const near = typeof e.lat === "number" ? distM(e, v) : Infinity;
    if (fold(e.name) === n && (e.district === v.district || near <= 150)) return { neden: "aynı ad (aynı ilçe / 150 m)", ile: e.slug };
    if (c && core(e.name) === c && near <= 400) return { neden: "aynı çekirdek ad 400 m içinde", ile: e.slug };
    if (p && phoneKey(e.phone) === p) return { neden: "aynı telefon", ile: e.slug };
    if (w && webKey(e.website) === w && near <= 300) return { neden: "aynı alan adı 300 m içinde", ile: e.slug };
  }
  return null;
};
const osmUrl = (ref) => `https://www.openstreetmap.org/${ref}`;

for (const { district, elements } of raws) {
  for (const e of elements) {
    const t = e.tags ?? {}; sayac.ham++;
    if (!t.name) continue;
    const breakfastCafe = t.amenity === "cafe" && (/breakfast/.test(t.cuisine ?? "") || /kahvalt/i.test(t.name));
    if (!["restaurant", "fast_food"].includes(t.amenity) && !breakfastCafe) continue;
    sayac.uygunTur++;
    if (t.brand || t["brand:wikidata"]) { sayac.zincirEtiketi++; continue; }
    if (CLOSED_TAG(t)) { sayac.kapali++; continue; }
    /* fast_food: yalnız oturup yemek yenen Türk mutfağı türleri (kebap, döner, pide, lahmacun, köfte, çorba, mantı) restoran gibi
       değerlendirilir; burger/pizza zinciri riskli olduğundan fast_food olarak gelirse alınmaz. */
    const DINE = /kebab|kebap|doner|döner|pide|lahmacun|turkish|kofte|köfte|meatball|soup|corba|çorba|manti|mantı|kokorec|kokoreç|tantuni|ciger|ciğer|pilav|ev yemek|lokanta/i;
    if (t.amenity === "fast_food" && !DINE.test(`${t.cuisine ?? ""} ${t.name}`)) { sayac.fastFoodTurDisi = (sayac.fastFoodTurDisi ?? 0) + 1; continue; }
    const ee = t.amenity === "fast_food" ? { ...e, tags: { ...t, amenity: "restaurant" } } : e;
    const built = cleanVenues(selectVenues([{ district, elements: [ee] }], { quotas: { [district]: 1 }, minScore: 0, importedAt: TODAY }));
    if (!built.length) { sayac.jenerikAd++; continue; }
    const v = built[0];
    if (HOTEL.test(v.name) || NOT_PUBLIC.test(v.name)) { sayac.otelKurum++; continue; }
    if (!IN_IST(v.lat, v.lng)) { sayac.konum++; continue; }
    if (!t["addr:street"]) { sayac.adresYok++; continue; }
    const dup = dupOf(v); if (dup) { sayac.mukerrer++; mukerrer.push({ ad: v.name, ilce: district, ...dup }); continue; }
    const check = t.check_date ?? t["survey:date"] ?? t["check_date:opening_hours"] ?? null;
    adaylar.push({ v: { ...v, osmAmenity: t.amenity === "cafe" ? "cafe" : t.amenity }, t, check, edited: (e.timestamp ?? "").slice(0, 10), coreN: coreCount.get(core(v.name)) ?? 0 });
    pool.push(v);
  }
}

/* ── açık olma kanıtı: işletmenin kendi web sitesi ─────────────────────────── */
async function siteEvidence(v) {
  if (!v.website) return null;
  const w = webKey(v.website); if (!w) return null;
  const url = /^https?:/i.test(v.website) ? v.website : `https://${v.website}`;
  try {
    const r = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; gidenler-kontrol/1.0; +https://www.gidenler.com)", "accept-language": "tr" }, signal: AbortSignal.timeout(15000) });
    if (r.status >= 400) return { ok: false, not: `web sitesi HTTP ${r.status}` };
    const html = (await r.text()).slice(0, 400000);
    const words = fold(v.name).split(" ").filter((x) => x.length >= 4 && !/^(restoran|restaurant|lokanta|lokantasi|kebap|cafe|kafe)$/.test(x));
    const page = fold(html.replace(/<[^>]+>/g, " "));
    const hit = words.length ? words.some((x) => page.includes(x)) : page.includes(fold(v.name));
    if (/alan adı satılık|domain (is )?for sale|bu alan adı|parked|this domain|hesap askıya|account suspended/i.test(html)) return { ok: false, not: "alan adı park / satılık" };
    return hit ? { ok: true, url: r.url, not: "işletmenin web sitesi yanıt veriyor, adı sayfada geçiyor" } : { ok: false, not: "web sitesi açılıyor ama işletme adı sayfada yok" };
  } catch (err) { return { ok: false, not: `web sitesine ulaşılamadı (${String(err.name ?? err).slice(0, 30)})` }; }
}

const today = TODAY;
const sonuc = [];
for (const a of adaylar) {
  const ev = await siteEvidence(a.v);
  const checkOk = a.check && a.check >= CHECK_SINCE;
  const reasons = [];
  if (prevRefs.has(a.v.ref) && !katalogRefs.has(a.v.ref)) reasons.push("önceki doğrulamada geçmedi (Google sayfasında güçlü kanıt yoktu)");
  if (a.coreN >= 3) reasons.push(`zincir şüphesi: aynı ad ham veride ${a.coreN} kez`);
  if (EK.zincir?.[a.v.slug]) reasons.push(`zincir şüphesi: ${EK.zincir[a.v.slug]}`);
  const ek = EK.kanit?.[a.v.slug];
  if (a.v.kind === "Restoran" && !a.v.cuisine) reasons.push("türü yalnız “Restoran”: ayırt edici mutfak bilgisi yok");
  if (!(ev?.ok) && !checkOk && !ek) reasons.push(`açık olduğu belirsiz: ${ev ? ev.not : "web sitesi yok"}${a.check ? `; OSM kontrol tarihi ${a.check} (eski)` : "; OSM'de yerinde kontrol tarihi yok"}`);
  const kanit = [ev?.ok ? ev.not : null, checkOk ? `OSM yerinde kontrol tarihi ${a.check}` : null, ek ? ek.not : null].filter(Boolean);
  const kaynak = [osmUrl(a.v.ref), ev?.ok ? ev.url : null, ...(ek?.kaynak ?? [])].filter(Boolean);
  const seviye = ev?.ok ? "güçlü (işletmenin web sitesi)" : checkOk ? "güçlü (OSM yerinde kontrol)" : ek ? `${ek.seviye} (sipariş platformu listesi)` : null;
  const row = { ad: a.v.name, ilce: a.v.district, mahalle: a.v.neighborhood ?? null, tur: a.v.kind, mutfak: a.v.cuisine ?? null, adres: a.v.address, kaynak, kontrolTarihi: today, osmSonDuzenleme: a.edited || null, kanit, seviye, slug: a.v.slug };
  if (reasons.length) inceleme.push({ ...row, neden: reasons }); else sonuc.push({ row, v: a.v });
}

/* ── seçim: ilçe başına tavan, ilçeler arasında sırayla; tür tavanı %25 ────── */
const byD = new Map(); for (const s of sonuc) { const l = byD.get(s.v.district) ?? []; l.push(s); byD.set(s.v.district, l); }
for (const l of byD.values()) l.sort((x, y) => (y.row.kanit.length - x.row.kanit.length) || (y.v.cuisine ? 1 : 0) - (x.v.cuisine ? 1 : 0) || x.v.name.localeCompare(y.v.name, "tr"));
const picked = [], kindN = new Map(), dN = new Map(), KIND_CAP = Math.ceil(TOTAL * 0.25);
for (let round = 0; picked.length < TOTAL; round++) {
  let moved = false;
  for (const [d, l] of byD) {
    if (picked.length >= TOTAL || (dN.get(d) ?? 0) >= PER_DISTRICT) continue;
    while (l.length) { const s = l.shift(); if ((kindN.get(s.v.kind) ?? 0) >= KIND_CAP) { inceleme.push({ ...s.row, neden: ["tür tavanı (%25) doldu — doğrulandı, sonraki pakete"] }); continue; }
      picked.push(s); kindN.set(s.v.kind, (kindN.get(s.v.kind) ?? 0) + 1); dN.set(d, (dN.get(d) ?? 0) + 1); moved = true; break; }
  }
  if (!moved) break;
}
for (const l of byD.values()) for (const s of l) inceleme.push({ ...s.row, neden: ["ilçe tavanı doldu — doğrulandı, sonraki pakete"] });

writeFileSync(`${outDir}/paket.json`, JSON.stringify(picked.map((s) => ({ ...s.v, osmAmenity: s.v.osmAmenity ?? "restaurant", kanit: s.row.kanit, kanitSeviyesi: s.row.seviye, kaynak: s.row.kaynak, kontrolTarihi: today })), null, 1));
writeFileSync(`${outDir}/inceleme.json`, JSON.stringify(inceleme, null, 1));
writeFileSync(`${outDir}/mukerrer.json`, JSON.stringify(mukerrer, null, 1));
const perD = {}; for (const s of picked) perD[s.v.district] = (perD[s.v.district] ?? 0) + 1;
const perReason = {}; for (const r of inceleme) for (const n of r.neden) { const k = n.split(":")[0].split(" (")[0]; perReason[k] = (perReason[k] ?? 0) + 1; }
console.log(JSON.stringify({ sayac, adayDogrulamaya: adaylar.length, dogrulanan: sonuc.length, pakete: picked.length, ilceBasina: perD, inceleme: inceleme.length, incelemeNedenleri: perReason, mukerrer: mukerrer.length }, null, 1));
