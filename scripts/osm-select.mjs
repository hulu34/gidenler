/* ==========================================================================
   OSM → GERÇEK MEKÂN SEÇİCİ (V8)
   --------------------------------------------------------------------------
   Girdi: semt başına Overpass JSON'u ({ district, elements }).
   Çıktı: data/real/venues.json kayıtları (bkz. data/real/index.ts → RealVenueRecord).

   Seçim ilkeleri:
   · Zincirler değil bağımsız mekânlar (brand / brand:wikidata etiketi olanlar elenir).
   · Bilinirlik + bakımlı kayıt: wikidata/wikipedia > web sitesi > Instagram > saat > mutfak > telefon.
   · Semt kotası ve tür çeşitliliği (bir türden en fazla %35).
   · Yalnızca kaynaktaki bilgi; hiçbir alan tahmin edilmez.
   Bu dosya hem Node'da (scripts/import-osm.mjs) hem tarayıcıda (Overpass'a doğrudan erişim) çalışır.
   ========================================================================== */

export const DISTRICT_QUOTAS = {
  "Beyoğlu": 22, "Kadıköy": 22, "Beşiktaş": 20, "Şişli": 14, "Fatih": 14, "Üsküdar": 12,
  "Sarıyer": 12, "Bakırköy": 8, "Ataşehir": 6, "Adalar": 6, "Beykoz": 6, "Eyüpsultan": 4, "Kartal": 4,
};

const TR = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u", Ç: "c", Ğ: "g", I: "i", İ: "i", Ö: "o", Ş: "s", Ü: "u", Â: "a" };
export function slugify(s) {
  return s.split("").map((ch) => TR[ch] ?? ch).join("").toLowerCase().replace(/&/g, " ve ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const has = (t, k) => typeof t[k] === "string" && t[k].trim() !== "";
const cuisinesOf = (t) => (t.cuisine ?? "").split(/[;,]/).map((x) => x.trim().toLowerCase()).filter(Boolean);

/** OSM etiketlerinden Gidenler kategorisi + alt tür. Emin olunamayan → "Restoran"/"Kafe"/"Bar". */
export function classify(t) {
  const n = (t.name ?? "").toLocaleLowerCase("tr");
  const c = cuisinesOf(t);
  const any = (...xs) => xs.some((x) => c.includes(x));
  if (t.amenity === "bar" || t.amenity === "pub") {
    if (/meyhane/.test(n)) return { categoryId: "cat.restaurant", kind: "Meyhane" };
    if (t.amenity === "pub" || /pub/.test(n)) return { categoryId: "cat.bar", kind: "Pub" };
    if (any("cocktail") || /kokteyl|cocktail/.test(n)) return { categoryId: "cat.bar", kind: "Kokteyl bar" };
    return { categoryId: "cat.bar", kind: "Bar" };
  }
  if (t.amenity === "cafe") {
    if (any("coffee_shop", "coffee") || /kahve|coffee|roaster|espresso/.test(n)) return { categoryId: "cat.cafe", kind: "Kahveci" };
    if (any("cake", "pastry", "dessert") || /pastane|pasta|patisserie/.test(n)) return { categoryId: "cat.cafe", kind: "Pastane" };
    if (any("breakfast") || /kahvaltı/.test(n)) return { categoryId: "cat.restaurant", kind: "Kahvaltı" };
    if (any("bakery") || /fırın|börek/.test(n)) return { categoryId: "cat.cafe", kind: "Fırın" };
    return { categoryId: "cat.cafe", kind: "Kafe" };
  }
  /* restaurant / fast_food */
  if (/meyhane/.test(n) || any("meyhane")) return { categoryId: "cat.restaurant", kind: "Meyhane" };
  if (any("fish", "seafood") || /balık|balikci|balıkçı/.test(n)) return { categoryId: "cat.restaurant", kind: "Balık restoranı" };
  if (any("kebab") || /kebap|ocakbaşı|ocakbasi/.test(n)) return { categoryId: "cat.restaurant", kind: "Kebapçı / Ocakbaşı" };
  if (any("doner", "döner") || /döner|doner/.test(n)) return { categoryId: "cat.restaurant", kind: "Dönerci" };
  if (any("pide", "lahmacun") || /pide|lahmacun/.test(n)) return { categoryId: "cat.restaurant", kind: "Pideci" };
  if (any("manti") || /mantı/.test(n)) return { categoryId: "cat.restaurant", kind: "Mantıcı" };
  if (any("breakfast") || /kahvaltı/.test(n)) return { categoryId: "cat.restaurant", kind: "Kahvaltı" };
  if (any("burger")) return { categoryId: "cat.restaurant", kind: "Burger" };
  if (any("pizza", "italian")) return { categoryId: "cat.restaurant", kind: "Pizza" };
  if (any("sushi", "japanese")) return { categoryId: "cat.restaurant", kind: "Sushi / Japon" };
  if (any("ramen")) return { categoryId: "cat.restaurant", kind: "Ramen" };
  if (any("steak_house", "steak")) return { categoryId: "cat.restaurant", kind: "Steakhouse" };
  if (any("ice_cream", "dessert") || /tatlı|baklava|muhallebi/.test(n)) return { categoryId: "cat.restaurant", kind: "Tatlıcı" };
  if (/lokanta|esnaf/.test(n)) return { categoryId: "cat.restaurant", kind: "Lokanta" };
  return { categoryId: "cat.restaurant", kind: "Restoran" };
}

export function instagramHandle(t) {
  const v = t["contact:instagram"] ?? t.instagram;
  if (!v) return undefined;
  const m = String(v).trim().match(/(?:instagram\.com\/)?@?([A-Za-z0-9._]{2,30})\/?(?:\?.*)?$/);
  return m ? m[1] : undefined;
}
const site = (t) => {
  const v = t["contact:website"] ?? t.website ?? t.url;
  if (!v) return undefined;
  const s = String(v).trim().split(";")[0];
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};
const phone = (t) => (t["contact:phone"] ?? t.phone ?? "").split(";")[0].trim() || undefined;

function score(t) {
  let s = 0;
  if (has(t, "wikidata") || has(t, "wikipedia")) s += 100;
  if (has(t, "wikimedia_commons") || /commons\.wikimedia/.test(t.image ?? "")) s += 15;
  if (site(t)) s += 20;
  if (instagramHandle(t)) s += 20;
  if (has(t, "opening_hours")) s += 10;
  if (has(t, "cuisine")) s += 10;
  if (phone(t)) s += 5;
  if (has(t, "addr:street")) s += 5;
  return s;
}

const GENERIC = /^(cafe|kafe|restaurant|restoran|bar|pub|büfe|kahve|lokanta|kebap|döner|pide)$/i;

/** @param {{district: string, elements: any[]}[]} results */
export function selectVenues(results, { quotas = DISTRICT_QUOTAS, importedAt = new Date().toISOString().slice(0, 10) } = {}) {
  const out = [];
  const seenNames = new Set();
  for (const { district, elements } of results) {
    const quota = quotas[district] ?? 0;
    if (!quota) continue;
    const cands = elements
      .filter((e) => e.tags && has(e.tags, "name"))
      .filter((e) => ["restaurant", "cafe", "bar", "pub", "fast_food"].includes(e.tags.amenity))
      .filter((e) => !has(e.tags, "brand") && !has(e.tags, "brand:wikidata"))
      .filter((e) => !GENERIC.test(e.tags.name.trim()))
      .filter((e) => e.tags.disused !== "yes" && !has(e.tags, "disused:amenity"))
      .filter((e) => e.tags.amenity !== "fast_food" || score(e.tags) >= 40)
      .map((e) => ({ e, s: score(e.tags), c: classify(e.tags) }))
      .filter((x) => x.s >= 25)
      .sort((a, b) => b.s - a.s || a.e.tags.name.localeCompare(b.e.tags.name, "tr"));
    const perKind = new Map();
    const maxKind = Math.max(2, Math.ceil(quota * 0.35));
    let n = 0;
    for (const { e, c } of cands) {
      if (n >= quota) break;
      const t = e.tags;
      const key = t.name.toLocaleLowerCase("tr");
      if (seenNames.has(key)) continue;
      const k = perKind.get(c.kind) ?? 0;
      if (k >= maxKind) continue;
      const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      seenNames.add(key); perKind.set(c.kind, k + 1); n++;
      const street = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" No:");
      out.push({
        ref: `${e.type}/${e.id}`,
        slug: `${slugify(t.name)}-${slugify(district)}`,
        name: t.name.trim(),
        categoryId: c.categoryId,
        kind: c.kind,
        district,
        neighborhood: t["addr:neighbourhood"] ?? t["addr:suburb"] ?? undefined,
        lat: Math.round(lat * 1e6) / 1e6,
        lng: Math.round(lng * 1e6) / 1e6,
        address: street ? `${street}${t["addr:neighbourhood"] ? `, ${t["addr:neighbourhood"]}` : ""}, ${district}` : undefined,
        phone: phone(t),
        website: site(t),
        instagram: instagramHandle(t),
        openingHours: t.opening_hours,
        cuisine: cuisinesOf(t).length ? cuisinesOf(t) : undefined,
        commons: t.wikimedia_commons?.startsWith("File:") ? t.wikimedia_commons : (/commons\.wikimedia\.org\/wiki\/(File:[^?#]+)/.exec(t.image ?? "")?.[1] ? decodeURIComponent(/commons\.wikimedia\.org\/wiki\/(File:[^?#]+)/.exec(t.image)[1]) : undefined),
        importedAt,
      });
    }
  }
  return out;
}

/** Overpass sorgusu — bir semt için. */
export const overpassQuery = (district) => `[out:json][timeout:90];
area["boundary"="administrative"]["admin_level"="6"]["name"="${district}"]->.a;
nwr["amenity"~"^(restaurant|cafe|bar|pub|fast_food)$"]["name"](area.a);
out tags center;`;

/* ───── son temizlik: kaynaktaki tutarsızlıkları düzelt, uydurma ekleme ───── */
/** Kaynağı tutarsız (etiketler başka işletmeye ait) ya da halka açık olmayan kayıtlar. */
const DROP = [/kıyı emniyeti/i, /^al lado está/i];
const TITLE_EXCEPT = new Set(["ve", "de", "da", "ile"]);
function trTitle(s) {
  return s.toLocaleLowerCase("tr").split(/(\s+)/).map((w, i) => (/^\s+$/.test(w) || (i > 0 && TITLE_EXCEPT.has(w)) ? w : w.charAt(0).toLocaleUpperCase("tr") + w.slice(1))).join("");
}
export function cleanVenues(list) {
  const out = [];
  for (const v0 of list) {
    if (DROP.some((r) => r.test(v0.name))) continue;
    const v = { ...v0 };
    /* yalnızca büyük ya da yalnızca küçük harfli adlar: okunur biçim (slug değişmez) */
    if (v.name === v.name.toLocaleUpperCase("tr") || v.name === v.name.toLocaleLowerCase("tr")) v.name = trTitle(v.name);
    if (v.website) {
      const ig = /instagram\.com\/(?!explore)([A-Za-z0-9._]{2,30})\/?$/.exec(v.website);
      if (ig && !v.instagram) v.instagram = ig[1];
      if (/instagram\.com|share\.google/.test(v.website)) delete v.website;
    }
    if (v.neighborhood && v.neighborhood.length > 40) delete v.neighborhood;
    if (v.address) {
      v.address = v.address.replace(/No:no:/i, "No:");
      if (v.address.length > 90 || /\d{5}\s/.test(v.address)) v.address = `${v.address.split(",")[0]}, ${v.district}`;
    }
    const n = v.name.toLocaleLowerCase("tr");
    if (/pastane/.test(n)) { v.categoryId = "cat.cafe"; v.kind = "Pastane"; }
    else if (/künefe|kunefe|gelateria|dondurma/.test(n)) { v.categoryId = "cat.restaurant"; v.kind = "Tatlıcı"; }
    out.push(v);
  }
  return out;
}
