/* ==========================================================================
   EVREN — deterministik sentetik varlık üreteci
   --------------------------------------------------------------------------
   Amaç: Gidenler'in "birkaç restoranlık prototip" değil, bir şehrin deneyim
   haritası gibi görünmesi. Kurallar:
   · Tek doğruluk kaynağı: bu dosya ürettiğini bir kez üretir; puan, yön,
     güven, konum her yüzeyde aynıdır (seededRandom(entityId)).
   · Yoğunluk katmanları: A (tam), B (zengin), C (keşif kaydı).
   · Gerçek kamusal yer/kurum adları (park, cadde, müze, stadyum, şehir)
     yalnızca temel kimlik taşır: deneyim metni, uzman onayı, şikâyet üretilmez.
   · Gerçek kişi/işletme adı yok. Regüle meslekler sentetik baş harflerle.
   · Puan dağılımı gerçekçi: çoğunluk 6,5–8,8; 9+ nadir; <5 nadir ama var.
   ========================================================================== */

import type {
  AISummary, Entity, ExperienceRatings, ExternalSource, ReturnIntent, ThemeSignal,
  TimelinePoint, User, VerificationMethod, CuratedList,
} from "@/lib/types";
import type { RawExperience } from "@/data/experiences";
import { ratingSchemas } from "@/data/categories";

/* ───────────────────────────── PRNG ───────────────────────────────────── */

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
/** mulberry32 — aynı tohum, aynı dizi. */
function rng(seed: string): () => number {
  let a = hash(seed) || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = <T,>(r: () => number, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
const pickW = (r: () => number, arr: readonly Dist[]): Dist => { const tot = arr.reduce((a, d) => a + (d.w ?? 1), 0); let x = r() * tot; for (const d of arr) { x -= d.w ?? 1; if (x <= 0) return d; } return arr[arr.length - 1]; };
const round1 = (n: number) => Math.round(n * 10) / 10;
/** Fisher–Yates — sort(() => r()-0.5) motor bağımlıdır (Node ≠ Chrome → hydration hatası); bu değil. */
function shuffle<T>(r: () => number, arr: readonly T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function slugify(s: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u", Ç: "c", Ğ: "g", I: "i", İ: "i", Ö: "o", Ş: "s", Ü: "u", Â: "a" };
  return s.split("").map((ch) => map[ch] ?? ch).join("").toLowerCase().replace(/&/g, " ve ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/* ───────────────────────────── COĞRAFYA ───────────────────────────────── */

interface Dist { name: string; lat: number; lng: number; hoods: string[]; side?: "avrupa" | "anadolu"; w?: number }
interface City { name: string; weight: number; districts: Dist[] }

const ISTANBUL: City = { name: "İstanbul", weight: 1, districts: [
  { name: "Kadıköy", w: 14, lat: 40.985, lng: 29.03, side: "anadolu", hoods: ["Moda", "Caddebostan", "Suadiye", "Koşuyolu", "Yeldeğirmeni", "Fenerbahçe", "Bostancı", "Göztepe", "Bahariye"] },
  { name: "Beşiktaş", w: 12, lat: 41.045, lng: 29.01, side: "avrupa", hoods: ["Etiler", "Bebek", "Arnavutköy", "Ortaköy", "Levent", "Akaretler", "Ulus", "Kuruçeşme"] },
  { name: "Beyoğlu", w: 12, lat: 41.03, lng: 28.978, side: "avrupa", hoods: ["Karaköy", "Cihangir", "Galata", "Taksim", "Asmalımescit", "Tophane", "Çukurcuma"] },
  { name: "Şişli", w: 10, lat: 41.06, lng: 28.99, side: "avrupa", hoods: ["Nişantaşı", "Teşvikiye", "Bomonti", "Mecidiyeköy", "Osmanbey", "Kurtuluş"] },
  { name: "Fatih", w: 7, lat: 41.018, lng: 28.95, side: "avrupa", hoods: ["Balat", "Fener", "Sultanahmet", "Eminönü", "Kumkapı", "Samatya"] },
  { name: "Bakırköy", w: 4, lat: 40.98, lng: 28.87, side: "avrupa", hoods: ["Yeşilköy", "Ataköy", "Florya", "Bakırköy Çarşı"] },
  { name: "Üsküdar", w: 7, lat: 41.03, lng: 29.03, side: "anadolu", hoods: ["Kuzguncuk", "Çengelköy", "Beylerbeyi", "Salacak", "Altunizade", "Kısıklı"] },
  { name: "Sarıyer", w: 6, lat: 41.13, lng: 29.05, side: "avrupa", hoods: ["Emirgan", "Tarabya", "Maslak", "Rumelihisarı", "Yeniköy", "İstinye", "Kilyos"] },
  { name: "Ataşehir", w: 4, lat: 40.99, lng: 29.12, side: "anadolu", hoods: ["Batı Ataşehir", "İçerenköy", "Küçükbakkalköy"] },
  { name: "Maltepe", w: 3, lat: 40.93, lng: 29.13, side: "anadolu", hoods: ["Küçükyalı", "Cevizli", "Bağlarbaşı", "Maltepe Sahil"] },
  { name: "Kartal", w: 2.5, lat: 40.89, lng: 29.19, side: "anadolu", hoods: ["Kartal Sahil", "Yakacık", "Soğanlık"] },
  { name: "Beykoz", w: 2.5, lat: 41.13, lng: 29.10, side: "anadolu", hoods: ["Anadolu Kavağı", "Polonezköy", "Kanlıca", "Paşabahçe"] },
  { name: "Eyüpsultan", w: 2, lat: 41.05, lng: 28.93, side: "avrupa", hoods: ["Eyüp Merkez", "Pierre Loti", "Göktürk", "Kemerburgaz"] },
  { name: "Zeytinburnu", w: 1.5, lat: 40.99, lng: 28.90, side: "avrupa", hoods: ["Kazlıçeşme", "Merkezefendi", "Zeytinburnu Sahil"] },
  { name: "Kağıthane", w: 2, lat: 41.08, lng: 28.97, side: "avrupa", hoods: ["Hamidiye", "Çağlayan", "Seyrantepe"] },
  { name: "Başakşehir", w: 2, lat: 41.09, lng: 28.80, side: "avrupa", hoods: ["Bahçeşehir", "Kayaşehir", "İkitelli"] },
  { name: "Adalar", w: 1.5, lat: 40.87, lng: 29.12, side: "anadolu", hoods: ["Büyükada", "Heybeliada", "Burgazada", "Kınalıada"] },
] };

const CITIES: City[] = [
  { name: "Ankara", weight: 0.16, districts: [{ name: "Çankaya", lat: 39.90, lng: 32.86, hoods: ["Kızılay", "Tunalı", "Gaziosmanpaşa", "Bahçelievler", "Ayrancı"] }, { name: "Altındağ", lat: 39.94, lng: 32.86, hoods: ["Ulus", "Hamamönü"] }, { name: "Yenimahalle", lat: 39.97, lng: 32.80, hoods: ["Batıkent", "Demetevler"] }] },
  { name: "İzmir", weight: 0.2, districts: [{ name: "Konak", lat: 38.42, lng: 27.13, hoods: ["Alsancak", "Kemeraltı", "Güzelyalı", "Karataş"] }, { name: "Karşıyaka", lat: 38.46, lng: 27.10, hoods: ["Bostanlı", "Karşıyaka Çarşı"] }, { name: "Bornova", lat: 38.46, lng: 27.22, hoods: ["Bornova Merkez"] }, { name: "Urla", lat: 38.32, lng: 26.77, hoods: ["Urla Merkez", "Urla Sanat Sokağı"] }, { name: "Çeşme", lat: 38.32, lng: 26.30, hoods: ["Alaçatı", "Ilıca", "Dalyan"] }, { name: "Seferihisar", lat: 38.20, lng: 26.84, hoods: ["Sığacık"] }] },
  { name: "Bursa", weight: 0.08, districts: [{ name: "Osmangazi", lat: 40.18, lng: 29.06, hoods: ["Tophane", "Heykel", "Çekirge"] }, { name: "Nilüfer", lat: 40.21, lng: 28.97, hoods: ["Özlüce", "FSM"] }, { name: "Mudanya", lat: 40.37, lng: 28.88, hoods: ["Mudanya Sahil", "Tirilye"] }] },
  { name: "Antalya", weight: 0.14, districts: [{ name: "Muratpaşa", lat: 36.89, lng: 30.71, hoods: ["Kaleiçi", "Lara", "Konyaaltı"] }, { name: "Kaş", lat: 36.20, lng: 29.64, hoods: ["Kaş Merkez", "Kalkan"] }, { name: "Alanya", lat: 36.54, lng: 32.00, hoods: ["Alanya Merkez"] }, { name: "Kemer", lat: 36.60, lng: 30.56, hoods: ["Çıralı", "Olympos"] }] },
  { name: "Adana", weight: 0.05, districts: [{ name: "Seyhan", lat: 37.00, lng: 35.32, hoods: ["Ziyapaşa", "Tepebağ"] }] },
  { name: "Gaziantep", weight: 0.06, districts: [{ name: "Şahinbey", lat: 37.06, lng: 37.38, hoods: ["Bey Mahallesi", "Şehitkamil Çarşı"] }] },
  { name: "Eskişehir", weight: 0.05, districts: [{ name: "Odunpazarı", lat: 39.77, lng: 30.52, hoods: ["Odunpazarı Evleri", "Adalar"] }, { name: "Tepebaşı", lat: 39.79, lng: 30.50, hoods: ["Vişnelik", "Bağlar"] }] },
  { name: "Muğla", weight: 0.14, districts: [{ name: "Bodrum", lat: 37.03, lng: 27.43, hoods: ["Bodrum Merkez", "Yalıkavak", "Gümüşlük", "Türkbükü", "Bitez"] }, { name: "Fethiye", lat: 36.62, lng: 29.12, hoods: ["Ölüdeniz", "Kayaköy", "Çalış"] }, { name: "Datça", lat: 36.73, lng: 27.69, hoods: ["Datça Merkez", "Eski Datça"] }, { name: "Marmaris", lat: 36.85, lng: 28.27, hoods: ["Marmaris Merkez", "Bozburun"] }] },
  { name: "Trabzon", weight: 0.04, districts: [{ name: "Ortahisar", lat: 41.00, lng: 39.72, hoods: ["Meydan", "Boztepe"] }] },
  { name: "Mersin", weight: 0.04, districts: [{ name: "Yenişehir", lat: 36.79, lng: 34.60, hoods: ["Pozcu", "Marina"] }] },
  { name: "Hatay", weight: 0.04, districts: [{ name: "Antakya", lat: 36.20, lng: 36.16, hoods: ["Uzun Çarşı", "Harbiye"] }] },
];

/* ───────────────────────────── ALT TÜRLER ─────────────────────────────── */

const W = ["Kıyı", "Liman", "Fener", "Yakamoz", "Lodos", "Poyraz", "Meltem", "Mercan", "Sedef", "Defne", "Zeytin", "İncir", "Nar", "Çınar", "Kestane", "Sarnıç", "Kemer", "Taş", "Avlu", "Sofra", "Duman", "Kor", "Tuz", "Yosun", "Ada", "Martı", "Vapur", "İskele", "Rıhtım", "Çeşme", "Sarmaşık", "Manolya", "Erguvan", "Leylak", "Mimoza", "Fesleğen", "Kekik", "Sumak", "Safran", "Tarçın", "Minoa", "Bosphorus", "Kalamış", "Lacivert", "Bakır", "Gümüş", "Yalı", "Köşk", "Kule", "Fıstık", "Badem", "Ayva", "Kiraz", "Vişne", "Portakal", "Limon", "Reyhan", "Biberiye", "Lavanta", "Karanfil", "Sardunya", "Dut", "Ceviz", "Meşe", "Ihlamur", "Söğüt", "Kavak", "Servi", "Mercimek", "Ekin", "Harman", "Değirmen", "Han", "Bedesten", "Pasaj", "Çıkmaz", "Yokuş", "Tepe", "Koru", "Bahçe"] as const;

type Pattern = (r: () => number, w: string, hood: string, dist: string, city: string) => string;
const P = {
  wSuffix: (suf: string): Pattern => (_, w) => `${w} ${suf}`,
  hoodSuffix: (suf: string): Pattern => (_, __, h) => `${h} ${suf}`,
  prefixW: (pre: string): Pattern => (_, w) => `${pre} ${w}`,
  bare: (): Pattern => (_, w) => w,
};

interface Sub {
  key: string; label: string; cat: string; weight: number;
  patterns: Pattern[]; facets?: string[]; price: [number, number]; hours?: string[];
  tags?: string[]; quiet?: [number, number]; speed?: [number, number];
  scoreBias?: number; abroad?: boolean; /* İstanbul dışı ağırlığı */
  real?: string[]; /* gerçek kamusal adlar — yalnızca kimlik */
}

const SUBS: Sub[] = [
  { key: "lokanta", label: "Lokanta", cat: "cat.restaurant", weight: 40, patterns: [P.wSuffix("Lokantası"), P.hoodSuffix("Lokantası"), P.prefixW("Lokanta")], facets: ["Esnaf lokantası"], price: [1, 2], hours: ["11.00 – 22.00", "11.30 – 23.00"], tags: ["ev yemeği", "öğle menüsü"], quiet: [4, 7], speed: [7, 9] },
  { key: "restoran", label: "Restoran", cat: "cat.restaurant", weight: 55, patterns: [P.bare(), P.wSuffix("Restoran"), P.wSuffix("Mutfak"), P.wSuffix("Table")], facets: [], price: [2, 3], hours: ["12.00 – 23.30"], tags: ["akşam yemeği"], quiet: [4, 7], speed: [5, 7] },
  { key: "kebap", label: "Kebapçı / Ocakbaşı", cat: "cat.restaurant", weight: 38, patterns: [P.wSuffix("Ocakbaşı"), P.wSuffix("Kebap"), P.prefixW("Kebapçı")], facets: ["Sokak lezzeti"], price: [2, 3], hours: ["12.00 – 00.00"], tags: ["ocakbaşı", "et"], quiet: [2, 5], speed: [6, 8] },
  { key: "meyhane", label: "Meyhane", cat: "cat.restaurant", weight: 34, patterns: [P.wSuffix("Meyhanesi"), P.prefixW("Meyhane"), P.hoodSuffix("Meyhanesi")], facets: ["Balık"], price: [2, 3], hours: ["17.00 – 01.00"], tags: ["meze", "rakı-balık"], quiet: [1, 4], speed: [4, 6] },
  { key: "balik", label: "Balık restoranı", cat: "cat.restaurant", weight: 30, patterns: [P.wSuffix("Balık"), P.prefixW("Balıkçı"), P.hoodSuffix("Balıkçısı")], facets: ["Balık"], price: [3, 4], hours: ["12.00 – 00.00"], tags: ["balık", "meze"], quiet: [3, 6], speed: [4, 6] },
  { key: "steak", label: "Steakhouse", cat: "cat.restaurant", weight: 14, patterns: [P.wSuffix("Steakhouse"), P.wSuffix("Et")], facets: ["Steakhouse"], price: [3, 4], hours: ["12.00 – 00.00"], tags: ["dry age", "et"], quiet: [3, 6], speed: [4, 6] },
  { key: "fine", label: "Fine dining", cat: "cat.restaurant", weight: 14, patterns: [P.bare(), P.wSuffix("by the Bosphorus")], facets: ["Fine dining"], price: [4, 4], hours: ["19.00 – 23.00", "19.00 – 23.30 · rezervasyonlu"], tags: ["tadım menüsü", "rezervasyonlu"], quiet: [7, 9], speed: [2, 4], scoreBias: 0.4 },
  { key: "sushi", label: "Sushi / Japon", cat: "cat.restaurant", weight: 14, patterns: [P.wSuffix("Sushi"), P.wSuffix("Izakaya"), P.prefixW("Omakase")], facets: ["Japon mutfağı"], price: [3, 4], hours: ["18.00 – 23.30"], tags: ["sushi", "sake"], quiet: [6, 9], speed: [3, 5] },
  { key: "ramen", label: "Ramen", cat: "cat.restaurant", weight: 8, patterns: [P.hoodSuffix("Ramen"), P.wSuffix("Ramen")], facets: ["Japon mutfağı"], price: [2, 2], hours: ["12.00 – 22.00"], tags: ["ramen", "tonkotsu"], quiet: [3, 6], speed: [7, 9] },
  { key: "pizza", label: "Pizza", cat: "cat.restaurant", weight: 24, patterns: [P.wSuffix("Pizza"), P.prefixW("Pizzeria"), P.wSuffix("Fırın Pizza")], facets: [], price: [2, 3], hours: ["12.00 – 23.00"], tags: ["napoli", "odun fırını"], quiet: [3, 6], speed: [6, 8] },
  { key: "burger", label: "Burger", cat: "cat.restaurant", weight: 24, patterns: [P.wSuffix("Burger"), P.wSuffix("Smash")], facets: ["Sokak lezzeti"], price: [1, 2], hours: ["12.00 – 00.00"], tags: ["burger", "patates"], quiet: [2, 5], speed: [7, 9] },
  { key: "kahvalti", label: "Kahvaltı", cat: "cat.restaurant", weight: 28, patterns: [P.wSuffix("Kahvaltı"), P.hoodSuffix("Kahvaltı Evi"), P.wSuffix("Serpme")], facets: ["Kahvaltı"], price: [2, 3], hours: ["08.00 – 16.00"], tags: ["serpme", "hafta sonu"], quiet: [2, 5], speed: [4, 6] },
  { key: "tatli", label: "Tatlıcı", cat: "cat.restaurant", weight: 18, patterns: [P.wSuffix("Tatlı"), P.wSuffix("Baklava"), P.prefixW("Künefeci")], facets: ["Sokak lezzeti"], price: [1, 2], hours: ["09.00 – 23.00"], tags: ["baklava", "künefe", "sütlaç"], quiet: [4, 7], speed: [8, 9] },
  { key: "pastane", label: "Pastane", cat: "cat.cafe", weight: 18, patterns: [P.wSuffix("Pastanesi"), P.prefixW("Pastane")], facets: ["Fırın ve ekmek"], price: [1, 2], hours: ["07.30 – 21.00"], tags: ["pasta", "kurabiye"], quiet: [5, 8], speed: [8, 9] },
  { key: "kahve", label: "Kahveci", cat: "cat.cafe", weight: 90, patterns: [P.wSuffix("Kahve"), P.wSuffix("Coffee"), P.wSuffix("Roastery"), P.wSuffix("Espresso Bar")], facets: ["Filtre kahve"], price: [1, 2], hours: ["08.00 – 20.00", "08.30 – 22.00"], tags: ["filtre", "third wave", "çalışılır"], quiet: [5, 9], speed: [6, 9] },
  { key: "firin", label: "Fırın", cat: "cat.cafe", weight: 28, patterns: [P.hoodSuffix("Fırını"), P.wSuffix("Fırın"), P.prefixW("Fırın")], facets: ["Fırın ve ekmek"], price: [1, 2], hours: ["07.00 – 20.00"], tags: ["ekşi maya", "simit"], quiet: [4, 7], speed: [8, 9] },
  { key: "kokteyl", label: "Kokteyl bar", cat: "cat.bar", weight: 38, patterns: [P.wSuffix("Bar"), P.prefixW("Bar"), P.wSuffix("Cocktail")], facets: ["Kokteyl"], price: [3, 4], hours: ["18.00 – 02.00"], tags: ["kokteyl", "gece"], quiet: [1, 4], speed: [4, 6] },
  { key: "pub", label: "Pub", cat: "cat.bar", weight: 28, patterns: [P.wSuffix("Pub"), P.prefixW("The")], facets: ["Pub"], price: [2, 3], hours: ["16.00 – 02.00"], tags: ["bira", "maç"], quiet: [1, 3], speed: [5, 7] },
  { key: "otel", label: "Otel", cat: "cat.hotel", weight: 24, patterns: [P.wSuffix("Hotel"), P.prefixW("Hotel")], price: [3, 4], hours: ["24 saat resepsiyon"], tags: ["şehir oteli"], quiet: [5, 8], speed: [5, 7], abroad: true },
  { key: "butik", label: "Butik otel", cat: "cat.hotel", weight: 24, patterns: [P.wSuffix("Butik Otel"), P.hoodSuffix("Suites"), P.wSuffix("Konak")], price: [3, 4], hours: ["24 saat resepsiyon"], tags: ["butik", "az odalı"], quiet: [7, 9], speed: [5, 7], abroad: true },
  { key: "resort", label: "Resort", cat: "cat.hotel", weight: 10, patterns: [P.wSuffix("Resort"), P.wSuffix("Beach Hotel")], price: [3, 4], hours: ["24 saat resepsiyon"], tags: ["deniz", "havuz"], quiet: [4, 7], speed: [5, 7], abroad: true },
  { key: "sahil", label: "Sahil", cat: "cat.place", weight: 10, patterns: [P.hoodSuffix("Sahili")], facets: ["Sahil"], price: [1, 1], tags: ["yürüyüş", "gün batımı"], quiet: [3, 7], speed: [5, 5], real: ["Moda Sahili", "Caddebostan Sahili", "Bostancı Sahili", "Bebek Sahili", "Kuruçeşme Sahili", "Yeşilköy Sahili", "Maltepe Sahil Parkı", "Kartal Sahili", "Salacak Sahili", "Florya Sahili"] },
  { key: "park", label: "Park / Koru", cat: "cat.place", weight: 10, patterns: [P.hoodSuffix("Parkı")], facets: ["Park"], price: [1, 1], tags: ["piknik", "koşu"], quiet: [5, 9], speed: [5, 5], real: ["Emirgan Korusu", "Yıldız Parkı", "Fethi Paşa Korusu", "Gülhane Parkı", "Maçka Parkı", "Fenerbahçe Parkı", "Göztepe 60. Yıl Parkı", "Belgrad Ormanı", "Mihrabat Korusu", "Atatürk Kent Ormanı"] },
  { key: "cadde", label: "Cadde", cat: "cat.place", weight: 10, patterns: [P.hoodSuffix("Caddesi")], facets: ["Cadde"], price: [1, 1], tags: ["alışveriş", "yürüyüş"], quiet: [1, 4], speed: [5, 5], real: ["Bağdat Caddesi", "İstiklal Caddesi", "Moda Caddesi", "Abdi İpekçi Caddesi", "Bahariye Caddesi", "Cihangir Sıraselviler", "Akaretler Sıra Evler", "Nispetiye Caddesi", "Kuzguncuk İcadiye Caddesi"] },
  { key: "meydan", label: "Meydan", cat: "cat.place", weight: 6, patterns: [P.hoodSuffix("Meydanı")], facets: ["Meydan"], price: [1, 1], tags: ["buluşma"], quiet: [1, 4], speed: [5, 5], real: ["Taksim Meydanı", "Kadıköy Rıhtım Meydanı", "Ortaköy Meydanı", "Beşiktaş Çarşı Meydanı", "Sultanahmet Meydanı", "Üsküdar Meydanı"] },
  { key: "pazar", label: "Pazar", cat: "cat.place", weight: 8, patterns: [P.hoodSuffix("Pazarı")], facets: ["Pazar"], price: [1, 1], tags: ["organik", "salı pazarı"], quiet: [1, 3], speed: [5, 5], real: ["Kadıköy Salı Pazarı", "Feriköy Organik Pazarı", "Beşiktaş Cumartesi Pazarı", "Kadıköy Balık Pazarı", "Yeşilköy Çarşamba Pazarı", "Ulus Pazarı"] },
  { key: "avm", label: "AVM", cat: "cat.place", weight: 10, patterns: [P.wSuffix("AVM")], facets: ["AVM"], price: [1, 1], tags: ["alışveriş", "sinema"], quiet: [2, 5], speed: [5, 5], real: ["Zorlu Center", "Kanyon", "İstinyePark", "Akasya AVM", "Emaar Square", "Cevahir AVM", "Akmerkez", "Marmara Forum", "Tepe Nautilus", "Palladium Ataşehir"] },
  { key: "muze", label: "Müze", cat: "cat.culture", weight: 14, patterns: [P.wSuffix("Müzesi")], facets: ["Müze"], price: [1, 2], hours: ["10.00 – 18.00 · pazartesi kapalı"], tags: ["koleksiyon", "sergi"], quiet: [6, 9], speed: [5, 5], real: ["İstanbul Modern", "Pera Müzesi", "Rahmi M. Koç Müzesi", "Sakıp Sabancı Müzesi", "İstanbul Arkeoloji Müzeleri", "Türk ve İslam Eserleri Müzesi", "Masumiyet Müzesi", "Arter", "Salt Galata", "Yapı Kredi Kültür Sanat", "İstanbul Deniz Müzesi", "Anadolu Medeniyetleri Müzesi", "İzmir Arkeoloji Müzesi", "Zeugma Mozaik Müzesi"], abroad: true },
  { key: "galeri", label: "Galeri", cat: "cat.culture", weight: 18, patterns: [P.wSuffix("Galeri"), P.prefixW("Galeri"), P.wSuffix("Sanat")], facets: ["Galeri"], price: [1, 1], hours: ["11.00 – 19.00 · pazartesi kapalı"], tags: ["çağdaş sanat", "sergi"], quiet: [7, 9], speed: [5, 5] },
  { key: "tarihi", label: "Tarihi mekân", cat: "cat.culture", weight: 10, patterns: [P.wSuffix("Kulesi")], facets: ["Tarihi mekân"], price: [1, 2], tags: ["tarih", "mimari"], quiet: [2, 5], speed: [5, 5], real: ["Ayasofya", "Topkapı Sarayı", "Galata Kulesi", "Kız Kulesi", "Yerebatan Sarnıcı", "Dolmabahçe Sarayı", "Rumeli Hisarı", "Süleymaniye Camii", "Kariye", "Beylerbeyi Sarayı", "Efes Antik Kenti", "Safranbolu Çarşı"], abroad: true },
  { key: "sinema", label: "Sinema", cat: "cat.venue", weight: 12, patterns: [P.hoodSuffix("Sineması"), P.wSuffix("Sineması")], facets: ["Sinema"], price: [1, 2], hours: ["11.00 – 00.00"], tags: ["film", "salon"], quiet: [6, 8], speed: [5, 5], real: ["Kadıköy Sineması", "Atlas Sineması", "Beyoğlu Sineması", "Rexx Sineması", "Kadıköy Rexx"] },
  { key: "tiyatro-sahnesi", label: "Tiyatro sahnesi", cat: "cat.venue", weight: 10, patterns: [P.hoodSuffix("Sahne"), P.wSuffix("Sahnesi")], facets: ["Tiyatro sahnesi"], price: [2, 3], tags: ["tiyatro", "salon"], quiet: [6, 8], speed: [5, 5], real: ["Zorlu PSM", "Kenter Tiyatrosu", "Moda Sahnesi", "Kadıköy Halk Eğitim Merkezi Sahnesi", "Cemal Reşit Rey Konser Salonu"] },
  { key: "konser-mekani", label: "Konser mekânı", cat: "cat.venue", weight: 8, patterns: [P.wSuffix("Stage"), P.wSuffix("Live")], facets: ["Konser mekânı"], price: [2, 3], tags: ["canlı müzik"], quiet: [1, 3], speed: [5, 5], real: ["Volkswagen Arena", "KüçükÇiftlik Park", "Babylon", "Salon İKSV", "Bostancı Gösteri Merkezi", "Harbiye Cemil Topuzlu Açıkhava"] },
  { key: "stadyum", label: "Stadyum", cat: "cat.venue", weight: 5, patterns: [P.hoodSuffix("Stadı")], facets: ["Stadyum"], price: [2, 3], tags: ["maç", "tribün"], quiet: [1, 2], speed: [5, 5], real: ["Tüpraş Stadyumu", "RAMS Park", "Ülker Stadyumu", "Recep Tayyip Erdoğan Stadyumu", "Gürsel Aksel Stadyumu"] },
  { key: "oyun", label: "Tiyatro oyunu", cat: "cat.show", weight: 24, patterns: [(r, w) => `${w} ${pick(r, ["Gecesi", "Odası", "Sokağı", "Mevsimi", "Sessizliği"])}`, (r) => `${pick(r, ["Üç", "Yedi", "Son", "İlk", "Kırık"])} ${pick(r, ["Kapı", "Vapur", "Mektup", "Perde", "Sabah"])}`], facets: ["Tiyatro"], price: [2, 3], tags: ["oyun", "sahne"], quiet: [6, 8], speed: [5, 5] },
  { key: "konser", label: "Konser", cat: "cat.show", weight: 14, patterns: [(r, w) => `${w} ${pick(r, ["Trio", "Quartet", "Orkestrası", "Kolektifi"])} Konseri`, (r, w) => `${pick(r, ["Gece", "Yaz", "Boğaz", "Kış"])} Konserleri · ${w}`], facets: ["Konser"], price: [2, 4], tags: ["canlı", "caz", "senfonik"], quiet: [2, 5], speed: [5, 5] },
  { key: "festival", label: "Festival", cat: "cat.show", weight: 8, patterns: [P.hoodSuffix("Caz Günleri"), P.hoodSuffix("Kısa Film Günleri"), (r, w) => `${w} ${pick(r, ["Müzik", "Tasarım", "Kahve", "Sokak"])} Festivali`], facets: ["Festival"], price: [1, 3], tags: ["festival", "açık hava"], quiet: [1, 4], speed: [5, 5] },
  { key: "sergi", label: "Sergi", cat: "cat.show", weight: 12, patterns: [(r, w) => `"${w} ${pick(r, ["ve Zaman", "Üzerine", "Hâlleri", "Defteri", "Işığı"])}"`], facets: ["Sergi"], price: [1, 2], tags: ["sergi", "fotoğraf", "resim"], quiet: [7, 9], speed: [5, 5] },
  { key: "film", label: "Film", cat: "cat.film", weight: 36, patterns: [(r, w) => `${w} ${pick(r, ["Vakti", "Sabahı", "Rüzgârı", "Yolu", "Sessizliği", "Odası", "Mevsimi"])}`, (r) => `${pick(r, ["Gri", "Son", "Uzak", "Kuzey", "Derin", "Sessiz", "Beyaz"])} ${pick(r, ["Sabah", "Vapur", "Liman", "Kış", "Gece", "Deniz", "Şehir"])}`], price: [1, 1], tags: ["dram", "komedi", "belgesel", "gerilim"], quiet: [5, 5], speed: [5, 5] },
  { key: "sehir", label: "Şehir", cat: "cat.travel", weight: 12, patterns: [P.bare()], facets: ["Şehir"], price: [1, 1], tags: ["şehir", "hafta sonu"], quiet: [3, 6], speed: [5, 5], real: ["Ankara", "İzmir", "Bursa", "Antalya", "Eskişehir", "Gaziantep", "Trabzon", "Mardin", "Safranbolu", "Şanlıurfa", "Edirne", "Çanakkale"], abroad: true },
  { key: "destinasyon", label: "Destinasyon", cat: "cat.travel", weight: 16, patterns: [P.bare()], facets: ["Destinasyon"], price: [2, 3], tags: ["tatil", "koy"], quiet: [4, 8], speed: [5, 5], real: ["Kaş", "Alaçatı", "Kapadokya", "Cunda", "Datça", "Bozcaada", "Ayder Yaylası", "Şirince", "Kaleköy", "Gökçeada", "Amasra", "Assos", "Akyaka", "Ayvalık", "Sığacık", "Uzungöl", "Polonezköy", "Şile", "Ağva", "Büyükada", "Heybeliada", "Kilyos"], abroad: true },
  { key: "plaj", label: "Plaj", cat: "cat.travel", weight: 10, patterns: [P.bare()], facets: ["Plaj"], price: [1, 2], tags: ["deniz", "yaz"], quiet: [3, 7], speed: [5, 5], real: ["Kabak Koyu", "Ölüdeniz", "Kaputaş Plajı", "İztuzu Plajı", "Altınkum (Çeşme)", "Patara Plajı", "Cennet Koyu", "Kleopatra Plajı", "Kilyos Plajı", "Burç Beach", "Riva Plajı", "Şile Plajı", "Ağva Plajı", "Yörükali Plajı"], abroad: true },
  { key: "rota", label: "Rota", cat: "cat.travel", weight: 5, patterns: [P.bare()], facets: ["Rota"], price: [1, 2], tags: ["yürüyüş", "araba"], quiet: [6, 9], speed: [5, 5], real: ["Likya Yolu", "Karia Yolu", "Boğaz Sahil Yürüyüşü", "Kaçkar Yayla Rotası", "Ege Kıyı Rotası", "Adalar Bisiklet Turu", "Belgrad Ormanı Parkurları"], abroad: true },
  { key: "kuafor", label: "Kuaför", cat: "cat.service", weight: 14, patterns: [P.wSuffix("Kuaför"), P.wSuffix("Hair Studio")], facets: ["Kuaför"], price: [2, 3], hours: ["09.00 – 20.00"], tags: ["saç", "randevu"], quiet: [4, 7], speed: [5, 7] },
  { key: "berber", label: "Berber", cat: "cat.service", weight: 14, patterns: [P.prefixW("Berber"), P.wSuffix("Barber")], facets: ["Berber"], price: [1, 2], hours: ["09.00 – 21.00"], tags: ["tıraş", "sakal"], quiet: [4, 7], speed: [6, 8] },
  { key: "spor", label: "Spor salonu", cat: "cat.service", weight: 14, patterns: [P.wSuffix("Fitness"), P.wSuffix("Studio"), P.wSuffix("Gym")], facets: ["Spor salonu"], price: [2, 3], hours: ["06.00 – 23.00"], tags: ["fitness", "pilates"], quiet: [3, 6], speed: [5, 5] },
  { key: "spa", label: "Spa / Hamam", cat: "cat.service", weight: 8, patterns: [P.wSuffix("Spa"), P.wSuffix("Hamamı")], facets: ["Spa"], price: [3, 4], hours: ["10.00 – 22.00"], tags: ["masaj", "hamam"], quiet: [7, 9], speed: [5, 5] },
  { key: "cowork", label: "Coworking", cat: "cat.service", weight: 7, patterns: [P.wSuffix("Cowork"), P.wSuffix("Workspace")], facets: ["Coworking"], price: [2, 3], hours: ["08.00 – 22.00"], tags: ["çalışma", "toplantı odası"], quiet: [6, 9], speed: [5, 5] },
  { key: "doktor", label: "Hekim", cat: "cat.physician", weight: 40, patterns: [], price: [1, 1], hours: ["Randevu ile"], tags: ["doktor", "hekim", "muayene"], quiet: [5, 5], speed: [5, 5] },
  { key: "dis", label: "Diş hekimi", cat: "cat.dentist", weight: 20, patterns: [], price: [1, 1], hours: ["Randevu ile"], tags: ["diş", "dişçi", "diş hekimi"], quiet: [5, 5], speed: [5, 5] },
  { key: "avukat", label: "Avukat", cat: "cat.lawyer", weight: 20, patterns: [], price: [1, 1], hours: ["Randevu ile"], tags: ["avukat", "hukuk", "dava"], quiet: [5, 5], speed: [5, 5] },
];

const BRANCH = { doktor: ["dermatoloji", "kardiyoloji", "KBB", "göz hastalıkları", "fizik tedavi", "nöroloji", "dahiliye", "ortopedi", "çocuk sağlığı", "kadın hastalıkları"], dis: ["ortodonti", "implant", "estetik diş", "çocuk diş", "genel diş"], avukat: ["iş hukuku", "aile hukuku", "ceza hukuku", "gayrimenkul", "ticaret hukuku", "fikri mülkiyet", "tüketici hukuku"] } as const;
const INITIALS = ["A", "B", "C", "D", "E", "F", "G", "H", "İ", "K", "L", "M", "N", "O", "P", "R", "S", "T", "U", "Y", "Z"];


/** Gerçek kamusal yerlerin doğru konumu — rastgele semt verilmez. [şehir, ilçe, mahalle/çevre] */
const REAL_LOC: Record<string, [string, string, string]> = {
  "Moda Sahili": ["İstanbul", "Kadıköy", "Moda"], "Caddebostan Sahili": ["İstanbul", "Kadıköy", "Caddebostan"], "Bostancı Sahili": ["İstanbul", "Kadıköy", "Bostancı"], "Bebek Sahili": ["İstanbul", "Beşiktaş", "Bebek"], "Kuruçeşme Sahili": ["İstanbul", "Beşiktaş", "Kuruçeşme"], "Yeşilköy Sahili": ["İstanbul", "Bakırköy", "Yeşilköy"], "Maltepe Sahil Parkı": ["İstanbul", "Maltepe", "Maltepe Sahil"], "Kartal Sahili": ["İstanbul", "Kartal", "Kartal Sahil"], "Salacak Sahili": ["İstanbul", "Üsküdar", "Salacak"], "Florya Sahili": ["İstanbul", "Bakırköy", "Florya"],
  "Emirgan Korusu": ["İstanbul", "Sarıyer", "Emirgan"], "Yıldız Parkı": ["İstanbul", "Beşiktaş", "Yıldız"], "Fethi Paşa Korusu": ["İstanbul", "Üsküdar", "Kuzguncuk"], "Gülhane Parkı": ["İstanbul", "Fatih", "Sultanahmet"], "Maçka Parkı": ["İstanbul", "Şişli", "Maçka"], "Fenerbahçe Parkı": ["İstanbul", "Kadıköy", "Fenerbahçe"], "Göztepe 60. Yıl Parkı": ["İstanbul", "Kadıköy", "Göztepe"], "Belgrad Ormanı": ["İstanbul", "Sarıyer", "Bahçeköy"], "Mihrabat Korusu": ["İstanbul", "Beykoz", "Kanlıca"], "Atatürk Kent Ormanı": ["İstanbul", "Sarıyer", "Maslak"],
  "Bağdat Caddesi": ["İstanbul", "Kadıköy", "Caddebostan"], "İstiklal Caddesi": ["İstanbul", "Beyoğlu", "Taksim"], "Moda Caddesi": ["İstanbul", "Kadıköy", "Moda"], "Abdi İpekçi Caddesi": ["İstanbul", "Şişli", "Nişantaşı"], "Bahariye Caddesi": ["İstanbul", "Kadıköy", "Bahariye"], "Cihangir Sıraselviler": ["İstanbul", "Beyoğlu", "Cihangir"], "Akaretler Sıra Evler": ["İstanbul", "Beşiktaş", "Akaretler"], "Nispetiye Caddesi": ["İstanbul", "Beşiktaş", "Etiler"], "Kuzguncuk İcadiye Caddesi": ["İstanbul", "Üsküdar", "Kuzguncuk"],
  "Taksim Meydanı": ["İstanbul", "Beyoğlu", "Taksim"], "Kadıköy Rıhtım Meydanı": ["İstanbul", "Kadıköy", "Rıhtım"], "Ortaköy Meydanı": ["İstanbul", "Beşiktaş", "Ortaköy"], "Beşiktaş Çarşı Meydanı": ["İstanbul", "Beşiktaş", "Çarşı"], "Sultanahmet Meydanı": ["İstanbul", "Fatih", "Sultanahmet"], "Üsküdar Meydanı": ["İstanbul", "Üsküdar", "Meydan"],
  "Kadıköy Salı Pazarı": ["İstanbul", "Kadıköy", "Hasanpaşa"], "Feriköy Organik Pazarı": ["İstanbul", "Şişli", "Feriköy"], "Beşiktaş Cumartesi Pazarı": ["İstanbul", "Beşiktaş", "Çarşı"], "Kadıköy Balık Pazarı": ["İstanbul", "Kadıköy", "Çarşı"], "Yeşilköy Çarşamba Pazarı": ["İstanbul", "Bakırköy", "Yeşilköy"], "Ulus Pazarı": ["İstanbul", "Beşiktaş", "Ulus"],
  "Zorlu Center": ["İstanbul", "Beşiktaş", "Levazım"], "Kanyon": ["İstanbul", "Şişli", "Levent"], "İstinyePark": ["İstanbul", "Sarıyer", "İstinye"], "Akasya AVM": ["İstanbul", "Üsküdar", "Acıbadem"], "Emaar Square": ["İstanbul", "Üsküdar", "Ünalan"], "Cevahir AVM": ["İstanbul", "Şişli", "Mecidiyeköy"], "Akmerkez": ["İstanbul", "Beşiktaş", "Etiler"], "Marmara Forum": ["İstanbul", "Bakırköy", "Osmaniye"], "Tepe Nautilus": ["İstanbul", "Kadıköy", "Acıbadem"], "Palladium Ataşehir": ["İstanbul", "Ataşehir", "Batı Ataşehir"],
  "İstanbul Modern": ["İstanbul", "Beyoğlu", "Karaköy"], "Pera Müzesi": ["İstanbul", "Beyoğlu", "Tepebaşı"], "Rahmi M. Koç Müzesi": ["İstanbul", "Beyoğlu", "Hasköy"], "Sakıp Sabancı Müzesi": ["İstanbul", "Sarıyer", "Emirgan"], "İstanbul Arkeoloji Müzeleri": ["İstanbul", "Fatih", "Sultanahmet"], "Türk ve İslam Eserleri Müzesi": ["İstanbul", "Fatih", "Sultanahmet"], "Masumiyet Müzesi": ["İstanbul", "Beyoğlu", "Çukurcuma"], "Arter": ["İstanbul", "Beyoğlu", "Dolapdere"], "Salt Galata": ["İstanbul", "Beyoğlu", "Galata"], "Yapı Kredi Kültür Sanat": ["İstanbul", "Beyoğlu", "Taksim"], "İstanbul Deniz Müzesi": ["İstanbul", "Beşiktaş", "Çarşı"], "Anadolu Medeniyetleri Müzesi": ["Ankara", "Altındağ", "Ulus"], "İzmir Arkeoloji Müzesi": ["İzmir", "Konak", "Bahribaba"], "Zeugma Mozaik Müzesi": ["Gaziantep", "Şehitkamil", "Mithatpaşa"],
  "Ayasofya": ["İstanbul", "Fatih", "Sultanahmet"], "Topkapı Sarayı": ["İstanbul", "Fatih", "Sultanahmet"], "Galata Kulesi": ["İstanbul", "Beyoğlu", "Galata"], "Kız Kulesi": ["İstanbul", "Üsküdar", "Salacak"], "Yerebatan Sarnıcı": ["İstanbul", "Fatih", "Sultanahmet"], "Dolmabahçe Sarayı": ["İstanbul", "Beşiktaş", "Dolmabahçe"], "Rumeli Hisarı": ["İstanbul", "Sarıyer", "Rumelihisarı"], "Süleymaniye Camii": ["İstanbul", "Fatih", "Süleymaniye"], "Kariye": ["İstanbul", "Fatih", "Edirnekapı"], "Beylerbeyi Sarayı": ["İstanbul", "Üsküdar", "Beylerbeyi"], "Efes Antik Kenti": ["İzmir", "Selçuk", "Efes"], "Safranbolu Çarşı": ["Karabük", "Safranbolu", "Çarşı"],
  "Kadıköy Sineması": ["İstanbul", "Kadıköy", "Bahariye"], "Atlas Sineması": ["İstanbul", "Beyoğlu", "Taksim"], "Beyoğlu Sineması": ["İstanbul", "Beyoğlu", "Taksim"], "Rexx Sineması": ["İstanbul", "Kadıköy", "Caferağa"], "Kadıköy Rexx": ["İstanbul", "Kadıköy", "Caferağa"],
  "Zorlu PSM": ["İstanbul", "Beşiktaş", "Levazım"], "Kenter Tiyatrosu": ["İstanbul", "Şişli", "Harbiye"], "Moda Sahnesi": ["İstanbul", "Kadıköy", "Moda"], "Kadıköy Halk Eğitim Merkezi Sahnesi": ["İstanbul", "Kadıköy", "Bahariye"], "Cemal Reşit Rey Konser Salonu": ["İstanbul", "Şişli", "Harbiye"],
  "Volkswagen Arena": ["İstanbul", "Sarıyer", "Maslak"], "KüçükÇiftlik Park": ["İstanbul", "Şişli", "Maçka"], "Babylon": ["İstanbul", "Şişli", "Bomonti"], "Salon İKSV": ["İstanbul", "Beyoğlu", "Şişhane"], "Bostancı Gösteri Merkezi": ["İstanbul", "Kadıköy", "Bostancı"], "Harbiye Cemil Topuzlu Açıkhava": ["İstanbul", "Şişli", "Harbiye"],
  "Tüpraş Stadyumu": ["İstanbul", "Beşiktaş", "Dolmabahçe"], "RAMS Park": ["İstanbul", "Başakşehir", "Kayaşehir"], "Ülker Stadyumu": ["İstanbul", "Kadıköy", "Fenerbahçe"], "Recep Tayyip Erdoğan Stadyumu": ["İstanbul", "Kasımpaşa", "Kasımpaşa"], "Gürsel Aksel Stadyumu": ["İzmir", "Konak", "Göztepe"],
  "Ankara": ["Ankara", "Çankaya", ""], "İzmir": ["İzmir", "Konak", ""], "Bursa": ["Bursa", "Osmangazi", ""], "Antalya": ["Antalya", "Muratpaşa", ""], "Eskişehir": ["Eskişehir", "Odunpazarı", ""], "Gaziantep": ["Gaziantep", "Şahinbey", ""], "Trabzon": ["Trabzon", "Ortahisar", ""], "Mardin": ["Mardin", "Artuklu", ""], "Safranbolu": ["Karabük", "Safranbolu", ""], "Şanlıurfa": ["Şanlıurfa", "Eyyübiye", ""], "Edirne": ["Edirne", "Merkez", ""], "Çanakkale": ["Çanakkale", "Merkez", ""],
  "Kaş": ["Antalya", "Kaş", "Kaş Merkez"], "Alaçatı": ["İzmir", "Çeşme", "Alaçatı"], "Kapadokya": ["Nevşehir", "Ürgüp", "Göreme"], "Cunda": ["Balıkesir", "Ayvalık", "Cunda"], "Datça": ["Muğla", "Datça", "Datça Merkez"], "Bozcaada": ["Çanakkale", "Bozcaada", "Merkez"], "Ayder Yaylası": ["Rize", "Çamlıhemşin", "Ayder"], "Şirince": ["İzmir", "Selçuk", "Şirince"], "Kaleköy": ["Antalya", "Demre", "Kaleköy"], "Gökçeada": ["Çanakkale", "Gökçeada", "Merkez"], "Amasra": ["Bartın", "Amasra", "Merkez"], "Assos": ["Çanakkale", "Ayvacık", "Behramkale"], "Akyaka": ["Muğla", "Ula", "Akyaka"], "Ayvalık": ["Balıkesir", "Ayvalık", "Merkez"], "Sığacık": ["İzmir", "Seferihisar", "Sığacık"], "Uzungöl": ["Trabzon", "Çaykara", "Uzungöl"],
  "Kabak Koyu": ["Muğla", "Fethiye", "Kabak"], "Ölüdeniz": ["Muğla", "Fethiye", "Ölüdeniz"], "Kaputaş Plajı": ["Antalya", "Kaş", "Kaputaş"], "İztuzu Plajı": ["Muğla", "Ortaca", "Dalyan"], "Altınkum (Çeşme)": ["İzmir", "Çeşme", "Altınkum"], "Patara Plajı": ["Antalya", "Kaş", "Patara"], "Cennet Koyu": ["Muğla", "Marmaris", "Cennet Adası"], "Kleopatra Plajı": ["Antalya", "Alanya", "Alanya Merkez"], "Kilyos Plajı": ["İstanbul", "Sarıyer", "Kilyos"], "Riva Plajı": ["İstanbul", "Beykoz", "Riva"], "Şile Plajı": ["İstanbul", "Şile", "Şile Merkez"], "Ağva Plajı": ["İstanbul", "Şile", "Ağva"], "Yörükali Plajı": ["İstanbul", "Adalar", "Büyükada"],
  "Polonezköy": ["İstanbul", "Beykoz", "Polonezköy"], "Şile": ["İstanbul", "Şile", "Şile Merkez"], "Ağva": ["İstanbul", "Şile", "Ağva"], "Büyükada": ["İstanbul", "Adalar", "Büyükada"], "Heybeliada": ["İstanbul", "Adalar", "Heybeliada"], "Kilyos": ["İstanbul", "Sarıyer", "Kilyos"],
  "Adalar Bisiklet Turu": ["İstanbul", "Adalar", "Büyükada"], "Belgrad Ormanı Parkurları": ["İstanbul", "Sarıyer", "Bahçeköy"], "Burç Beach": ["İstanbul", "Sarıyer", "Kilyos"],
  "Likya Yolu": ["Antalya", "Kaş", "Likya"], "Karia Yolu": ["Muğla", "Datça", "Karia"], "Boğaz Sahil Yürüyüşü": ["İstanbul", "Beşiktaş", "Bebek"], "Kaçkar Yayla Rotası": ["Rize", "Çamlıhemşin", "Kaçkar"], "Ege Kıyı Rotası": ["İzmir", "Urla", "Urla Merkez"],
};

/* ───────────────────────────── PUAN DAĞILIMI ──────────────────────────── */

/** %5 9+, %30 8–8.9, %35 7–7.9, %20 6–6.9, %7 5–5.9, %3 <5 */
function drawScore(r: () => number, bias = 0): number {
  const u = r();
  let s: number;
  if (u < 0.05) s = 9.0 + r() * 0.7;
  else if (u < 0.35) s = 8.0 + r() * 0.9;
  else if (u < 0.70) s = 7.0 + r() * 0.9;
  else if (u < 0.90) s = 6.0 + r() * 0.9;
  else if (u < 0.97) s = 5.0 + r() * 0.9;
  else s = 3.6 + r() * 1.3;
  return round1(clamp(s + bias * (r() - 0.3), 3.2, 9.7));
}
/** Çoğunluk sabit / hafif hareket; büyük hareket nadir. */
function drawDelta(r: () => number): number {
  const u = r();
  if (u < 0.55) return round1((r() - 0.5) * 0.28);      // -0.14..+0.14 → stabil
  if (u < 0.80) return round1(0.16 + r() * 0.3) * (r() < 0.55 ? 1 : -1);
  if (u < 0.96) return round1(0.45 + r() * 0.5) * (r() < 0.5 ? 1 : -1);
  return round1(1.0 + r() * 0.6) * (r() < 0.45 ? 1 : -1);
}
/** Hacim: log-dağılım 8 – 2.400 */
function drawCount(r: () => number, tier: "A" | "B" | "C"): number {
  const base = tier === "A" ? 120 : tier === "B" ? 40 : 8;
  const top = tier === "A" ? 2400 : tier === "B" ? 900 : 260;
  const x = Math.exp(Math.log(base) + r() * (Math.log(top) - Math.log(base)));
  return Math.round(x);
}

/* ───────────────────────────── ÜRETİM ─────────────────────────────────── */

export interface EntityStats {
  score: number; delta: number; count: number; verifiedRatio: number; returnRate: number;
  dims: Record<string, number>; quiet: number; speed: number; similar?: { score: number; sampleSize: number; returnRate: number };
  contextFit: Record<string, number>;
}

const MONTHS = ["2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"];

function timelineFor(r: () => number, score: number, delta: number, count: number, months: number): TimelinePoint[] {
  const n = clamp(months, 5, 14);
  const pts: TimelinePoint[] = [];
  const perMonth = Math.max(1, Math.round(count / (n * 1.6)));
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // son üç noktada delta kadar hareket; öncesi hafif salınım
    const drift = i >= n - 4 ? delta * ((i - (n - 4)) / 3) : 0;
    const noise = (r() - 0.5) * 0.2;
    const s = round1(clamp(score - delta + drift + noise * (1 - t * 0.5), 1, 10));
    pts.push({ period: MONTHS[MONTHS.length - n + i], score: i === n - 1 ? score : s, experienceCount: Math.max(1, Math.round(perMonth * (0.6 + r() * 0.9))) });
  }
  return pts;
}

const usedSlugs = new Set<string>();
function uniqueSlug(base: string, alt: string): string {
  let s = slugify(base);
  if (!usedSlugs.has(s)) { usedSlugs.add(s); return s; }
  const s2 = slugify(`${base} ${alt}`);
  if (!usedSlugs.has(s2)) { usedSlugs.add(s2); return s2; }
  let i = 2; while (usedSlugs.has(`${s2}-${i}`)) i++;
  usedSlugs.add(`${s2}-${i}`); return `${s2}-${i}`;
}
const usedNames = new Set<string>();

export const universeEntities: Entity[] = [];
export const universeStats: Record<string, EntityStats> = {};
export const universeTimelines: Record<string, TimelinePoint[]> = {};
export const universeDistributions: Record<string, number[]> = {};
export const universeExternal: ExternalSource[] = [];
export const universePraised: Record<string, ThemeSignal[]> = {};
export const universeComplaints: Record<string, ThemeSignal[]> = {};
export const universeSummaries: Record<string, AISummary> = {};
export const universeBlurbs: Record<string, string> = {};
export const universeExperiences: RawExperience[] = [];
export const universeUsers: User[] = [];
export const universeLists: CuratedList[] = [];

/** Mevcut el yapımı kayıtların slug'ları — çakışma olmasın. */
["moda-lokantasi", "sakura-omakase", "ates-steak", "koz-durum", "asma-teras", "balikci-sokagi", "kuzey-kahve", "demlik-roastery", "tas-firin-cihangir", "hotel-payitaht", "dr-a-y-dermatoloji"].forEach((s) => usedSlugs.add(s));

/* ───── sentetik kullanıcılar (kategoriye göre uzmanlık; takipçi ≠ güven) ── */

const REP_KEYS = ["contribution", "verified_visits", "helpful_ratio", "experience_quality", "disclosure_behavior", "external_authority", "account_age", "moderation_history"] as const;
function mkUser(seed: string, handle: string, name: string, kind: User["kind"], bio: string, city: string, district: string, expertise: Array<[string, string, User["expertise"][number]["scope"], number, number]>, exp: number): User {
  const r = rng("user:" + seed);
  const score = clamp(Math.round(55 + r() * 40), 40, 96);
  const level: User["reputation"]["level"] = score >= 92 ? "çok yüksek uzmanlık" : score >= 84 ? "uzman" : score >= 74 ? "yerel uzman" : score >= 62 ? "güvenilir" : "katkıda bulunan";
  const verified = Math.round(exp * (0.35 + r() * 0.45));
  return {
    id: `u.${handle}`, handle, displayName: name, kind, bio, joinedAt: `202${4 + Math.floor(r() * 2)}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`,
    homeLocation: { city, district },
    reputation: { score, level, confidence: exp > 60 ? "high" : "medium", signals: REP_KEYS.map((k, i) => ({ key: k, label: ["Gidenler katkı geçmişi", "Doğrulanmış ziyaret oranı", "Faydalı bulunma oranı", "Deneyim kalitesi", "Ticari şeffaflık", "Dış otorite (sinyal)", "Hesap yaşı", "Moderasyon geçmişi"][i], value: clamp(Math.round(score + (r() - 0.5) * 30), 30, 100), weight: [0.2, 0.2, 0.15, 0.15, 0.1, 0.1, 0.05, 0.05][i] })) },
    expertise: expertise.map(([key, label, scope, s, c]) => ({ key, label, scope, score: s, experienceCount: c, level: s >= 90 ? "çok yüksek" : s >= 75 ? "yüksek" : "gelişiyor" })),
    social: kind === "creator" && r() < 0.7 ? [{ provider: "instagram", handle: `@${handle}`, profileUrl: `https://instagram.com/${handle}`, followerCount: Math.round(900 + r() * 40000), verifiedByGidenler: r() < 0.6, providerVerified: false, lastCheckedAt: "2026-08-30", status: "ok", isDemo: true }] : [],
    isDemo: true,
    stats: { experiences: exp, verifiedExperiences: verified, helpfulVotes: Math.round(exp * (8 + r() * 60)), entitiesVisited: Math.round(exp * 0.85), listsCreated: Math.floor(r() * 3) },
  };
}

const SYNTH_USERS: Array<[string, string, User["kind"], string, string, string, Array<[string, string, User["expertise"][number]["scope"], number, number]>, number]> = [
  ["kahvedefteri", "Kahve Defteri", "creator", "Üçüncü dalga kahveyi ciddiye alan biri. Kavurma tarihine bakarım, sütlü içmem.", "İstanbul", "Kadıköy", [["filtre-kahve", "Filtre kahve", "facet", 93, 74], ["kadikoy", "Kadıköy", "location", 80, 41]], 118],
  ["perdearasi", "Perde Arası", "creator", "Haftada iki oyun. Sahneye önden bakarım, arkadan yazarım.", "İstanbul", "Beyoğlu", [["tiyatro", "Tiyatro", "facet", 94, 88], ["konser", "Konser", "facet", 71, 19]], 131],
  ["odaservisi", "Oda Servisi", "creator", "Yılda kırk gece otelde. Yastık kalitesini yazan tek hesap.", "İstanbul", "Şişli", [["otel", "Otel", "category", 91, 63], ["butik-otel", "Butik otel", "facet", 88, 34]], 97],
  ["egeyakasi", "Ege Yakası", "creator", "İzmir ve çevresi. Kahvaltı, boyoz, koy.", "İzmir", "Konak", [["kahvalti", "Kahvaltı", "facet", 87, 52], ["izmir", "İzmir", "location", 92, 140]], 176],
  ["ankaraakşam", "Ankara Akşamı", "user", "Tunalı–Kızılay hattı. Meyhane ve lokanta.", "Ankara", "Çankaya", [["ankara", "Ankara", "location", 84, 96], ["esnaf-lokantasi", "Esnaf lokantası", "facet", 78, 40]], 121],
  ["mezetabagi", "Meze Tabağı", "creator", "Meyhane kültürü: meze sırası, rakı ısısı, servis tempoyu belirler.", "İstanbul", "Beyoğlu", [["meyhane", "Meyhane", "facet", 92, 71], ["balik", "Balık", "facet", 82, 33]], 109],
  ["sokakfirini", "Sokak Fırını", "user", "Ekşi maya, simit, poğaça. Fırın kapısında saat sekizde.", "İstanbul", "Üsküdar", [["firin-ve-ekmek", "Fırın ve ekmek", "facet", 86, 58]], 74],
  ["gecebarometresi", "Gece Barometresi", "creator", "Kokteyl barlar; ses seviyesi ve buz kalitesi.", "İstanbul", "Beşiktaş", [["kokteyl", "Kokteyl", "facet", 90, 66]], 88],
  ["muzekarti", "Müze Kartı", "creator", "Sergi ve müze. Metni de okurum, ışığı da.", "İstanbul", "Fatih", [["muze", "Müze", "facet", 91, 57], ["galeri", "Galeri", "facet", 85, 44], ["sergi", "Sergi", "facet", 83, 39]], 142],
  ["koybulucu", "Koy Bulucu", "creator", "Ege ve Akdeniz'de koy, plaj, rota. Temmuzda gitmem.", "Muğla", "Bodrum", [["plaj", "Plaj", "facet", 93, 61], ["destinasyon", "Destinasyon", "facet", 89, 72]], 138],
  ["sahibinden", "Salon Işıkları", "user", "Sinema salonu ve koltuk. Perde büyüklüğü önemlidir.", "İstanbul", "Kadıköy", [["sinema", "Sinema", "facet", 82, 47]], 66],
  ["tribunsesi", "Tribün Sesi", "user", "Stadyum ve konser mekânı: ulaşım, görüş, ses.", "İstanbul", "Beşiktaş", [["stadyum", "Stadyum", "facet", 79, 22], ["konser-mekani", "Konser mekânı", "facet", 80, 36]], 61],
  ["antepsofrasi", "Antep Sofrası", "creator", "Gaziantep ve güney: kebap, katmer, baklava.", "Gaziantep", "Şahinbey", [["sokak-lezzeti", "Sokak lezzeti", "facet", 90, 83], ["gaziantep", "Gaziantep", "location", 94, 120]], 151],
  ["burgerdefteri", "Burger Defteri", "user", "Smash mı değil mi, ekmek nemli mi. Kısa yazarım.", "İstanbul", "Kadıköy", [["sokak-lezzeti", "Sokak lezzeti", "facet", 76, 44]], 58],
  ["pizzatabani", "Pizza Tabanı", "user", "Napoli mi Roma mı, kenar ne kadar kabarık.", "İstanbul", "Beşiktaş", [["pizza", "Pizza", "facet", 81, 39]], 52],
  ["saloncu", "Salon Notları", "user", "Kuaför ve berber randevuları; bekletme süresini yazarım.", "İstanbul", "Şişli", [["kuafor", "Kuaför", "facet", 77, 31]], 44],
  ["sabahkosusu", "Sabah Koşusu", "user", "Park ve sahil: zemin, ışık, kalabalık saatleri.", "İstanbul", "Kadıköy", [["park", "Park", "facet", 83, 46], ["sahil", "Sahil", "facet", 85, 52]], 97],
  ["antalyakiyisi", "Antalya Kıyısı", "user", "Kaleiçi ve Kaş. Balık ve butik otel.", "Antalya", "Muratpaşa", [["antalya", "Antalya", "location", 86, 77], ["balik", "Balık", "facet", 74, 29]], 89],
  ["bursaiskender", "Bursa Tabağı", "user", "Bursa ve Mudanya: lokanta, kahvaltı, tirilye.", "Bursa", "Osmangazi", [["bursa", "Bursa", "location", 82, 58]], 66],
  ["eskisehirakşam", "Porsuk Kıyısı", "user", "Eskişehir: Odunpazarı, Porsuk, kafe.", "Eskişehir", "Odunpazarı", [["eskisehir", "Eskişehir", "location", 80, 49]], 57],
  ["filmnotu", "Film Notu", "creator", "Sinema salonunda izlemediğim filmi yazmam.", "İstanbul", "Beyoğlu", [["film", "Film", "category", 92, 210]], 244],
  ["kosuyolu", "Koşuyolu Sabahları", "user", "Koşuyolu, Acıbadem, Altunizade: kahvaltı ve kahve.", "İstanbul", "Kadıköy", [["kahvalti", "Kahvaltı", "facet", 79, 36], ["filtre-kahve", "Filtre kahve", "facet", 74, 28]], 71],
  ["trabzonsofra", "Karadeniz Sofrası", "user", "Trabzon ve Rize: hamsi, muhlama, yayla.", "Trabzon", "Ortahisar", [["trabzon", "Trabzon", "location", 85, 62]], 70],
  ["spahatti", "Spa Hattı", "user", "Hamam ve spa; temizlik ve randevu düzeni.", "İstanbul", "Sarıyer", [["spa", "Spa", "facet", 78, 27]], 33],
];
for (const [h, n, k, b, c, d, e, x] of SYNTH_USERS) universeUsers.push(mkUser(h, h, n, k, b, c, d, e, x));

const BASE_AUTHORS = ["u.denizyer", "u.sokakvesofra", "u.filtrekayit", "u.nazli-ada", "u.kirmizibiletci", "u.yorgun-kartograf", "u.mor-kaskol", "u.gri-pazartesi", "u.bahar-gecikmesi", "u.uzun-koridor"];

/* ───── deneyim metni: kategoriye göre kısa, çeşitli, sahte edebiyat yok ───── */

const FRAG: Record<string, { pos: string[]; neg: string[]; neutral: string[]; ret: string[] }> = {
  dining: {
    pos: ["Ana yemeği tekrar söylerim.", "Porsiyonlar dürüst, fiyat da öyle.", "Masa araları geniş, sesten yorulmadık.", "Servis siparişi bir kere bile karıştırmadı.", "Mezeler günlük, belli oluyor.", "Et pişirme tam istediğim gibiydi.", "Ekmek sıcak geldi, küçük ama önemli.", "Rezervasyonsuz gittik, on dakikada oturduk."],
    neg: ["Cuma akşamı servis yavaştı; ana yemek kırk dakika sürdü.", "Ses seviyesi konuşmayı zorlaştırıyor.", "Fiyatlar son bir yılda belirgin arttı.", "Tatlı menüsü zayıf.", "Bekleme sırasında kimse bilgi vermedi.", "Porsiyon küçüldü gibi geldi.", "Klima doğrudan masaya üflüyordu.", "Hesap istemek beş dakika sürdü."],
    neutral: ["Öğle menüsü akşamdan farklı, bilerek gidin.", "Hafta içi çok daha sakin.", "Kart geçiyor, nakit indirimi yok.", "Dışarıda oturmak için erken gitmek lazım."],
    ret: ["Tekrar giderim.", "Yine gelirim ama hafta içi.", "Bir kez yeter.", "Kararsızım; mutfak iyi, tempo değil."],
  },
  cafe: {
    pos: ["Filtre kahve düzgün demlenmiş, asidik değil.", "Priz var, wifi stabil; iki saat çalıştım.", "Kruvasan taze, katmanlı.", "Barista içimi sordu, kavurmayı anlattı.", "Sabah dokuzda bile sakin.", "Süt köpüğü doğru sıcaklıkta."],
    neg: ["Hafta sonu masa bulmak zor.", "Müzik çalışmak için fazla yüksek.", "Fiyat bardak başına biraz sert.", "Laptop yasağı akşam saatlerinde başlıyor, önceden söylenmiyor.", "Kahve ılık geldi."],
    neutral: ["Dışarıdaki masalar sokağa bakıyor, güneşi hesaplayın.", "Öğleden sonra kalabalıklaşıyor.", "Kurabiye çeşidi az ama iyi."],
    ret: ["Sabahları tekrar gelirim.", "Çalışmak için ilk tercihim oldu.", "Bir daha uğramam.", "Mahallede olsam sık giderim."],
  },
  hotel: {
    pos: ["Oda sessizdi, cadde tarafını sormayın.", "Kahvaltı sade ama taze.", "Resepsiyon geç check-in'i sorun etmedi.", "Yatak sert-orta, iyi uyudum.", "Konum yürüyerek her yere yetiyor."],
    neg: ["Duş suyu ısınana kadar bir dakika bekliyorsunuz.", "Asansör küçük, bavulla zor.", "Sabah kahvaltı salonu kalabalıktı.", "Klima gürültülü.", "Fiyat, odanın büyüklüğüne göre yüksek."],
    neutral: ["Otopark yok, yakın sokakta ücretli var.", "Odada su ısıtıcısı var, minibar yok."],
    ret: ["Tekrar kalırım.", "İş için evet, tatil için hayır.", "Bir daha kalmam.", "Fiyat düşerse yine gelirim."],
  },
  bar: {
    pos: ["Kokteyller dengeli, şeker bombası değil.", "Barmen menü dışı istek aldı.", "Ses konuşulabilir seviyede.", "Buz kalitesi iyi; sulanmadı."],
    neg: ["Gece yarısından sonra içeri girmek zor.", "Fiyatlar semte göre yüksek.", "Sigara dumanı içeri kadar geliyor.", "Servis kalabalıkta kayboluyor."],
    neutral: ["Hafta içi çok daha rahat.", "Yer bulmak için ondan önce gitmek lazım."],
    ret: ["Tekrar giderim.", "Hafta içi yine.", "Bir kez yeterdi.", "Arkadaşlarla evet, date için değil."],
  },
  place: {
    pos: ["Gün batımı saatinde yürüyüş için doğru yer.", "Bank ve gölge yeterli.", "Ulaşım kolay; iskeleye yakın.", "Sabah erken çok sakin."],
    neg: ["Hafta sonu öğleden sonra çok kalabalık.", "Tuvalet sayısı az.", "Bisiklet yolu yayayla karışıyor.", "Kafeler pahalı."],
    neutral: ["Pazar günü kalabalığı hesaba katın.", "Kışın rüzgâr sert."],
    ret: ["Tekrar giderim.", "Sabah saatlerinde yine.", "Bir daha gitmem.", "Mevsime bağlı."],
  },
  culture: {
    pos: ["Sergi metinleri kısa ve yeterli.", "Işıklandırma eserleri boğmuyor.", "Sesli rehber ücretsiz.", "Hafta içi öğleden sonra neredeyse boştu."],
    neg: ["Bilet fiyatı içerikle orantısız.", "Vestiyer sırası uzun.", "Bazı salonlar kapalıydı, girişte söylenmedi.", "Kafeterya pahalı."],
    neutral: ["Pazartesi kapalı.", "Öğrenci indirimi var."],
    ret: ["Yeni sergide yine gelirim.", "Tekrar giderim.", "Bir kez yeterli.", "Kararsızım."],
  },
  show: {
    pos: ["İkinci perde ilkinden güçlü.", "Oyunculuk metni taşıyor.", "Ses düzeni dengeliydi.", "Süre tam kararında, uzatılmamış."],
    neg: ["Arka sıralardan sahne görüşü kısıtlı.", "Ara çok kısa.", "Bilet fiyatı yüksek.", "Başlangıç yirmi dakika gecikti."],
    neutral: ["Ön sıra tercih edin.", "Program kitapçığı ayrı satılıyor."],
    ret: ["Tekrar izlerim.", "Bir kez yeterli.", "Turnede yine giderim.", "Kararsızım."],
  },
  venue: {
    pos: ["Koltuklar rahat, diz boşluğu yeterli.", "Ses dengesi iyi; bas boğmuyor.", "Metroya üç dakika.", "Perde büyük, görüş temiz."],
    neg: ["Çıkışta kalabalık uzun sürüyor.", "Klima yetersiz.", "Büfe fiyatları yüksek.", "Yan koltuk aralığı dar."],
    neutral: ["Otopark sınırlı.", "Bilet kontrolü hızlı."],
    ret: ["Tekrar giderim.", "Bir daha gitmem.", "Uygun etkinlikte yine.", "Kararsızım."],
  },
  travel: {
    pos: ["Mayıs sonu ideal; deniz ılık, kalabalık yok.", "Yürüyüş rotası iyi işaretlenmiş.", "Küçük lokantalar dürüst fiyatlı.", "Ulaşım düşündüğümden kolaydı."],
    neg: ["Temmuz–Ağustos çok kalabalık.", "Konaklama fiyatları sezonda ikiye katlanıyor.", "Plaja inen yol dik.", "Park yeri bulmak zor."],
    neutral: ["Araçsız gitmek mümkün ama planlı.", "Hafta içi gidin."],
    ret: ["Tekrar giderim.", "Sezon dışı yine.", "Bir kez görmek yeter.", "Kararsızım."],
  },
  service: {
    pos: ["Randevu saatinde başladı.", "Temizlik iyi, ekipman yeni.", "Fiyat söylenenle aynı çıktı.", "Sonucu iki hafta sonra da beğendim."],
    neg: ["Randevuya yirmi dakika geç alındım.", "Fiyat listesi görünür değil.", "Kalabalık saatlerde acele ediliyor.", "Soyunma odası küçük."],
    neutral: ["Hafta içi sabah daha sakin.", "Online randevu var."],
    ret: ["Tekrar giderim.", "Bir daha gitmem.", "Yakınsa yine.", "Kararsızım."],
  },
};
FRAG.film = {
  pos: ["Görüntü yönetimi filmi tek başına taşıyor.", "Baş roldeki oyunculuk abartısız, inandırıcı.", "Müzik sahnelerin önüne geçmiyor.", "Senaryo az diyalogla çok şey anlatıyor.", "Tempo yavaş ama bilinçli; sıkmadı.", "Final tartışmaya açık, iyi anlamda."],
  neg: ["İkinci yarı gereksiz uzuyor.", "Diyaloglar yer yer yapay.", "Ses miksajı bazı sahnelerde replikleri yutuyor.", "Final aceleye getirilmiş.", "Yan karakterler yarım kalmış.", "Fragman filmin en iyi sahnelerini harcamış."],
  neutral: ["Büyük perdede izlemek fark yaratıyor.", "Altyazılı gösterimi az salonda var.", "İlk yarım saat sabır istiyor."],
  ret: ["İkinci kez izlerim.", "Bir kez yeterli.", "Evde tekrar izlerim, sinemada değil.", "Kararsızım."],
};
const FRAG_OF: Record<string, string> = { "schema.dining": "dining", "schema.cafe": "cafe", "schema.hotel": "hotel", "schema.bar": "bar", "schema.place": "place", "schema.culture": "culture", "schema.show": "show", "schema.venue": "venue", "schema.travel": "travel", "schema.service": "service", "schema.film": "film" };

const THEME_POOL: Record<string, { pos: string[]; neg: string[] }> = {
  dining: { pos: ["Lezzet", "Servis", "Porsiyon", "Meze", "Ekmek", "Manzara", "Konum"], neg: ["Bekleme süresi", "Ses seviyesi", "Fiyat seviyesi", "Porsiyon", "Servis hızı", "Kalabalık", "Rezervasyon"] },
  cafe: { pos: ["Kahve", "Çalışma ortamı", "Pastane ürünleri", "Servis", "Sessizlik"], neg: ["Kalabalık", "Müzik", "Fiyat seviyesi", "Masa sayısı", "Laptop saati"] },
  hotel: { pos: ["Konum", "Temizlik", "Kahvaltı", "Yatak", "Sessizlik"], neg: ["Duş", "Asansör", "Klima", "Fiyat seviyesi", "Kahvaltı kalabalığı"] },
  bar: { pos: ["Kokteyl", "Barmen", "Atmosfer", "Ses"], neg: ["Fiyat seviyesi", "Kalabalık", "Duman", "Servis hızı"] },
  place: { pos: ["Yürüyüş", "Gün batımı", "Ulaşım", "Gölge"], neg: ["Kalabalık", "Tuvalet", "Bisiklet-yaya", "Kafe fiyatları"] },
  culture: { pos: ["Koleksiyon", "Işık", "Rehber", "Sessizlik"], neg: ["Bilet fiyatı", "Vestiyer", "Kapalı salon", "Kafeterya"] },
  show: { pos: ["Oyunculuk", "Metin", "Ses", "Süre"], neg: ["Görüş açısı", "Ara süresi", "Bilet fiyatı", "Gecikme"] },
  venue: { pos: ["Koltuk", "Ses", "Ulaşım", "Görüş"], neg: ["Çıkış kalabalığı", "Klima", "Büfe fiyatı", "Koltuk aralığı"] },
  travel: { pos: ["Mevsim", "Rota", "Lokantalar", "Ulaşım"], neg: ["Kalabalık", "Konaklama fiyatı", "Yol", "Park"] },
  service: { pos: ["Zamanlama", "Temizlik", "Fiyat şeffaflığı", "Sonuç"], neg: ["Gecikme", "Fiyat listesi", "Acele", "Soyunma odası"] },
  film: { pos: ["Görüntü", "Oyunculuk", "Müzik", "Senaryo", "Tempo"], neg: ["Süre", "İkinci yarı", "Diyaloglar", "Final", "Ses miksajı"] },
};

const VERIFY: VerificationMethod[] = ["konum", "fiş", "rezervasyon", "bilet", "yok", "yok", "sonra"];

function makeExperience(r: () => number, entityId: string, schemaId: string, stats: EntityStats, idx: number, authorPool: string[]): RawExperience {
  const fam = FRAG[FRAG_OF[schemaId] ?? "dining"];
  const dims = ratingSchemas.find((s) => s.id === schemaId)!.dimensions;
  const mood = r(); // 0..1 → kötü..iyi, puana bağlı
  const target = stats.score + (mood - 0.5) * 2.4;
  const ratings: ExperienceRatings = {};
  for (const d of dims) ratings[d.key] = round1(clamp((stats.dims[d.key] ?? stats.score) + (target - stats.score) + (r() - 0.5) * 1.2, 1, 10));
  const overall = Object.values(ratings).reduce((a, b) => a + b, 0) / dims.length;
  const parts: string[] = [];
  if (overall >= 7.5) { parts.push(pick(r, fam.pos)); if (r() < 0.6) parts.push(pick(r, fam.pos)); if (r() < 0.5) parts.push(pick(r, fam.neg)); }
  else if (overall >= 6) { parts.push(pick(r, fam.pos)); parts.push(pick(r, fam.neg)); }
  else { parts.push(pick(r, fam.neg)); if (r() < 0.6) parts.push(pick(r, fam.neg)); if (r() < 0.5) parts.push(pick(r, fam.pos)); }
  if (r() < 0.45) parts.push(pick(r, fam.neutral));
  const retIdx = overall >= 8 ? 0 : overall >= 7 ? (r() < 0.6 ? 0 : 1) : overall >= 6 ? (r() < 0.5 ? 3 : 1) : 2;
  const ret: ReturnIntent = retIdx === 0 || retIdx === 1 ? "evet" : retIdx === 2 ? "hayır" : "emin değil";
  if (r() < 0.7) parts.push(fam.ret[retIdx]);
  const body = [...new Set(parts)].join(" ");
  const m = 2025 + (r() < 0.25 ? 0 : 1);
  const month = m === 2025 ? 7 + Math.floor(r() * 6) : 1 + Math.floor(r() * 8);
  const visitedAt = `${m}-${String(month).padStart(2, "0")}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")}`;
  const method = r() < stats.verifiedRatio ? pick(r, ["konum", "fiş", "rezervasyon", "bilet"] as VerificationMethod[]) : pick(r, ["yok", "sonra"] as VerificationMethod[]);
  const verified = method !== "yok" && method !== "sonra";
  const rel = r() < 0.06 ? "invited" : "none";
  const helpful = Math.round(r() * (idx === 0 ? 120 : 40));
  return {
    id: `exp.u.${hash(entityId + idx).toString(36)}`, entityId, authorId: pick(r, authorPool), visitId: `visit.u.${hash(entityId + idx + "v").toString(36)}`,
    body, visitedAt, verification: { verified, method, verifiedAt: verified ? visitedAt : undefined }, ratings,
    returnIntent: ret, disclosure: { relationship: rel, label: rel === "invited" ? "İşletmenin daveti" : undefined, declaredByAuthor: rel !== "none" },
    helpfulVotes: helpful, notHelpfulVotes: Math.max(0, Math.round(helpful * 0.04)), createdAt: visitedAt, state: "published",
  };
}

/* ───── küratörlü altın set: elle seçilmiş ~30 sentetik kayıt (Tier A) ───── */

interface Golden { name: string; sub: string; city: string; district: string; hood: string; score: number; delta: number; count: number; verified: number; blurb: string; price?: 1 | 2 | 3 | 4; facets?: string[] }
const GOLDEN: Golden[] = [
  { name: "Kıyı Lokantası", sub: "lokanta", city: "İstanbul", district: "Üsküdar", hood: "Kuzguncuk", score: 8.6, delta: 0.3, count: 412, verified: 0.58, blurb: "Kuzguncuk sahilinin köşesinde günlük yemek: tencere sabah kurulur, üç buçukta biter. Öğle kalabalığını hesaplayın.", price: 1 },
  { name: "Minoa Ocakbaşı", sub: "kebap", city: "İstanbul", district: "Üsküdar", hood: "Kuzguncuk", score: 8.9, delta: 0.1, count: 638, verified: 0.51, blurb: "Ocağın başında oturulan on iki sandalye; köz ve tuzdan başka numara yok. Rezervasyon şart.", price: 3 },
  { name: "Pera Sofrası", sub: "meyhane", city: "İstanbul", district: "Beyoğlu", hood: "Asmalımescit", score: 8.2, delta: -0.4, count: 1240, verified: 0.44, blurb: "Otuz yıllık meyhane; meze tepsisi hâlâ iyi, servis tempoyu kaybetti. Cuma gecesi gürültü sınırda.", price: 3 },
  { name: "Kuzguncuk Fırını", sub: "firin", city: "İstanbul", district: "Üsküdar", hood: "Kuzguncuk", score: 9.1, delta: 0.2, count: 287, verified: 0.62, blurb: "Ekşi maya, taş fırın, sabah yedi. Öğlene kalmaz.", price: 1 },
  { name: "Karaköy Ramen", sub: "ramen", city: "İstanbul", district: "Beyoğlu", hood: "Karaköy", score: 8.4, delta: 0.6, count: 156, verified: 0.55, blurb: "Tonkotsu on sekiz saat kaynıyor; on iki taburelik yer, sıra dışarıda. Son üç ayda belirgin yükseliş.", price: 2 },
  { name: "Bosphorus Table", sub: "fine", city: "İstanbul", district: "Beşiktaş", hood: "Bebek", score: 9.3, delta: 0.0, count: 74, verified: 0.71, blurb: "Yedi kap tadım menüsü, Boğaz'a bakan on masa. Fiyat yüksek, tutarlılık da öyle.", price: 4 },
  { name: "Lodos Balık", sub: "balik", city: "İstanbul", district: "Sarıyer", hood: "Yeniköy", score: 7.6, delta: -0.8, count: 921, verified: 0.39, blurb: "Yeniköy sahilinde eski bir isim. Balık hâlâ taze; fiyat ve servis son bir yılda ayrıştı.", price: 4 },
  { name: "Erguvan", sub: "restoran", city: "İstanbul", district: "Şişli", hood: "Nişantaşı", score: 8.8, delta: 0.4, count: 533, verified: 0.57, blurb: "Mevsim menüsü altı haftada bir değişir; sessiz salon, hızlı mutfak. Date için sık öneriliyor.", price: 3 },
  { name: "Yakamoz Pizza", sub: "pizza", city: "İstanbul", district: "Kadıköy", hood: "Moda", score: 8.1, delta: 0.2, count: 764, verified: 0.46, blurb: "Odun fırını, Napoli hamuru, dört çeşit. Hafta sonu bir saat sıra normal.", price: 2 },
  { name: "Sedef Kahvaltı", sub: "kahvalti", city: "İstanbul", district: "Kadıköy", hood: "Caddebostan", score: 7.2, delta: 0.9, count: 388, verified: 0.41, blurb: "Serpme kahvaltı; yeni işletme sonrası puan hızla toparlıyor. Ortalama ama yükseliyor.", price: 2 },
  { name: "Manolya Kahve", sub: "kahve", city: "İstanbul", district: "Kadıköy", hood: "Moda", score: 8.7, delta: 0.1, count: 1094, verified: 0.48, blurb: "Moda'nın çalışma kahvecisi: priz, sessizlik, düzgün filtre. Öğleden sonra masa yok.", price: 2 },
  { name: "Safran Roastery", sub: "kahve", city: "İstanbul", district: "Beşiktaş", hood: "Akaretler", score: 9.0, delta: 0.0, count: 219, verified: 0.66, blurb: "Kendi kavurması, haftalık değişen iki çekirdek. Küçük, sessiz, tutarlı.", price: 2 },
  { name: "Galata Cocktail", sub: "kokteyl", city: "İstanbul", district: "Beyoğlu", hood: "Galata", score: 8.3, delta: -0.2, count: 671, verified: 0.35, blurb: "Kule manzaralı bar; kokteyller iyi, gece on birden sonra ses ve kalabalık artıyor.", price: 4 },
  { name: "The Poyraz", sub: "pub", city: "İstanbul", district: "Kadıköy", hood: "Bahariye", score: 7.4, delta: 0.0, count: 842, verified: 0.31, blurb: "Maç akşamı pub'ı; bira soğuk, ses yüksek. İyi ama beklentiyi ona göre kurun.", price: 2 },
  { name: "Hotel Sarnıç", sub: "otel", city: "İstanbul", district: "Fatih", hood: "Sultanahmet", score: 8.5, delta: 0.2, count: 1842, verified: 0.53, blurb: "Sultanahmet'te yüz odalı şehir oteli; konum ve kahvaltı güçlü, asansör küçük.", price: 3 },
  { name: "Kuzguncuk Suites", sub: "butik", city: "İstanbul", district: "Üsküdar", hood: "Kuzguncuk", score: 9.2, delta: 0.1, count: 96, verified: 0.74, blurb: "Sekiz odalı ahşap yalı; sessizlik ve sahiplenilmiş servis. Sınırlı ama tutarlı veri.", price: 4 },
  { name: "Alaçatı Taş Konak", sub: "butik", city: "İzmir", district: "Çeşme", hood: "Alaçatı", score: 8.8, delta: -0.1, count: 402, verified: 0.5, blurb: "Alaçatı'nın taş avlulu butik oteli; sezon dışı çok sessiz, sezonda fiyat ikiye katlanıyor.", price: 4 },
  { name: "Gümüşlük Balıkçısı", sub: "balik", city: "Muğla", district: "Bodrum", hood: "Gümüşlük", score: 8.6, delta: 0.3, count: 566, verified: 0.44, blurb: "Deniz kenarında masalar; balık günlük, tatlı zayıf. Gün batımı saati dolu.", price: 3 },
  { name: "Antep Katmer Evi", sub: "tatli", city: "Gaziantep", district: "Şahinbey", hood: "Bey Mahallesi", score: 9.1, delta: 0.2, count: 731, verified: 0.47, blurb: "Sabah katmeri, fıstık kalın. Saat ona kadar gidin.", price: 1 },
  { name: "Alsancak Boyoz", sub: "kahvalti", city: "İzmir", district: "Konak", hood: "Alsancak", score: 8.3, delta: 0.0, count: 903, verified: 0.36, blurb: "Boyoz, haşlanmış yumurta, çay. Ayakta yenir; İzmir sabahının kısa yolu.", price: 1 },
  { name: "Tunalı Meyhanesi", sub: "meyhane", city: "Ankara", district: "Çankaya", hood: "Tunalı", score: 8.0, delta: 0.3, count: 486, verified: 0.4, blurb: "Ankara'nın hafta sonu meyhanesi; meze düzgün, canlı müzik geceleri ses yükseliyor.", price: 3 },
  { name: "Kaleiçi Avlu", sub: "restoran", city: "Antalya", district: "Muratpaşa", hood: "Kaleiçi", score: 7.9, delta: -0.3, count: 612, verified: 0.42, blurb: "Kaleiçi avlusunda akşam yemeği; atmosfer güçlü, mutfak sezonda yorulmuş.", price: 3 },
  { name: "Odunpazarı Kahve Evi", sub: "kahve", city: "Eskişehir", district: "Odunpazarı", hood: "Odunpazarı Evleri", score: 8.4, delta: 0.1, count: 341, verified: 0.45, blurb: "Restore edilmiş Odunpazarı evinde filtre kahve; öğrenci kalabalığı öğleden sonra.", price: 1 },
  { name: "Galeri Sarmaşık", sub: "galeri", city: "İstanbul", district: "Beyoğlu", hood: "Çukurcuma", score: 8.2, delta: 0.5, count: 168, verified: 0.29, blurb: "Genç sanatçı sergileri; iki katlı, ücretsiz, sessiz. Son sergiyle puan yükseldi.", price: 1 },
  { name: "Moda Sahne", sub: "tiyatro-sahnesi", city: "İstanbul", district: "Kadıköy", hood: "Moda", score: 8.7, delta: 0.0, count: 1120, verified: 0.52, blurb: "Kadıköy'ün küçük sahnesi; görüş her koltuktan iyi, fuaye dar.", price: 2 },
  { name: "Yedi Kapı", sub: "oyun", city: "İstanbul", district: "Beyoğlu", hood: "Taksim", score: 8.9, delta: 0.2, count: 447, verified: 0.58, blurb: "İki kişilik oyun, doksan dakika, ara yok. Metin ve oyunculuk birlikte taşıyor.", price: 2 },
  { name: "Gri Sabah", sub: "film", city: "İstanbul", district: "Beyoğlu", hood: "Beyoğlu", score: 7.7, delta: -0.2, count: 2210, verified: 0.33, blurb: "Yavaş tempolu şehir draması; görüntü güçlü, ikinci yarı uzuyor. Görüşler ayrışıyor.", price: 1 },
  { name: "Boğaz Caz Günleri", sub: "festival", city: "İstanbul", district: "Sarıyer", hood: "Emirgan", score: 8.5, delta: 0.4, count: 389, verified: 0.36, blurb: "Üç günlük açık hava caz programı; ses düzeni bu yıl belirgin iyi, ulaşım zor.", price: 2 },
  { name: "Lavanta Spa", sub: "spa", city: "İstanbul", district: "Sarıyer", hood: "Tarabya", score: 8.1, delta: 0.0, count: 254, verified: 0.49, blurb: "Hamam ve masaj; temizlik ve randevu düzeni iyi, fiyat yüksek.", price: 4 },
  { name: "Çınar Cowork", sub: "cowork", city: "İstanbul", district: "Kadıköy", hood: "Koşuyolu", score: 8.6, delta: 0.2, count: 133, verified: 0.6, blurb: "Bahçeli coworking; sessiz, toplantı odası rezervasyonu düzgün, kahve zayıf.", price: 2 },
  { name: "Kestane Hamamı", sub: "spa", city: "Bursa", district: "Osmangazi", hood: "Çekirge", score: 6.4, delta: 0.8, count: 298, verified: 0.38, blurb: "Tarihi termal hamam; yenileme sonrası temizlik puanı toparlıyor. Ortalama ama yükseliyor.", price: 2 },
  { name: "İskele Burger", sub: "burger", city: "İstanbul", district: "Kadıköy", hood: "Kadıköy Rıhtım", score: 6.1, delta: -0.9, count: 1376, verified: 0.3, blurb: "Bir zamanlar Kadıköy'ün burgeri; ikinci şubeden sonra tutarlılık düştü, sıra hâlâ uzun.", price: 2 },
  { name: "Reyhan Kahve", sub: "kahve", city: "İstanbul", district: "Beykoz", hood: "Kanlıca", score: 9.4, delta: 0.1, count: 12, verified: 0.5, blurb: "Kanlıca'da altı masalı kahveci. Puan yüksek ama on iki deneyim: sınırlı veri.", price: 1 },
  { name: "Mimoza Beach Hotel", sub: "resort", city: "Antalya", district: "Kemer", hood: "Çıralı", score: 4.6, delta: -1.4, count: 512, verified: 0.27, blurb: "Çıralı'da eski resort; son sezon temizlik ve servis deneyimleri sert düştü.", price: 3 },
];

/* ───── ana üretim ───── */

(function generate() {
  const usersPool = [...BASE_AUTHORS, ...universeUsers.map((u) => u.id)];
  const subOf = (k: string) => SUBS.find((s) => s.key === k)!;
  const schemaOf = (cat: string) => ({ "cat.restaurant": "schema.dining", "cat.cafe": "schema.cafe", "cat.hotel": "schema.hotel", "cat.bar": "schema.bar", "cat.place": "schema.place", "cat.culture": "schema.culture", "cat.show": "schema.show", "cat.venue": "schema.venue", "cat.travel": "schema.travel", "cat.service": "schema.service", "cat.film": "schema.film", "cat.physician": "schema.professional", "cat.dentist": "schema.professional", "cat.lawyer": "schema.professional" } as Record<string, string>)[cat];

  function register(e: Entity, sub: Sub, tier: "A" | "B" | "C", r: () => number, given?: Partial<EntityStats>) {
    const regulated = sub.cat === "cat.physician" || sub.cat === "cat.dentist" || sub.cat === "cat.lawyer";
    const schemaId = schemaOf(sub.cat);
    const dims = ratingSchemas.find((s) => s.id === schemaId)!.dimensions;
    const rawScore = given?.score ?? drawScore(r, sub.scoreBias ?? 0);
    /* 9+ nadir ve kanıtla gelir: keşif kaydı (C) 9,2'yi, gerçek kamusal yer 9,0'ı aşmaz. */
    const score = given?.score ?? round1(Math.min(rawScore, e.realIdentity ? 9.0 : tier === "C" ? 9.2 : 9.6));
    const delta = given?.delta ?? drawDelta(r);
    const count = given?.count ?? drawCount(r, tier);
    const verifiedRatio = given?.verifiedRatio ?? round1(clamp(0.2 + r() * 0.45 + (tier === "A" ? 0.1 : 0), 0.15, 0.8) * 100) / 100;
    const dimVals: Record<string, number> = {};
    for (const d of dims) dimVals[d.key] = round1(clamp(score + (r() - 0.5) * 1.6, 1, 10));
    const stats: EntityStats = {
      score, delta, count, verifiedRatio,
      returnRate: round1(clamp(0.35 + (score - 5) * 0.12 + (r() - 0.5) * 0.1, 0.1, 0.97) * 100) / 100,
      dims: dimVals,
      quiet: round1(sub.quiet ? sub.quiet[0] + r() * (sub.quiet[1] - sub.quiet[0]) : 5),
      speed: round1(sub.speed ? sub.speed[0] + r() * (sub.speed[1] - sub.speed[0]) : 5),
      similar: tier !== "C" && !regulated ? { score: round1(clamp(score + (r() - 0.4) * 0.8, 1, 10)), sampleSize: Math.round(count * (0.15 + r() * 0.3)), returnRate: round1(clamp(0.4 + (score - 5) * 0.11 + (r() - 0.5) * 0.12, 0.1, 0.96) * 100) / 100 } : undefined,
      contextFit: { date: Math.round((stats0(sub, "date") + (r() - 0.5) * 8)), friends: Math.round((r() - 0.4) * 10), business: Math.round((r() - 0.5) * 10), family: Math.round((stats0(sub, "family") + (r() - 0.5) * 10)), solo: Math.round((r() - 0.5) * 8), quick: Math.round((stats0(sub, "quick") + (r() - 0.5) * 10)) },
    };
    e.experienceTotal = count;
    e.tier = tier;
    universeEntities.push(e);
    universeStats[e.id] = stats;
    if (!regulated) {
      universeTimelines[e.id] = timelineFor(rng(e.id + ":tl"), score, delta, count, 6 + Math.floor(r() * 9));
      const spread = tier === "A" ? 0.9 + r() * 0.8 : 1.0 + r() * 1.4;
      const dist = Array.from({ length: 10 }, (_, i) => Math.max(0, Math.round(count * Math.exp(-Math.pow((i + 1 - score) / spread, 2) / 2) / 3)));
      universeDistributions[e.id] = dist;
      const fam = THEME_POOL[FRAG_OF[schemaId] ?? "dining"];
      const tr = rng(e.id + ":themes");
      const posN = tier === "A" ? 3 : tier === "B" ? 2 : 1;
      const posLabels = shuffle(tr, fam.pos).slice(0, posN);
      const negLabels = shuffle(tr, fam.neg).slice(0, posN);
      universePraised[e.id] = posLabels.map((label, i) => ({ key: slugify(label), label, count: Math.round(count * (0.5 - i * 0.12) * (0.6 + tr() * 0.5)), negativeCount: 0, direction: tr() < 0.6 ? "flat" : tr() < 0.8 ? "up" : "down" }));
      universeComplaints[e.id] = negLabels.map((label, i) => ({ key: slugify(label), label, count: Math.round(count * (0.18 - i * 0.05) * (0.6 + tr() * 0.6)), negativeCount: Math.round(count * (0.18 - i * 0.05) * 0.5), direction: delta < -0.3 && i === 0 ? "up" : tr() < 0.65 ? "flat" : tr() < 0.85 ? "up" : "down" }));
      if (tier !== "C" || r() < 0.45) {
        const er = rng(e.id + ":ext");
        const g = round1(clamp(score / 2 + (er() - 0.5) * 0.5, 3.3, 4.9));
        universeExternal.push({ id: `ext.${e.id}.g`, entityId: e.id, provider: "google", label: "Google", kind: "score", score: g, scoreScale: 5, reviewCount: Math.round(count * (2 + er() * 6)), attribution: "Google Haritalar (demo)", isDemo: true, lastUpdated: "2026-08-30", status: "ok" });
        if ((sub.cat === "cat.restaurant" || sub.cat === "cat.hotel" || sub.cat === "cat.culture" || sub.cat === "cat.travel") && er() < 0.7) universeExternal.push({ id: `ext.${e.id}.t`, entityId: e.id, provider: "tripadvisor", label: "Tripadvisor", kind: "score", score: round1(clamp(g + (er() - 0.5) * 0.4, 3, 5)), scoreScale: 5, reviewCount: Math.round(count * (0.5 + er() * 2)), attribution: "Tripadvisor (demo)", isDemo: true, lastUpdated: "2026-08-30", status: "ok" });
        if (sub.cat === "cat.hotel") universeExternal.push({ id: `ext.${e.id}.b`, entityId: e.id, provider: "booking", label: "Booking", kind: "score", score: round1(clamp(score + (er() - 0.5) * 0.6, 5, 9.8)), scoreScale: 10, reviewCount: Math.round(count * (1 + er() * 3)), attribution: "Booking.com (demo)", isDemo: true, lastUpdated: "2026-08-30", status: "ok" });
        if (sub.cat === "cat.film") universeExternal.push({ id: `ext.${e.id}.i`, entityId: e.id, provider: "imdb", label: "IMDb", kind: "score", score: round1(clamp(score - 0.6 + (er() - 0.5) * 0.8, 4, 9)), scoreScale: 10, reviewCount: Math.round(count * (3 + er() * 10)), attribution: "IMDb (demo)", isDemo: true, lastUpdated: "2026-08-30", status: "ok" });
      }
      if (tier !== "C" && !e.realIdentity) {
        const xr = rng(e.id + ":exp");
        const n = tier === "A" ? 6 + Math.floor(xr() * 3) : 3 + Math.floor(xr() * 3);
        for (let i = 0; i < n; i++) universeExperiences.push(makeExperience(xr, e.id, schemaId, stats, i, usersPool));
      }
      if (tier === "A" && !e.realIdentity) {
        const pos = universePraised[e.id][0]; const neg = universeComplaints[e.id][0];
        universeSummaries[e.id] = { entityId: e.id, basedOnCount: Math.round(count * 0.6), windowDays: 90, generatedAt: "2026-09-01", sourceExperienceIds: universeExperiences.filter((x) => x.entityId === e.id).slice(0, 3).map((x) => x.id), lines: [
          `En çok övülen konu ${pos.label.toLocaleLowerCase("tr")}: son 90 günde ${pos.count} deneyim olumlu bahsediyor.`,
          `En sık eleştirilen konu ${neg.label.toLocaleLowerCase("tr")} (${neg.count} deneyim)${neg.direction === "up" ? "; son dönemde artıyor." : "."}`,
          delta > 0.3 ? `Puan son 90 günde +${round1(delta)} yükseldi; deneyimler tutarlılaşıyor.` : delta < -0.3 ? `Puan son 90 günde ${round1(delta)} geriledi; düşüş tek bir boyutta değil.` : `Puan son 90 günde stabil; görüşler ${count > 300 ? "geniş bir tabana" : "dar ama tutarlı bir tabana"} dayanıyor.`,
        ] };
      }
    } else {
      // regüle: yalnızca nötr konu sayımı
      const tr = rng(e.id + ":themes");
      universeComplaints[e.id] = [["Randevu ve bekleme süresi", 0.4], ["İletişim ve bilgilendirme", 0.3], ["Ücret şeffaflığı", 0.2]].map(([label, k]) => ({ key: slugify(label as string), label: label as string, count: Math.round(count * (k as number)), negativeCount: Math.round(count * (k as number) * (0.3 + tr() * 0.4)), direction: "flat" as const }));
    }
  }
  function stats0(sub: Sub, ctx: string): number {
    const q = sub.quiet ? (sub.quiet[0] + sub.quiet[1]) / 2 : 5;
    if (ctx === "date") return (q - 5) * 3;
    if (ctx === "family") return sub.price[1] >= 4 ? -12 : sub.key === "kahvalti" || sub.key === "lokanta" || sub.key === "park" ? 8 : 0;
    if (ctx === "quick") return sub.speed ? (sub.speed[1] - 5) * 4 : 0;
    return 0;
  }

  /* 1) altın set */
  for (const g of GOLDEN) {
    const sub = subOf(g.sub); const r = rng("golden:" + g.name);
    const city = [ISTANBUL, ...CITIES].find((c) => c.name === g.city)!; const d = city.districts.find((x) => x.name === g.district)!;
    const slug = uniqueSlug(g.name, g.hood); usedNames.add(g.name);
    const e: Entity = { id: `ent.u.${slug}`, slug, name: g.name, categoryId: sub.cat, isDemo: true, isSynthetic: true, subcategory: sub.label,
      location: sub.cat === "cat.film" ? { city: g.city } : { city: g.city, district: g.district, neighborhood: g.hood, geo: { lat: round1(d.lat * 1000 + (r() - 0.5) * 12) / 1000, lng: round1(d.lng * 1000 + (r() - 0.5) * 12) / 1000 } },
      address: sub.cat === "cat.film" ? undefined : `${g.hood} (demo adres)`, hours: sub.hours ? pick(r, sub.hours) : undefined, priceLevel: g.price ?? (sub.price[0] as 1 | 2 | 3 | 4),
      facets: g.facets ?? sub.facets, tags: sub.tags, business: sub.cat === "cat.restaurant" || sub.cat === "cat.cafe" || sub.cat === "cat.hotel" ? { claimed: r() < 0.5, subscription: "none" } : undefined, openedAt: `20${10 + Math.floor(r() * 15)}-0${1 + Math.floor(r() * 9)}-01` };
    universeBlurbs[e.id] = g.blurb;
    register(e, sub, "A", r, { score: g.score, delta: g.delta, count: g.count, verifiedRatio: g.verified });
  }

  /* 2) üretilmiş evren */
  const totalW = SUBS.reduce((a, s) => a + s.weight, 0);
  let seq = 0;
  const emit = (city: City, sub: Sub, r: () => number, realName?: string) => {
    seq++;
    let d = pickW(r, city.districts); let hood = pick(r, d.hoods); let cityName = city.name;
    if (realName && REAL_LOC[realName]) {
      const [rc, rd, rh] = REAL_LOC[realName]; cityName = rc;
      const known = [ISTANBUL, ...CITIES].find((c) => c.name === rc)?.districts.find((x) => x.name === rd);
      d = known ?? { name: rd, lat: 0, lng: 0, hoods: [rh] }; hood = rh;
    }
    let name = realName ?? "";
    if (!realName) {
      if (sub.patterns.length === 0) {
        const br = BRANCH[sub.key as keyof typeof BRANCH]; const pre = sub.key === "doktor" ? "Dr." : sub.key === "dis" ? "Dt." : "Av.";
        name = `${pre} ${pick(r, INITIALS)}.${pick(r, INITIALS)}. (${pick(r, br)} · ${d.name})`;
      } else {
        for (let tries = 0; tries < 12; tries++) { name = pick(r, sub.patterns)(r, pick(r, W), hood, d.name, cityName); if (!usedNames.has(name)) break; }
        if (usedNames.has(name)) { for (const h2 of d.hoods) { name = pick(r, sub.patterns)(r, pick(r, W), h2, d.name, cityName); if (!usedNames.has(name)) { hood = h2; break; } } }
        if (usedNames.has(name)) return; /* çakışan ad üretmektense kaydı atla — "X Caddesi Bahariye" gibi adlar olmaz */
      }
    }
    usedNames.add(name);
    const slug = uniqueSlug(name.replace(/[()"]/g, ""), hood);
    const tierRoll = r();
    const richable = !realName && sub.patterns.length > 0;
    const tier: "A" | "B" | "C" = richable && tierRoll < 0.17 ? "B" : "C";
    const e: Entity = { id: `ent.u.${slug}`, slug, name, categoryId: sub.cat, isDemo: true, isSynthetic: !realName, realIdentity: !!realName, subcategory: sub.label,
      location: sub.cat === "cat.film" ? { city: cityName } : { city: cityName, district: d.name, neighborhood: sub.key === "sehir" || !hood ? undefined : hood, geo: d.lat ? { lat: round1(d.lat * 1000 + (r() - 0.5) * 14) / 1000, lng: round1(d.lng * 1000 + (r() - 0.5) * 14) / 1000 } : undefined },
      address: realName || sub.cat === "cat.film" ? undefined : `${hood} (demo adres)`, hours: sub.hours ? pick(r, sub.hours) : undefined,
      priceLevel: sub.price[1] === 1 && (sub.cat === "cat.place" || sub.cat === "cat.travel" || sub.patterns.length === 0) ? undefined : clamp(sub.price[0] + Math.round(r() * (sub.price[1] - sub.price[0])), 1, 4) as 1 | 2 | 3 | 4,
      facets: sub.facets, tags: sub.patterns.length === 0 ? sub.tags : sub.tags?.slice(0, 1 + Math.floor(r() * (sub.tags.length))), openedAt: realName ? undefined : `20${8 + Math.floor(r() * 17)}-0${1 + Math.floor(r() * 9)}-01` };
    register(e, sub, tier, r);
  };

  const ISTANBUL_TARGET = 960;
  for (const sub of SUBS) {
    const r = rng("gen:" + sub.key);
    if (sub.real) { for (const n of sub.real) { const city = /Ankara|İzmir|Bursa|Antalya|Eskişehir|Gaziantep|Trabzon|Mardin|Safranbolu|Şanlıurfa|Edirne|Çanakkale|Efes|Zeugma|Anadolu Medeniyetleri|Kaş|Alaçatı|Kapadokya|Cunda|Datça|Bozcaada|Ayder|Şirince|Kaleköy|Gökçeada|Amasra|Assos|Akyaka|Ayvalık|Sığacık|Uzungöl|Kabak|Ölüdeniz|Kaputaş|İztuzu|Çeşme|Patara|Cennet|Kleopatra|Likya|Karia|Kaçkar|Ege|Gürsel/.test(n) ? pick(r, CITIES) : ISTANBUL; emit(city, sub, r, n); } }
    /* Gezi: sentetik "destinasyon" üretilmez — İstanbul kaçamakları gerçek adlarla gelir (Şile, Polonezköy, Adalar…). */
    const nIst = sub.cat === "cat.travel" ? 0 : Math.round((sub.weight / totalW) * ISTANBUL_TARGET);
    for (let i = 0; i < nIst; i++) emit(ISTANBUL, sub, r);
    if (sub.patterns.length && !sub.real && sub.cat !== "cat.physician" && sub.cat !== "cat.dentist" && sub.cat !== "cat.lawyer") {
      const abroadShare = sub.abroad ? 0.9 : 0.32;
      for (const c of CITIES) { const n = Math.round(nIst * abroadShare * c.weight); for (let i = 0; i < n; i++) emit(c, sub, r); }
    } else if (sub.cat === "cat.physician" || sub.cat === "cat.lawyer" || sub.cat === "cat.dentist") {
      for (const c of CITIES.slice(0, 4)) { const n = Math.round(nIst * 0.15 * (c.weight * 4)); for (let i = 0; i < n; i++) emit(c, sub, r); }
    }
  }

  /* 3) sentetik listeler */
  const byKey = (fn: (e: Entity) => boolean, n: number, seed: string) => { const r = rng("list:" + seed); return shuffle(r, universeEntities.filter(fn)).sort((a, b) => (universeStats[b.id].score - universeStats[a.id].score)).slice(0, n).map((e) => e.id); };
  const L = (id: string, slug: string, title: string, subtitle: string, authorId: string, ids: string[], note: string) => universeLists.push({ id, slug, title, subtitle, authorId, entityIds: ids, note, updatedAt: "2026-08-2" + (id.length % 9), isDemo: true });
  L("list.u1", "modada-kahve", "Moda'da kahve", "Priz, sessizlik, düzgün filtre", "u.kahvedefteri", byKey((e) => e.subcategory === "Kahveci" && e.location?.neighborhood === "Moda", 5, "moda-kahve"), "Moda'da çalışılabilen kahveciler; hepsine en az üç sabah gittim.");
  L("list.u2", "bogazda-meyhane", "Boğaz'da meyhane", "Meze düzeni ve ses seviyesi", "u.mezetabagi", byKey((e) => e.subcategory === "Meyhane" && ["Beşiktaş", "Sarıyer", "Üsküdar", "Beykoz"].includes(e.location?.district ?? ""), 6, "bogaz-meyhane"), "Manzara puanı değil, meze sırası ve servis temposu.");
  L("list.u3", "izmirde-kahvalti", "İzmir'de kahvaltı", "Boyoz'dan serpmeye", "u.egeyakasi", byKey((e) => e.location?.city === "İzmir" && (e.subcategory === "Kahvaltı" || e.subcategory === "Kahveci"), 6, "izmir-kahvalti"), "Sabah dokuzdan önce gidin.");
  L("list.u4", "istanbul-tiyatro-sahneleri", "İstanbul'da tiyatro sahneleri", "Görüş, ses, fuaye", "u.perdearasi", byKey((e) => e.subcategory === "Tiyatro sahnesi", 6, "sahneler"), "Koltuğu değil sahneyi puanlıyorum.");
  L("list.u5", "istanbulda-butik-otel", "İstanbul'da butik otel", "Sessizlik ve sahiplenilmiş servis", "u.odaservisi", byKey((e) => e.subcategory === "Butik otel" && e.location?.city === "İstanbul", 6, "butik"), "Yastık kalitesi listede sıralamayı belirledi.");
  L("list.u6", "egede-koylar", "Ege'de koylar", "Temmuz dışında", "u.koybulucu", byKey((e) => e.categoryId === "cat.travel" && e.subcategory !== "Şehir", 7, "koylar"), "Sezon dışı gittiklerim.");
  L("list.u7", "kadikoyde-ocakbasi", "Kadıköy'de ocakbaşı", "Köz, tuz, sabır", "u.sokakvesofra", byKey((e) => e.subcategory === "Kebapçı / Ocakbaşı" && e.location?.district === "Kadıköy", 5, "ocakbasi"), "Ocak başında oturulamayan ocakbaşı listeye girmedi.");
  L("list.u8", "ankarada-lokanta", "Ankara'da esnaf lokantası", "Tunalı–Kızılay hattı", "u.ankaraakşam", byKey((e) => e.location?.city === "Ankara" && e.subcategory === "Lokanta", 5, "ankara-lokanta"), "Öğle menüsü, hızlı servis, dürüst fiyat.");
  L("list.u9", "istanbulda-galeri", "İstanbul'da ücretsiz galeriler", "Sessiz ve iyi ışıklı", "u.muzekarti", byKey((e) => e.subcategory === "Galeri", 6, "galeri"), "Metni de ışığı da puanladım.");
  L("list.u10", "antepte-tatli", "Antep'te tatlı", "Katmer sabah, baklava öğle", "u.antepsofrasi", byKey((e) => e.location?.city === "Gaziantep" && (e.subcategory === "Tatlıcı" || e.subcategory === "Kahvaltı"), 5, "antep"), "Fıstığın kalınlığı belirledi.");
  L("list.u11", "kokteyl-barlar", "İstanbul'da kokteyl barlar", "Buz, denge, ses", "u.gecebarometresi", byKey((e) => e.subcategory === "Kokteyl bar" && e.location?.city === "İstanbul", 6, "kokteyl"), "Şeker bombası kokteyl listeye giremedi.");
  L("list.u12", "sabah-kosusu-rotalari", "Sabah koşusu için sahil ve parklar", "Zemin, ışık, kalabalık saati", "u.sabahkosusu", byKey((e) => e.categoryId === "cat.place" && (e.subcategory === "Sahil" || e.subcategory === "Park / Koru"), 6, "kosu"), "Yedi–sekiz arası ölçtüm.");
})();

export const universeById: Record<string, Entity> = Object.fromEntries(universeEntities.map((e) => [e.id, e]));
