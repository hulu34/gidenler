#!/usr/bin/env node
/* Gerçek RESTORAN dalgası (Faz 1): 148 → 400 → 700 → 1.000.
   Kullanım:  node scripts/osm-wave.mjs <hedef-restoran> <wave-no> raw/*.json   (semt başına { district, elements })
   · Mevcut kayıtlar KORUNUR: slug, ad, konum değişmez; yalnız kaynakta hâlâ var mı diye doğrulanır
     ve OSM türü (osmAmenity) eklenir.
   · Hedefe yalnız OSM'de amenity=restaurant olan kayıtlar sayılır; kafe, bar, pub, fast_food sayılmaz.
   · Yeni eklemeler: yalnız amenity=restaurant, zincir değil, ad jenerik değil, en az bir kaynak bilgisi
     (web, Instagram, saat, mutfak, telefon, adres), semtler arasında sırayla (en iyi aday önce).
   · Zorunlu alanlar: ad, konum (lat/lng + semt), kategori, kaynak (OSM ref), tekrarsız slug.
   Çıktı: data/real/venues.json + scratch rapor (stdout JSON). Kaynak: © OpenStreetMap katkıcıları (ODbL). */
import { readFileSync, writeFileSync } from "node:fs";
import { cleanVenues, resolveCommons, selectVenues } from "./osm-select.mjs";

const [targetArg, waveArg, ...files] = process.argv.slice(2);
const TARGET = Number(targetArg), WAVE = Number(waveArg);
if (!TARGET || !WAVE || !files.length) { console.error("kullanım: osm-wave.mjs <hedef> <dalga> raw/*.json"); process.exit(2); }

const venuesUrl = new URL("../data/real/venues.json", import.meta.url);
const existing = JSON.parse(readFileSync(venuesUrl, "utf8"));
const raws = files.map((f) => JSON.parse(readFileSync(f, "utf8")));

/* İstanbul il sınırı kabaca: kayıt bunun dışındaysa konum hatalıdır. */
const IN_IST = (lat, lng) => lat > 40.8 && lat < 41.6 && lng > 27.9 && lng < 29.95;
const REF = /^(node|way|relation)\/\d+$/;

/* 1) Mevcut kayıtları kaynağa karşı doğrula */
const byRef = new Map();
for (const { district, elements } of raws) for (const e of elements) byRef.set(`${e.type}/${e.id}`, { e, district });
const check = { total: existing.length, foundInOsm: 0, missingInOsm: [], amenityChanged: [], nameChanged: [], disused: [], districtMismatch: [] };
for (const v of existing) {
  const hit = byRef.get(v.ref);
  if (!hit) { check.missingInOsm.push(v.slug); continue; }
  check.foundInOsm++;
  const t = hit.e.tags;
  v.osmAmenity ??= t.amenity;
  if (t.amenity !== v.osmAmenity) check.amenityChanged.push(`${v.slug}: ${v.osmAmenity}→${t.amenity}`);
  if (t.name?.trim().toLocaleLowerCase("tr") !== v.name.toLocaleLowerCase("tr")) check.nameChanged.push(`${v.slug}: "${t.name}"`);
  if (t.disused === "yes" || t["disused:amenity"]) check.disused.push(v.slug);
  if (hit.district !== v.district) check.districtMismatch.push(`${v.slug}: ${v.district}→${hit.district}`);
  v.wave ??= 0;
}

/* 2) Yeni restoranlar: semt başına aday listesi, sırayla seçim */
const isRestaurant = (v) => v.osmAmenity === "restaurant";
let have = existing.filter(isRestaurant).length;
const need = Math.max(0, TARGET - have);
const takenRefs = new Set(existing.map((v) => v.ref));
const takenSlugs = new Set(existing.map((v) => v.slug));
const takenNames = new Set(existing.map((v) => v.name.toLocaleLowerCase("tr")));

/* osm-select'in puan/temizlik kuralları aynen kullanılır; kota = sınırsız, tür tavanı korunur. */
const perDistrict = raws.map(({ district, elements }) => {
  const onlyRest = elements.filter((e) => e.tags?.amenity === "restaurant" && !takenRefs.has(`${e.type}/${e.id}`));
  const cands = selectVenues([{ district, elements: onlyRest }], { quotas: { [district]: onlyRest.length }, importedAt: new Date().toISOString().slice(0, 10) });
  return { district, cands };
}).filter((d) => d.cands.length);

const kindCount = new Map();
const KIND_CAP = Math.max(10, Math.ceil(need * 0.3));
const picked = [];
for (let round = 0; picked.length < need; round++) {
  let progressed = false;
  for (const d of perDistrict) {
    if (picked.length >= need) break;
    while (d.cands.length) {
      const v = d.cands.shift();
      const key = v.name.toLocaleLowerCase("tr");
      if (takenNames.has(key) || takenRefs.has(v.ref)) continue;
      /* otel/hostel/pansiyon: restoran hedefine alınmaz (konaklama işletmesinin restoranı ayrı doğrulanmalı) */
      if (/\b(hotel|otel|hostel|pansiyon|suites?)\b/i.test(v.name)) continue;
      if ((kindCount.get(v.kind) ?? 0) >= KIND_CAP) continue;
      if (!IN_IST(v.lat, v.lng)) continue;
      let slug = v.slug;
      if (takenSlugs.has(slug)) slug = `${slug}-${v.ref.split("/")[1]}`;
      takenNames.add(key); takenRefs.add(v.ref); takenSlugs.add(slug);
      kindCount.set(v.kind, (kindCount.get(v.kind) ?? 0) + 1);
      picked.push({ ...v, slug, osmAmenity: "restaurant", wave: WAVE });
      progressed = true;
      break;
    }
  }
  if (!progressed) break;
}

/* Temizlik bir kaydı kafeye çevirirse (ör. adı "pastane") restoran hedefine alınmaz. */
const cleaned = cleanVenues(await resolveCommons(picked)).filter((v) => v.categoryId === "cat.restaurant");
const all = [...existing, ...cleaned];

/* 3) Zorunlu alan ve tekrar kontrolü — biri bile bozuksa dosya yazılmaz */
const invalid = all.filter((v) => !v.name?.trim() || typeof v.lat !== "number" || typeof v.lng !== "number" || !IN_IST(v.lat, v.lng)
  || !v.district || !["cat.restaurant", "cat.cafe", "cat.bar"].includes(v.categoryId) || !REF.test(v.ref) || !v.slug);
const dup = (k) => all.length - new Set(all.map(k)).size;
const integrity = { invalid: invalid.map((v) => v.slug), dupSlug: dup((v) => v.slug), dupRef: dup((v) => v.ref) };
if (invalid.length || integrity.dupSlug || integrity.dupRef) { console.log(JSON.stringify({ check, integrity }, null, 1)); process.exit(1); }

const toJsonLines = (list) => "[\n" + list.map((v) => JSON.stringify(v)).join(",\n") + "\n]\n";
writeFileSync(venuesUrl, toJsonLines(all));

const count = (xs, k) => Object.fromEntries([...xs.reduce((m, x) => m.set(k(x), (m.get(k(x)) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1]));
const has = (k) => all.filter((v) => v[k] != null && v[k] !== "").length;
console.log(JSON.stringify({
  wave: WAVE, target: TARGET, added: cleaned.length,
  totals: { all: all.length, restaurantTarget: all.filter(isRestaurant).length, byOsmAmenity: count(all, (v) => v.osmAmenity ?? "unknown"), byCategory: count(all, (v) => v.categoryId) },
  newByDistrict: count(cleaned, (v) => v.district), newByKind: count(cleaned, (v) => v.kind),
  fieldFill: { address: has("address"), phone: has("phone"), website: has("website"), instagram: has("instagram"), openingHours: has("openingHours"), cuisine: has("cuisine"), image: has("image"), neighborhood: has("neighborhood") },
  existingCheck: check, integrity,
}, null, 1));
