import { z } from "zod";
import raw from "@/data/real/sor-index.json";

/* SOR GİDENLER · VERİ MOTORU — yalnız sunucu. İsteği yapılandırır, kayıtlı mekânlardan aday bulur, kanıtla gerekçelendirir.
   Kurallar: yalnız dizindeki mekân; puan uydurulmaz; doğrulanamayan özellik (sakin, romantik, ucuz…) gerçekmiş gibi yazılmaz, açıkça söylenir. */
export interface Venue { slug: string; name: string; kind: string; district: string; neighborhood: string | null; address: string | null; lat: number | null; lng: number | null; hours: string | null; description: string | null; notes: string[]; menu: string[]; priceRange: [number, number] | null; secki: { title: string; slug: string; text: string } | null }
export const VENUES = raw as unknown as Venue[];

export const fold = (s: string) => s.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`]/g, " ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const within1 = (a: string, b: string) => {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
};
/* Türkçe ekler: "Galata'da", "kebapçı", "pidesi" kökünden yakalanır; 5+ harfte tek harf hatası tolerans */
const tokenHit = (tok: string, term: string) => tok.startsWith(term) || (term.length >= 5 && within1(tok.slice(0, term.length), term)) || (term.length >= 5 && within1(tok, term));
const hasTerm = (q: string, term: string) => {
  const t = fold(term), toks = q.split(" ");
  if (!t.includes(" ")) return toks.some((x) => tokenHit(x, t));
  return q.includes(t) || t.split(" ").every((p) => toks.some((x) => tokenHit(x, p)));
};

/* Semt: ilçe dışındaki adlar. Merkez yalnız koordinatı olan kayıtlarda yakınlık için. */
interface Area { name: string; district: string; lat?: number; lng?: number; aka?: string[] }
const SUBAREAS: Area[] = [
  { name: "Galata", district: "Beyoğlu", lat: 41.0256, lng: 28.9741, aka: ["kuledibi", "serdar i ekrem"] }, { name: "Karaköy", district: "Beyoğlu", lat: 41.0242, lng: 28.9770 }, { name: "Taksim", district: "Beyoğlu", lat: 41.0369, lng: 28.9850 },
  { name: "Cihangir", district: "Beyoğlu", lat: 41.0316, lng: 28.9830 }, { name: "Asmalımescit", district: "Beyoğlu", lat: 41.0300, lng: 28.9750 }, { name: "Nişantaşı", district: "Şişli", lat: 41.0505, lng: 28.9930, aka: ["nisantas"] },
  { name: "Bebek", district: "Beşiktaş", lat: 41.0770, lng: 29.0430 }, { name: "Ortaköy", district: "Beşiktaş", lat: 41.0470, lng: 29.0270 }, { name: "Etiler", district: "Beşiktaş", lat: 41.0810, lng: 29.0340 }, { name: "Levent", district: "Beşiktaş", lat: 41.0780, lng: 29.0110 },
  { name: "Moda", district: "Kadıköy", lat: 40.9840, lng: 29.0270 }, { name: "Bağdat Caddesi", district: "Kadıköy", lat: 40.9640, lng: 29.0680 }, { name: "Fenerbahçe", district: "Kadıköy", lat: 40.9690, lng: 29.0350 },
  { name: "Sultanahmet", district: "Fatih", lat: 41.0055, lng: 28.9770 }, { name: "Eminönü", district: "Fatih", lat: 41.0170, lng: 28.9720 }, { name: "Balat", district: "Fatih", lat: 41.0290, lng: 28.9480 }, { name: "Kumkapı", district: "Fatih", lat: 41.0040, lng: 28.9610 },
  { name: "Kuzguncuk", district: "Üsküdar", lat: 41.0350, lng: 29.0330 }, { name: "Çengelköy", district: "Üsküdar", lat: 41.0520, lng: 29.0520 }, { name: "Yeniköy", district: "Sarıyer", lat: 41.1200, lng: 29.0680 }, { name: "Tarabya", district: "Sarıyer", lat: 41.1400, lng: 29.0560 }, { name: "Emirgan", district: "Sarıyer", lat: 41.1090, lng: 29.0550 },
];
const DISTRICTS = [...new Set(VENUES.map((v) => v.district).filter(Boolean))];
const CAFE_LIKE = ["Kahveci", "Kafe", "Pastane", "Tatlıcı", "Fırın", "Kahvaltı"];

interface Cuisine { key: string; label: string; terms: string[]; kinds: string[]; text?: string[] }
const CUISINES: Cuisine[] = [
  { key: "pide", label: "pide", terms: ["pide", "lahmacun"], kinds: ["Pideci"], text: ["pide"] }, { key: "kebap", label: "kebap", terms: ["kebap", "kebab", "ocakbasi", "mangal", "adana", "urfa"], kinds: ["Kebapçı / Ocakbaşı"] },
  { key: "doner", label: "döner", terms: ["doner", "iskender"], kinds: ["Dönerci"] }, { key: "balik", label: "balık", terms: ["balik", "deniz urun", "levrek", "cupra"], kinds: ["Balık restoranı"] },
  { key: "meyhane", label: "meyhane", terms: ["meyhane", "rakili", "rakı"], kinds: ["Meyhane"] }, { key: "esnaf", label: "esnaf lokantası", terms: ["esnaf", "lokanta", "ev yemegi", "sulu yemek"], kinds: ["Lokanta"] },
  { key: "sushi", label: "sushi", terms: ["sushi", "susi", "japon mutfagi", "ramen"], kinds: ["Sushi / Japon"] }, { key: "pizza", label: "pizza", terms: ["pizza", "pizzaci"], kinds: ["Pizza"] }, { key: "burger", label: "burger", terms: ["burger", "hamburger"], kinds: ["Burger"] },
  { key: "steak", label: "et", terms: ["steak", "biftek", "et restoran", "antrikot"], kinds: ["Steakhouse"] }, { key: "kahvalti", label: "kahvaltı", terms: ["kahvalti", "brunch", "serpme"], kinds: ["Kahvaltı"] }, { key: "kahve", label: "kahve", terms: ["kahve", "kafe", "cafe", "espresso"], kinds: ["Kahveci", "Kafe"] },
  { key: "tatli", label: "tatlı", terms: ["tatli", "baklava", "kunefe", "pastane"], kinds: ["Tatlıcı", "Pastane"] }, { key: "manti", label: "mantı", terms: ["manti"], kinds: ["Mantıcı"] },
];
/* Yemek adı: kayıtta aynen geçmeli. Geçmiyorsa mutfak türüne düşülür ve bu açıkça yazılır. */
const DISHES: Array<{ key: string; label: string; terms: string[]; cuisine: string; text: string[] }> = [
  { key: "samsun", label: "Samsun pidesi", terms: ["samsun"], cuisine: "pide", text: ["samsun"] }, { key: "lahmacun", label: "lahmacun", terms: ["lahmacun"], cuisine: "pide", text: ["lahmacun"] }, { key: "iskender", label: "İskender", terms: ["iskender"], cuisine: "doner", text: ["iskender"] },
];
const ATTRS: Array<{ key: string; label: string; terms: string[]; evidence: string[] }> = [
  { key: "sakin", label: "sakinlik", terms: ["sakin", "sessiz", "gurultulu olmasin", "gurultusuz", "kalabalik olmasin", "kalabalik istemiyorum"], evidence: ["sakin", "sessiz", "huzurlu"] },
  { key: "romantik", label: "romantik atmosfer", terms: ["romantik", "ilk bulusma", "first date", "sevgili"], evidence: ["romantik"] },
  { key: "gosterissiz", label: "gösterişsiz olması", terms: ["gosterisli olmayan", "gosterissiz", "sade", "abartisiz"], evidence: ["sade", "tabela yok", "gosterissiz", "mutevazi"] },
  { key: "ekonomik", label: "uygun fiyat", terms: ["uygun fiyat", "ucuz", "ekonomik", "hesapli", "butce"], evidence: ["uygun fiyat", "ekonomik", "hesapli"] },
  { key: "manzara", label: "manzara", terms: ["manzara", "teras", "bogaz gor", "deniz gor"], evidence: ["manzara", "teras", "bogaz", "rooftop"] },
  { key: "cocuk", label: "çocuğa uygunluk", terms: ["cocuk", "aile ile", "ailece"], evidence: ["cocuk", "aile"] },
  { key: "turist", label: "misafire uygunluk", terms: ["turist", "yabanci arkadas", "misafir", "yurt disindan"], evidence: ["tarihi", "klasik", "1901", "unlu", "turist"] },
  { key: "aksam", label: "akşam yemeği", terms: ["aksam yemegi", "aksam", "dinner"], evidence: [] },
  { key: "kalite", label: "kalite", terms: ["iyi bir", "kaliteli", "guzel bir"], evidence: [] },
];
const PROFILE_ONLY = new Set(["aksam", "kalite"]);

export const IntentSchema = z.object({
  area: z.string().max(40).nullable(), district: z.string().max(40).nullable(), cuisine: z.string().max(20).nullable(), dish: z.string().max(20).nullable(),
  attrs: z.array(z.string().max(20)).max(10), party: z.number().int().min(1).max(50).nullable(), name: z.string().max(80).nullable(), wholeCity: z.boolean(),
}).strict();
export type Intent = z.infer<typeof IntentSchema>;
export const emptyIntent = (): Intent => ({ area: null, district: null, cuisine: null, dish: null, attrs: [], party: null, name: null, wholeCity: false });
export const KNOWN = { areas: [...DISTRICTS, ...SUBAREAS.map((a) => a.name)], cuisines: CUISINES.map((c) => c.key), dishes: DISHES.map((d) => d.key), attrs: ATTRS.map((a) => a.key) };

const NAME_NOISE = new Set(["restoran", "restaurant", "lokanta", "lokantasi", "cafe", "kafe", "ve", "the", "bar", "kebap", "balik", "pide", "ocakbasi", "doner", "kebapcisi", "sofrasi", "evi", "et", "iyi", "guzel", "bir"]);
function matchName(q: string): Venue | null {
  const toks = q.split(" ").filter((t) => t.length >= 3);
  let best: { v: Venue; s: number } | null = null;
  for (const v of VENUES) {
    const nt = fold(v.name).split(" ").filter((t) => t.length >= 3 && !NAME_NOISE.has(t));
    /* yazımı bitişik bilinen ad: "nusret" → "Nusr-Et Burger Bebek" */
    const compact = fold(v.name).replace(/ /g, "");
    if (toks.length <= 3 && toks.some((t) => t.length >= 5 && compact.startsWith(t))) { const s = 50; if (!best || s > best.s) best = { v, s }; continue; }
    if (!nt.length) continue;
    const hits = nt.filter((n) => toks.some((t) => t === n || (n.length >= 4 && t.startsWith(n) && t.length - n.length <= 4) || (n.length >= 5 && within1(t, n))));
    if (hits.length === nt.length) { const s = hits.join("").length; if (!best || s > best.s) best = { v, s }; }
  }
  return best && best.s >= 4 ? best.v : null;
}

/** Yerel yorum. Modelsiz de çalışır; model varsa yalnız boş kalan alanları doldurur. */
export function parseQuery(query: string): Intent & { confident: boolean } {
  const q = fold(query);
  const i = emptyIntent();
  const sub = SUBAREAS.find((a) => [a.name, ...(a.aka ?? [])].some((n) => hasTerm(q, n)));
  if (sub) { i.area = sub.name; i.district = sub.district; }
  else { const d = DISTRICTS.find((x) => fold(x).length >= 4 && hasTerm(q, x)); if (d) { i.area = d; i.district = d; } }
  i.wholeCity = !i.area && /\bistanbul/.test(q);
  const dish = DISHES.find((d) => d.terms.some((t) => hasTerm(q, t)));
  if (dish) { i.dish = dish.key; i.cuisine = dish.cuisine; }
  else { const c = CUISINES.find((x) => x.terms.some((t) => hasTerm(q, t))); if (c) i.cuisine = c.key; }
  i.attrs = ATTRS.filter((a) => a.terms.some((t) => hasTerm(q, t))).map((a) => a.key);
  const pm = q.match(/\b(\d{1,2}) kisi/) ?? q.match(/\bbiz (\d{1,2})\b/);
  if (pm) i.party = Number(pm[1]);
  const named = matchName(q);
  if (named) i.name = named.slug;
  return { ...i, confident: !!(i.area || i.cuisine || i.name) };
}

const REFINES = { cheaper: "Daha ekonomik", quieter: "Daha sakin", other_area: "Başka semtte" } as const;
export type Refine = keyof typeof REFINES;

/** Takip sorusu: yeni istekte söylenmeyen alanlar önceki bağlamdan gelir. */
export function mergeIntent(prev: Intent | null | undefined, next: Intent, refine?: Refine | null): Intent {
  const m: Intent = prev ? { ...prev, attrs: [...new Set([...prev.attrs, ...next.attrs])], area: next.area ?? prev.area, district: next.area ? next.district : prev.district, cuisine: next.cuisine ?? prev.cuisine, dish: next.dish ?? (next.cuisine ? null : prev.dish), party: next.party ?? prev.party, name: next.name, wholeCity: next.wholeCity || prev.wholeCity } : next;
  if (refine === "cheaper" && !m.attrs.includes("ekonomik")) m.attrs = [...m.attrs, "ekonomik"];
  if (refine === "quieter" && !m.attrs.includes("sakin")) m.attrs = [...m.attrs, "sakin"];
  if (refine === "other_area") { m.area = null; m.district = null; }
  return m;
}

const hayOf = (v: Venue) => fold([v.description, ...v.notes, v.menu.join(" "), v.secki?.text].filter(Boolean).join(" "));
const distM = (a: Area, v: Venue) => { if (a.lat == null || v.lat == null || v.lng == null) return null; const dy = (v.lat - a.lat) * 111000, dx = (v.lng - a.lng!) * 111000 * Math.cos((a.lat * Math.PI) / 180); return Math.round(Math.hypot(dx, dy)); };

export interface Candidate { slug: string; name: string; kind: string; district: string; address: string | null; href: string; facts: string[]; why: string[]; caveats: string[]; score: number; sourced: boolean; areaFit: "tam" | "yakin" | "ilce" | "yok" | null }

function scoreVenue(v: Venue, i: Intent): Candidate | null {
  const hay = hayOf(v), name = fold(v.name), addr = fold(`${v.address ?? ""} ${v.neighborhood ?? ""}`);
  const why: string[] = [], caveats: string[] = []; let s = 0;
  let areaFit: Candidate["areaFit"] = null;
  if (i.name === v.slug) { s += 200; why.push("Adını sorduğun mekân."); }
  if (i.area) {
    const sub = SUBAREAS.find((a) => a.name === i.area), t = fold(i.area);
    if (sub) {
      const d = distM(sub, v);
      if (addr.includes(t) || hay.includes(t)) { areaFit = "tam"; s += 50; why.push(`Kaydında ${i.area} geçiyor.`); }
      else if (d != null && d <= 900) { areaFit = "yakin"; s += 40; why.push(`Konum kaydına göre ${i.area} merkezine yaklaşık ${Math.round(d / 50) * 50} m.`); }
      else if (v.district === sub.district) { areaFit = "ilce"; s += 12; caveats.push(`${i.area} içinde olduğu doğrulanmadı; ilçesi ${v.district}.`); }
      else if (i.name !== v.slug) return null;
    } else if (fold(v.district) === t) { areaFit = "tam"; s += 45; why.push(`${v.district}'de kayıtlı.`); }
    else if (i.name !== v.slug) return null;
  }
  if (i.dish) {
    const d = DISHES.find((x) => x.key === i.dish)!;
    if (d.text.some((t) => hay.includes(t) || name.includes(t))) { s += 70; why.push(`Kaynaklı kaydında ${d.label} geçiyor.`); }
  }
  if (i.cuisine) {
    const c = CUISINES.find((x) => x.key === i.cuisine);
    if (c) {
      if (c.kinds.includes(v.kind)) { s += 40; why.push(`Türü: ${v.kind}.`); }
      else if ([...c.terms, ...(c.text ?? [])].some((t) => name.includes(fold(t)))) { s += 30; why.push(`Adında ${c.label} geçiyor.`); }
      else if ((c.text ?? c.terms).some((t) => v.menu.some((m) => fold(m).includes(fold(t))))) { s += 28; why.push(`Menüsünde ${c.label} var.`); }
      else if (i.name !== v.slug) return null;
    }
  }
  if (!i.cuisine && !i.name && i.attrs.includes("aksam") && CAFE_LIKE.includes(v.kind)) return null;
  if (!i.cuisine && !i.name && CAFE_LIKE.includes(v.kind)) s -= 20;
  for (const key of i.attrs) {
    const a = ATTRS.find((x) => x.key === key); if (!a || PROFILE_ONLY.has(key)) continue;
    const hit = a.evidence.find((t) => hay.includes(fold(t)));
    if (key === "ekonomik") {
      if (hit) { s += 10; why.push("Kaydında uygun fiyatla ilgili bilgi var."); }
      else if (v.priceRange) { s += v.priceRange[0] < 400 ? 12 : 4; caveats.push(`Menüde fiyatlar ${v.priceRange[0]}-${v.priceRange[1]} TL arası; "uygun" yargısı sana kalmış.`); }
      else caveats.push("Fiyat bilgisi kayıtlı değil.");
    } else if (hit) { s += 10; why.push(`Kaydında "${hit}" ifadesi var; ${a.label} için ipucu, kesin bilgi değil.`); }
    else caveats.push(`${a.label[0].toLocaleUpperCase("tr")}${a.label.slice(1)} kayıtlarımızla doğrulanamadı.`);
  }
  const sourced = !!(v.description || v.secki);
  if (v.description) s += 8;
  if (v.secki) { s += 6; why.push(`Gidenler Seçkisi'nde yazısı var: "${v.secki.title}".`); }
  if (v.menu.length) s += 3;
  const facts = [v.kind, v.district, v.description, v.priceRange ? `Menü fiyatı ${v.priceRange[0]}-${v.priceRange[1]} TL` : null, v.address].filter((x): x is string => !!x);
  if (!why.length) why.push(`${v.kind}, ${v.district}.`);
  return { slug: v.slug, name: v.name, kind: v.kind, district: v.district, address: v.address, href: `/mekan/${v.slug}/`, facts, why: why.slice(0, 3), caveats: caveats.slice(0, 2), score: s, sourced, areaFit };
}

export function findCandidates(i: Intent, opts: { exclude?: string[]; limit?: number } = {}): Candidate[] {
  const ex = new Set(opts.exclude ?? []);
  return VENUES.filter((v) => !ex.has(v.slug)).map((v) => scoreVenue(v, i)).filter((c): c is Candidate => !!c)
    /* eşit puanda sabit sıra: rastgele öneri yok */
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "tr")).slice(0, opts.limit ?? 8);
}

export interface Answered { items: Candidate[]; note: string | null; question: string | null; relaxed: string | null }

/** Sonuç ve dürüst açıklama. Boş sonuç sessiz kalmaz: neyin bulunmadığı ve neye genişletildiği yazılır. */
export function answer(i: Intent, opts: { exclude?: string[] } = {}): Answered {
  const cuisineLabel = i.dish ? DISHES.find((d) => d.key === i.dish)!.label : CUISINES.find((c) => c.key === i.cuisine)?.label;
  let items = findCandidates(i, { ...opts, limit: 8 });
  let relaxed: string | null = null, note: string | null = null, question: string | null = null;
  if (i.dish && !items.some((c) => c.why.some((w) => w.includes("Kaynaklı kaydında")))) note = `Kayıtlarımızda ${cuisineLabel} geçen bir mekân bulamadım; aynı türdeki mekânları gösteriyorum.`;
  if (!items.length && i.area && i.cuisine) {
    const wide = findCandidates({ ...i, area: null, district: null }, opts);
    relaxed = `${i.area}'da kayıtlı ${cuisineLabel ?? "uygun"} mekân bulamadım. İstanbul'un başka semtlerinden en yakın eşleşmeler:`;
    items = wide; question = "Başka bir semt de olur mu, yoksa aynı semtte farklı bir mutfak mı bakayım?";
  } else if (!items.length) note = "Bu istekle eşleşen kayıtlı mekân bulamadım.";
  if (!i.area && !i.cuisine && !i.name) {
    question = "Hangi semt ya da hangi mutfak olsun?";
    note = "Semt ya da mutfak söylemediğin için, hakkında en çok kaynaklı bilgi bulunan mekânlardan başladım.";
    items = items.filter((c) => c.sourced);
  }
  return { items: items.slice(0, 5), note, question, relaxed };
}
export const REFINE_LABELS = REFINES;
