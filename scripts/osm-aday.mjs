#!/usr/bin/env node
/* YENİ RESTORAN ADAY HAVUZU (1.000 mekân operasyonu) — venues.json'a YAZMAZ; yalnız aday listesi üretir.
   Kullanım: node scripts/osm-aday.mjs <havuz-boyu> <çıktı.json> raw/*.json   (semt başına { district, elements })
   Kurallar (osm-select'in puan/temizlik kuralları + daha sıkı süzgeç):
   · yalnız amenity=restaurant; zincir (brand) yok; jenerik ad yok; kapalı/disused yok; otel/pansiyon adı yok
   · en az bir doğrulanabilir bilgi: sokak adresi, telefon ya da işletme web sitesi
   · mükerrer: mevcut kayıtla aynı OSM ref, aynı ad (aynı semt ya da 150 m), aynı telefon (son 10 hane),
     aynı alan adı (300 m içinde) → alınmaz ve raporlanır; aday havuzu içinde de aynı kurallar
   · çeşitlilik: semtler arasında sırayla; tür tavanı %22; bir semtten en çok havuzun %8'i
   Sonraki adım: Google sayfasında doğrulama (gpuan-arama, ADAYLAR) → yalnız güçlü kanıtlı olanlar eklenir. */
import { readFileSync, writeFileSync } from "node:fs";
import { selectVenues, cleanVenues } from "./osm-select.mjs";

const [sizeArg, outFile, ...files] = process.argv.slice(2);
const SIZE = Number(sizeArg);
if (!SIZE || !outFile || !files.length) { console.error("kullanım: osm-aday.mjs <boy> <çıktı.json> raw/*.json"); process.exit(2); }

const existing = JSON.parse(readFileSync(new URL("../data/real/venues.json", import.meta.url), "utf8"));
const raws = files.map((f) => JSON.parse(readFileSync(f, "utf8")));
const IN_IST = (lat, lng) => lat > 40.8 && lat < 41.6 && lng > 27.9 && lng < 29.95;
const fold = (s) => (s ?? "").toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
const phoneKey = (p) => { const d = String(p ?? "").replace(/\D/g, ""); return d.length >= 10 ? d.slice(-10) : ""; };
const SHARED = /(^|\.)(instagram|facebook|linktr|linktree|bit|wa|whatsapp|google|goo|tripadvisor|yemeksepeti|getir|trendyol|menu|qr|sites|business|wixsite|blogspot)\./i;
const webKey = (u) => { try { const h = new URL(/^https?:/i.test(u ?? "") ? u : `https://${u}`).hostname.toLowerCase().replace(/^www\./, ""); return !h || SHARED.test(`.${h}`) ? "" : h; } catch { return ""; } };
const distM = (a, b) => { const R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const HOTEL = /\b(hotel|otel|hostel|pansiyon|suites?|apart|resort)\b/i;
/* kamu/kurum yemekhanesi, düğün salonu, catering: restoran hedefi değil */
const NOT_PUBLIC = /\b(yemekhane|kantin|catering|düğün salonu|dugun salonu|sosyal tesis|orduevi|polisevi|öğretmenevi|ogretmenevi|misafirhane|dining hall|kafeterya|cafeteria)\b|belediye|üniversite|universite|kampüs|kampus|hastane/i;

const pool = [...existing];
const dupOf = (v) => {
  const n = fold(v.name), p = phoneKey(v.phone), w = webKey(v.website);
  for (const e of pool) {
    if (e.ref === v.ref) return { why: "aynı OSM kaydı", with: e.slug };
    const near = typeof e.lat === "number" && distM(e, v);
    if (fold(e.name) === n && (e.district === v.district || near <= 150)) return { why: "aynı ad (aynı semt / 150 m)", with: e.slug };
    if (p && phoneKey(e.phone) === p) return { why: "aynı telefon", with: e.slug };
    if (w && webKey(e.website) === w && near !== false && near <= 300) return { why: "aynı alan adı 300 m içinde", with: e.slug };
  }
  return null;
};

const today = new Date().toISOString().slice(0, 10);
/* OSM doluluk puanı alt sınırı: kalite kapısı asıl olarak Google doğrulamasıdır (ad + konum + tür + kapanma);
   burada en az bir ek bilgi (saat, mutfak, telefon ya da adres) istenir. */
const MIN_SCORE = Number(process.env.MIN_SCORE ?? 5);
const per = raws.map(({ district, elements }) => {
  const rest = elements.filter((e) => e.tags?.amenity === "restaurant");
  return { district, cands: selectVenues([{ district, elements: rest }], { quotas: { [district]: rest.length }, importedAt: today, minScore: MIN_SCORE }) };
}).filter((d) => d.cands.length);

const rejected = { otel: 0, kurum: 0, bilgiYok: 0, konum: 0, turTavani: 0, semtTavani: 0 }; const dups = [];
const kindCount = new Map(), distCount = new Map();
const KIND_CAP = Math.ceil(SIZE * 0.22), DIST_CAP = Math.max(6, Math.ceil(SIZE * 0.08));
const picked = [];
for (let round = 0; picked.length < SIZE; round++) {
  let progressed = false;
  for (const d of per) {
    if (picked.length >= SIZE) break;
    if ((distCount.get(d.district) ?? 0) >= DIST_CAP) { continue; }
    while (d.cands.length) {
      const v = d.cands.shift();
      if (HOTEL.test(v.name)) { rejected.otel++; continue; }
      if (NOT_PUBLIC.test(v.name)) { rejected.kurum++; continue; }
      if (!v.address && !v.phone && !webKey(v.website)) { rejected.bilgiYok++; continue; }
      if (pool.some((e) => e.ref === v.ref)) continue;   // zaten Gidenler'de (mükerrer sayılmaz)
      if (!IN_IST(v.lat, v.lng)) { rejected.konum++; continue; }
      if ((kindCount.get(v.kind) ?? 0) >= KIND_CAP) { rejected.turTavani++; continue; }
      const dup = dupOf(v); if (dup) { dups.push({ name: v.name, district: v.district, ...dup }); continue; }
      let slug = v.slug; if (pool.some((e) => e.slug === slug)) slug = `${slug}-${v.ref.split("/")[1]}`;
      const c = { ...v, slug, osmAmenity: "restaurant" };
      pool.push(c); picked.push(c);
      kindCount.set(v.kind, (kindCount.get(v.kind) ?? 0) + 1); distCount.set(v.district, (distCount.get(v.district) ?? 0) + 1);
      progressed = true; break;
    }
  }
  if (!progressed) break;
}
const cleaned = cleanVenues(picked).filter((v) => v.categoryId === "cat.restaurant");
writeFileSync(outFile, JSON.stringify(cleaned, null, 1));
const count = (xs, k) => Object.fromEntries([...xs.reduce((m, x) => m.set(k(x), (m.get(k(x)) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1]));
const has = (k) => cleaned.filter((v) => v[k] != null && v[k] !== "").length;
console.log(JSON.stringify({ size: SIZE, picked: cleaned.length, districts: Object.keys(count(cleaned, (v) => v.district)).length,
  byDistrict: count(cleaned, (v) => v.district), byKind: count(cleaned, (v) => v.kind),
  fill: { address: has("address"), phone: has("phone"), website: has("website"), cuisine: has("cuisine"), openingHours: has("openingHours"), neighborhood: has("neighborhood") },
  rejected, duplicates: dups.length, duplicateSample: dups.slice(0, 8) }, null, 1));
