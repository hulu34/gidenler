import { z } from "zod";
import raw from "@/data/real/sor-index.json";
import { CLOSED_CONFIRMED } from "@/lib/closure";

/* SOR GİDENLER · VERİ MOTORU — yalnız sunucu. İsteği yapılandırır, kayıtlı mekânlardan aday bulur, kanıtla gerekçelendirir.
   Kurallar: yalnız dizindeki mekân; puan uydurulmaz; doğrulanamayan özellik (sakin, romantik, ucuz…) gerçekmiş gibi yazılmaz, açıkça söylenir. */
export interface Venue { slug: string; name: string; kind: string; district: string; neighborhood: string | null; address: string | null; lat: number | null; lng: number | null; hours: string | null; description: string | null; notes: string[]; menu: string[]; priceRange: [number, number] | null; priceMedian?: number | null; secki: { title: string; slug: string; text: string } | null }
/* kalıcı kapandığı doğrulanan mekânlar Sor sonuçlarına girmez (lib/closure.ts) */
export const VENUES = (raw as unknown as Venue[]).filter((v) => !CLOSED_CONFIRMED.has(v.slug));

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
const tokenHit = (tok: string, term: string) => tok.startsWith(term) || (term.length >= 5 && tok[0] === term[0] && (within1(tok.slice(0, term.length), term) || within1(tok, term)));
const hasTerm = (q: string, term: string) => {
  const t = fold(term), toks = q.split(" ");
  if (t === "sade") return toks.includes("sade"); // "sadece" bir atmosfer tercihi değildir.
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
  { name: "Bostancı", district: "Kadıköy", lat: 40.9530, lng: 29.0950 }, { name: "Suadiye", district: "Kadıköy", lat: 40.9610, lng: 29.0830 }, { name: "Caddebostan", district: "Kadıköy", lat: 40.9690, lng: 29.0620 }, { name: "Göztepe", district: "Kadıköy", lat: 40.9780, lng: 29.0640 }, { name: "Erenköy", district: "Kadıköy", lat: 40.9720, lng: 29.0760 },
  { name: "Mecidiyeköy", district: "Şişli", lat: 41.0670, lng: 28.9950 }, { name: "Osmanbey", district: "Şişli", lat: 41.0520, lng: 28.9870 }, { name: "Kurtuluş", district: "Şişli", lat: 41.0480, lng: 28.9820 }, { name: "Tophane", district: "Beyoğlu", lat: 41.0280, lng: 28.9810 }, { name: "Beyazıt", district: "Fatih", lat: 41.0100, lng: 28.9640 }, { name: "Aksaray", district: "Fatih", lat: 41.0120, lng: 28.9520 }, { name: "Yeşilköy", district: "Bakırköy", lat: 40.9630, lng: 28.8250 }, { name: "Ataköy", district: "Bakırköy", lat: 40.9840, lng: 28.8560 }, { name: "Arnavutköy Boğaz", district: "Beşiktaş", lat: 41.0680, lng: 29.0430 },
];
const DISTRICTS = [...new Set(VENUES.map((v) => v.district).filter(Boolean))];
/** Modelin ilçe/semt önerisi yalnız kullanıcının metninde adı veya kayıtlı takma adı geçiyorsa kabul edilir. */
export function areaMentioned(query: string, area: string): boolean {
  const q = fold(query), sub = SUBAREAS.find(a => a.name === area);
  return sub ? [sub.name, ...(sub.aka ?? [])].some(name => hasTerm(q, name)) : DISTRICTS.includes(area) && hasTerm(q, area);
}
const CAFE_LIKE = ["Kahveci", "Kafe", "Pastane", "Tatlıcı", "Fırın", "Kahvaltı"];

interface Cuisine { key: string; label: string; terms: string[]; kinds: string[]; text?: string[] }
const CUISINES: Cuisine[] = [
  { key: "pide", label: "pide", terms: ["pide", "lahmacun"], kinds: ["Pideci"], text: ["pide"] }, { key: "kebap", label: "kebap", terms: ["kebap", "kebab", "ocakbasi", "mangal", "adana", "urfa"], kinds: ["Kebapçı / Ocakbaşı"] },
  { key: "doner", label: "döner", terms: ["doner", "iskender"], kinds: ["Dönerci"] }, { key: "balik", label: "balık", terms: ["balik", "deniz urun", "levrek", "cupra"], kinds: ["Balık restoranı"] },
  { key: "meyhane", label: "meyhane", terms: ["meyhane", "rakili", "rakı"], kinds: ["Meyhane"] }, { key: "esnaf", label: "esnaf lokantası", terms: ["esnaf", "lokanta", "ev yemegi", "sulu yemek"], kinds: ["Lokanta"] },
  { key: "sushi", label: "sushi", terms: ["sushi", "susi", "japon", "ramen"], kinds: ["Sushi / Japon"] }, { key: "pizza", label: "pizza", terms: ["pizza", "pizzaci"], kinds: ["Pizza"] }, { key: "burger", label: "burger", terms: ["burger", "hamburger"], kinds: ["Burger"] },
  { key: "steak", label: "et", terms: ["steak", "biftek", "et restoran", "antrikot"], kinds: ["Steakhouse"] }, { key: "kahvalti", label: "kahvaltı", terms: ["kahvalti", "brunch", "serpme"], kinds: ["Kahvaltı"] }, { key: "kahve", label: "kahve", terms: ["kahve", "kafe", "cafe", "espresso"], kinds: ["Kahveci", "Kafe"] },
  { key: "tatli", label: "tatlı", terms: ["tatli", "baklava", "kunefe", "pastane"], kinds: ["Tatlıcı", "Pastane"] }, { key: "manti", label: "mantı", terms: ["manti"], kinds: ["Mantıcı"] },
  /* köftecinin ayrı türü yok: adında ya da menüsünde köfte geçen kayıt */
  { key: "kofte", label: "köfte", terms: ["kofte"], kinds: [], text: ["kofte"] },
];
/* Yemek adı: kayıtta aynen geçmeli. Geçmiyorsa mutfak türüne düşülür ve bu açıkça yazılır. */
const DISHES: Array<{ key: string; label: string; terms: string[]; cuisine: string; text: string[] }> = [
  { key: "samsun", label: "Samsun pidesi", terms: ["samsun"], cuisine: "pide", text: ["samsun"] }, { key: "lahmacun", label: "lahmacun", terms: ["lahmacun"], cuisine: "pide", text: ["lahmacun"] }, { key: "iskender", label: "İskender", terms: ["iskender"], cuisine: "doner", text: ["iskender"] },
  /* esnaf lokantası yemekleri: kayıtta geçmiyorsa lokanta türüne düşülür ve bu açıkça yazılır */
  { key: "kuru-fasulye", label: "kuru fasulye", terms: ["kuru fasulye", "kuru fasulya"], cuisine: "esnaf", text: ["kuru fasulye"] },
  { key: "karniyarik", label: "karnıyarık", terms: ["karniyarik"], cuisine: "esnaf", text: ["karniyarik"] },
  { key: "etli-nohut", label: "etli nohut", terms: ["etli nohut", "nohut pilav"], cuisine: "esnaf", text: ["nohut"] },
  { key: "hunkar", label: "hünkâr beğendi", terms: ["hunkar"], cuisine: "esnaf", text: ["hunkar"] },
  { key: "menemen", label: "menemen", terms: ["menemen"], cuisine: "kahvalti", text: ["menemen"] },
];
/* Nitelik yalnız kaynaklı metinde AÇIKÇA geçiyorsa doğrulanmış sayılır; çağrışım (tarihi → turiste uygun) kanıt değildir. */
const ATTRS: Array<{ key: string; label: string; terms: string[]; evidence: string[] }> = [
  { key: "sakin", label: "sakinlik", terms: ["sakin", "sessiz", "gurultulu olmasin", "gurultusuz", "kalabalik olmasin", "kalabalik istemiyorum"], evidence: ["sakin", "sessiz", "huzurlu"] },
  { key: "romantik", label: "romantik atmosfer", terms: ["romantik", "ilk bulusma", "first date"], evidence: ["romantik"] },
  { key: "gosterissiz", label: "gösterişsiz olması", terms: ["gosterisli olmayan", "gosterissiz", "sade", "abartisiz"], evidence: ["gosterissiz", "mutevazi", "tabela yok"] },
  { key: "ekonomik", label: "uygun fiyat", terms: ["uygun fiyat", "ucuz", "ekonomik", "hesapli", "butce", "pahali olmasin", "pahali olmayan", "cebimi yakmayacak", "cep dostu", "fiyati uygun"], evidence: ["uygun fiyat", "ekonomik", "hesapli"] },
  /* saat yalnız kayıtlı açılış saatinden; vejetaryen yalnız kayıtta ya da adda açıkça geçiyorsa */
  { key: "gec", label: "geç saate kadar açık olması", terms: ["gece gec", "gec saat", "gece acik", "gece yarisi", "sabaha kadar", "24 saat"], evidence: [] },
  { key: "vejetaryen", label: "vejetaryen seçenek", terms: ["vejetaryen", "vegan", "etsiz"], evidence: ["vegan", "vejetaryen", "etsiz"] },
  { key: "manzara", label: "manzara", terms: ["manzara", "teras", "bogaz gor", "deniz gor"], evidence: ["manzara", "teras", "rooftop"] },
  { key: "cocuk", label: "çocuğa uygunluk", terms: ["cocuk", "aile ile", "ailece"], evidence: ["cocuk"] },
  { key: "turist", label: "misafire uygunluk", terms: ["turist", "yabanci arkadas", "misafir", "yurt disindan"], evidence: ["turist"] },
  { key: "aksam", label: "akşam yemeği", terms: ["aksam yemegi", "aksam", "dinner"], evidence: [] },
  { key: "kalite", label: "kalite", terms: ["iyi bir", "kaliteli", "guzel bir"], evidence: [] },
  /* Gidenler puanı ve popülerlik sıralaması henüz yok: istenirse açıkça söylenir, sıralama uydurulmaz */
  { key: "populer", label: "puan ya da popülerlik sıralaması", terms: ["populer", "en iyi", "en cok", "meshur", "en yuksek puan", "puanli", "puani yuksek"], evidence: [] },
];
const PROFILE_ONLY = new Set(["aksam", "kalite", "populer"]);

export const IntentSchema = z.object({
  area: z.string().max(40).nullable(), district: z.string().max(40).nullable(), cuisine: z.string().max(20).nullable(), dish: z.string().max(20).nullable(),
  attrs: z.array(z.string().max(20)).max(10), party: z.number().int().min(1).max(50).nullable(), name: z.string().max(80).nullable(), wholeCity: z.boolean(),
  /* kayıtlı listede olmayan semt ya da yemek: yalnız kayıt metninde aranır, bulunmazsa "yok" denir */
  areaText: z.string().max(40).nullable().default(null), term: z.string().max(40).nullable().default(null),
  budgetMax: z.number().int().min(1).max(100000).nullable().default(null), notCuisines: z.array(z.string().max(20)).max(15).default([]),
  notFoods: z.array(z.enum(["kirmizi-et"])).max(1).default([]),
  drinks: z.array(z.enum(["viski"])).max(1).default([]),
  occasion: z.enum(["ozel-gun"]).nullable().default(null),
  /* "Beyoğlu dışında": bu semt/ilçedeki mekân önerilmez */
  notArea: z.string().max(40).nullable().default(null),
}).strict();
export type Intent = z.infer<typeof IntentSchema>;
export const emptyIntent = (): Intent => ({ area: null, district: null, cuisine: null, dish: null, attrs: [], party: null, name: null, wholeCity: false, areaText: null, term: null, budgetMax: null, notCuisines: [], notArea: null, notFoods: [], drinks: [], occasion: null });
/** Bilinen semt, mutfak, yemek ya da tercih sözcüğü: serbest metin (term) olarak ayrıca aranmaz. */
export const isVocab = (s: string) => { const f = fold(s); return [...DISTRICTS, ...SUBAREAS.map((a) => a.name), ...CUISINES.flatMap((c) => c.terms), ...DISHES.flatMap((d) => d.terms), ...ATTRS.flatMap((a) => a.terms), "yemek", "yemegi", "yer", "mekan", "restoran", "ogle", "aksam", "viski", "whisky", "whiskey", "kirmizi et"].some((t) => { const x = fold(t); return f === x || f.split(" ").every((w) => x.split(" ").includes(w) || ["yemegi", "yemek", "yer", "bir", "icin"].includes(w)); }); };
export const KNOWN = { areas: [...DISTRICTS, ...SUBAREAS.map((a) => a.name)], cuisines: CUISINES.map((c) => c.key), dishes: DISHES.map((d) => d.key), attrs: ATTRS.map((a) => a.key) };
const hasHardFilter = (i: Intent) => !!(i.area || i.areaText || i.cuisine || i.term || i.name || i.budgetMax || i.notArea || i.notCuisines.length || i.notFoods.length || i.drinks.length);

/* Sıradan sözcük tek başına ad sayılmaz: "pide nerede yenir" Yeni Lokanta'yı bulmaz; adın tamamı yazılmalı. */
/* başka şehir adları tek başına mekân adı sayılmaz: "Bodrum'da balık" Bodrum Mantı değildir (tam adla yazılınca yine bulunur) */
const OTHER_CITY_WORDS = ["izmir", "ankara", "antalya", "bursa", "bodrum", "eskisehir", "adana", "gaziantep", "trabzon", "mersin", "konya", "kapadokya", "cesme", "alacati", "fethiye", "ayvalik"];
const QUERY_NOISE = new Set([...OTHER_CITY_WORDS, "istanbul", "misin", "musun", "misiniz", "musunuz", "miyiz", "miyim", "nerede", "neresi", "nasil", "nasildir", "nasilsin", "neden", "nicin", "kimdir", "yapilir", "yapilmaz", "hangi", "hangisi", "var", "yok", "lazim", "oner", "onerir", "onerin", "soyle", "bana", "bize", "sana", "size", "goster", "verilen", "kural", "kurallari",
  /* fiil: "Burger yiyelim" Burger Yiyelim zinciri değildir */ "yiyelim", "yiyecek", "yiyebilecegim", "yemek", "gidelim", "gidecek", "icelim", "oturalim", "bakalim", "olsun", "olmasin"]);
const COMMON_NAME = new Set(["yeni", "eski", "buyuk", "kucuk", "tarihi", "meshur", "bizim", "kardesler", "ortaklar", "asmali", "ev", "ana", "usta", "lezzet", "aile", "sofra", "kent", "merkez", "istanbul"]);
const NAME_NOISE = new Set(["restoran", "restaurant", "lokanta", "lokantasi", "cafe", "kafe", "ve", "the", "bar", "kebap", "balik", "pide", "ocakbasi", "doner", "kebapcisi", "sofrasi", "evi", "et", "iyi", "guzel", "bir",
  /* İngilizce tür sözcükleri de ad değildir: "Blum Coffee House" Coffee Department değildir (katalog genişlemesi, kafeler) */
  "coffee", "coffe", "caffe", "caffee", "house", "roastery", "roasters", "roasting", "company", "brasserie", "bistro", "kitchen", "bakery", "pizza", "burger", "grill", "lounge", "pub"]);
/* Semt, mutfak ya da tercih sözcüğü tek başına mekân adı sayılmaz: "kebap" Kebap Hocası'nı, "Karaköy" Karaköy Lokantası'nı seçmez. */
const isGeneric = (t: string) => [...SUBAREAS.map((a) => a.name), ...DISTRICTS, ...CUISINES.flatMap((c) => c.terms), ...DISHES.flatMap((d) => d.terms), ...ATTRS.flatMap((a) => a.terms)].some((term) => { const x = fold(term); return !x.includes(" ") && tokenHit(t, x); });
function matchName(q: string): Venue | null {
  /* Tam ad, bir sözcüğü aynı olan başka mekânın kısmi/bitişik ad eşleşmesinden önce gelir.
     Örn. Develi Samatya, Samatya Cafe ya da yalnız Develi ile yer değiştiremez. */
  const full = VENUES.filter(v => { const name = fold(v.name); return name.length >= 8 && (q === name || name.split(" ").some(t => t.length >= 3 && !isGeneric(t) && !QUERY_NOISE.has(t) && !NAME_NOISE.has(t))) && (` ${q} `).includes(` ${name} `); })
    .sort((a,b) => fold(b.name).length - fold(a.name).length)[0];
  if (full) return full;
  const toks = q.split(" ").filter((t) => t.length >= 3);
  /* soru ekleri ve şehir adı mekân adı değildir: "önerir misin" Misina, "İstanbul'da" İstanbul Emniyet... değildir */
  const own = toks.filter((t) => !isGeneric(t) && !QUERY_NOISE.has(t));
  /* adın tamamı yazıldıysa (≥ 8 harf) sözcükleri genel olsa da o mekândır: "Bodrum Mantı" */
  if (!own.length) { const full = VENUES.filter((v) => { const f = fold(v.name).replace(/\b(ve|cafe|kafe)\b/g, " ").replace(/\s+/g, " ").trim(); return f.length >= 8 && (` ${q} `).includes(` ${f} `); }).sort((a, b) => b.name.length - a.name.length)[0]; return full ?? null; }
  let best: { v: Venue; s: number; raw: number } | null = null;
  for (const v of VENUES) {
    const nt = fold(v.name).split(" ").filter((t) => t.length >= 3 && !NAME_NOISE.has(t));
    /* yazımı bitişik bilinen ad: "nusret" → "Nusr-Et Burger Bebek" */
    const compact = fold(v.name).replace(/ /g, "");
    if (toks.length <= 3 && own.some((t) => t.length >= 5 && !NAME_NOISE.has(t) && compact.startsWith(t))) { const s = 50; if (!best || s > best.s) best = { v, s, raw: s }; continue; }
    if (!nt.length) continue;
    if (nt.every((n) => COMMON_NAME.has(n)) && !q.includes(fold(v.name))) continue;
    /* ek toleransı 6+ harfte: "boğaz" Boga, "yenir" Yeni değildir */
    const near = (t: string, n: string) => t === n || (n.length >= 6 && t.startsWith(n) && t.length - n.length <= 4) || (n.length >= 5 && t.length >= 5 && within1(t, n));
    const hits = nt.filter((n) => toks.some((t) => near(t, n) || q.includes(`${n} `) && t === n));
    /* birebir yazılan ad, yakın yazımdan üstün: "ciya" (birebir) "nasil"≈"nasip"ten (yakın) önce gelir */
    if (hits.length === nt.length && hits.some((n) => own.some((t) => near(t, n)))) { const raw = hits.join("").length, s = hits.reduce((a, n) => a + n.length * (toks.includes(n) ? 2 : 1), 0); if (!best || s > best.s) best = { v, s, raw }; }
  }
  /* eşik ham ad uzunluğuyla (birebir ağırlığı yalnız adaylar arası seçimde) */
  return best && best.raw >= 4 ? best.v : null;
}

const NEG = /^(olmasin|olmayan|istemiyor|istemem|istemez|istemeyen|sevmiyor|sevmem|sevmez|sevmeyen|sevmedi|yemiyor|yemem|yemez|yemeyen|yemedi|tuketmiyor|haric|disinda|degil|yok)/;
const RED_MEAT_TERMS = ["kirmizi et", "et", "dana", "sigir", "kuzu", "koyun"];
/** Scope negation to a food phrase; a partner's implicit refusal can refer to the previous clause. */
function foodNegated(query: string, terms: string[]) {
  const clauses = query.toLocaleLowerCase("tr").split(/[,;.!?]+|\b(?:ama|fakat|ancak)\b/).map(fold).filter(Boolean);
  const allTerms = [...CUISINES.flatMap(c => c.terms), ...RED_MEAT_TERMS];
  const cuisineWord = (x:string) => allTerms.some(t => fold(t).split(" ").some(w => tokenHit(x,w)));
  return clauses.some((clause, index) => {
    const toks = clause.split(" ");
    const direct = terms.some(term => {
      const words = fold(term).split(" ");
      return toks.some((_, n) => words.every((w,k) => tokenHit(toks[n+k] ?? "",w)) && (() => {
        for(let k=n+words.length;k<Math.min(toks.length,n+words.length+12);k++) {
          if(NEG.test(toks[k]))return true;
          if(!/^(ya|da|de|veya|ve|yada|ile|ne|bir|sey|yer|mekan|restoran[a-z]*|lokanta[a-z]*)$/.test(toks[k])&&!cuisineWord(toks[k]))return false;
        }
        return false;
      })());
    });
    if(direct)return true;
    return index>0 && !allTerms.some(t=>hasTerm(clause,t)) && /\b(sevgil[a-z]*|arkadas[a-z]*|esim|partner[a-z]*)\b/.test(clause) && toks.some(t=>NEG.test(t)) && terms.some(t=>hasTerm(clauses[index-1],t));
  });
}
/** Yerel yorum. Modelsiz de çalışır; model yalnız ekleyebilir, yereldeki koşulu silemez. */
export function parseQuery(query: string): Intent & { confident: boolean } {
  const full = fold(query);
  const i = emptyIntent();
  const sub = SUBAREAS.find((a) => [a.name, ...(a.aka ?? [])].some((n) => hasTerm(full, n)));
  if (sub) { i.area = sub.name; i.district = sub.district; }
  else { const d = DISTRICTS.find((x) => fold(x).length >= 4 && hasTerm(full, x)); if (d) { i.area = d; i.district = d; } }
  /* semt sözcüğü mutfak aramasına girmez: "Adalar" tek harf farkla "adana" sayılmasın */
  const areaWords = i.area ? fold(i.area).split(" ") : [];
  /* "Beyoğlu dışında", "Kadıköy olmasın": semt koşul değil, dışlamadır */
  if (i.area) { const ft = full.split(" "), at = ft.findIndex((t) => tokenHit(t, areaWords[areaWords.length - 1])); if (at >= 0 && NEG.test(ft[at + 1] ?? "")) { i.notArea = i.area; i.area = null; i.district = null; } }
  /* adı sorulan mekânın adındaki sözcük ayrıca mutfak koşulu olmaz: "Yeni Lokanta'da 6 kişi" esnaf araması değildir */
  const named = matchName(full), nameWords = named ? fold(named.name).split(" ") : [];
  const q = full.split(" ").filter((t) => !areaWords.some((w) => tokenHit(t, w)) && !nameWords.includes(t) && !nameWords.some((w) => w.length >= 4 && t.startsWith(w))).join(" ");
  i.wholeCity = !i.area && /\bistanbul/.test(q);
  const toks = q.split(" ");
  const negated = (terms:string[]) => foodNegated(query,terms);
  for (const c of CUISINES) if (c.terms.some((t) => hasTerm(q, t)) && negated(c.terms)) i.notCuisines.push(c.key);
  const dish = DISHES.find((d) => d.terms.some((t) => hasTerm(q, t)) && !negated(d.terms));
  if (dish) { i.dish = dish.key; i.cuisine = dish.cuisine; }
  else { const c = CUISINES.find((x) => !i.notCuisines.includes(x.key) && x.terms.some((t) => hasTerm(q, t))); if (c) i.cuisine = c.key; }
  if (foodNegated(query, RED_MEAT_TERMS)) i.notFoods = ["kirmizi-et"];
  if (["viski","whisky","whiskey"].some(t=>hasTerm(full,t)) && !foodNegated(query,["viski","whisky","whiskey"])) i.drinks = ["viski"];
  if (/\b(kutlama[a-z]*|yildonum[a-z]*|donum[a-z]*|dogum gun[a-z]*)\b/.test(full)) i.occasion="ozel-gun";
  i.attrs = ATTRS.filter((a) => a.terms.some((t) => hasTerm(q, t))).map((a) => a.key);
  const pm = q.match(/\b(\d{1,2}) kisi/) ?? q.match(/\bbiz (\d{1,2})\b/), pw = q.match(/\b(iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on) ?(kisi|kisiyiz)/);
  if (pm) i.party = Number(pm[1]); else if (pw) i.party = ["iki", "uc", "dort", "bes", "alti", "yedi", "sekiz", "dokuz", "on"].indexOf(pw[1]) + 2;
  const bm = q.match(/\b(\d{2,6}) ?(tl|lira|₺)/);
  if (bm) { i.budgetMax = Number(bm[1]); if (!i.attrs.includes("ekonomik")) i.attrs.push("ekonomik"); }
  /* Adı bir karşılaştırma noktası olarak kullanmak, o mekânı istemek değildir. Açık ilçe koşulu korunur. */
  if (named && !/\b(benzer(?:i|ini|ine)?|alternatif(?:i|ini|ine)?|yerine|gibi)\b/.test(q)) i.name = named.slug;
  return { ...i, confident: !!(i.area || i.cuisine || i.name) };
}

const REFINES = { cheaper: "Daha ekonomik", quieter: "Daha sakin", other_area: "Başka semtte", another: "Başka öner" } as const;
export type Refine = keyof typeof REFINES;

/** Yazılı takip sorusu: düğmeyle aynı sonucu verir. */
export function detectRefine(query: string): Refine | null {
  const q = fold(query);
  if (/\bbaska (semt|yer ?de|bir semt)/.test(q)) return "other_area";
  if (/\bdaha (ekonomik|ucuz|uygun|hesapli)/.test(q)) return "cheaper";
  if (/\bdaha (sakin|sessiz)/.test(q)) return "quieter";
  if (/\b(baska|farkli)( bir)?( (oner|yer|mekan|secenek|alternatif|olsun))?\b/.test(q) && q.split(" ").length <= 5) return "another";
  return null;
}

/** Dietary exclusions and a specified drink survive topic/area changes within this conversation. */
export function carryFoodPreferences(prev: Intent | null | undefined, next: Intent): Intent {
  const out = { ...next, notCuisines: [...new Set([...(prev?.notCuisines ?? []), ...next.notCuisines])].filter(c=>c!==next.cuisine), notFoods: [...new Set([...(prev?.notFoods ?? []), ...next.notFoods])], drinks: next.drinks.length ? [...next.drinks] : [...(prev?.drinks ?? [])], occasion: next.occasion ?? prev?.occasion ?? null };
  return out;
}

/** Takip sorusu: yeni istekte söylenmeyen alanlar önceki bağlamdan gelir. Semt ve mutfak birlikte yenilenirse yeni konudur. */
export function mergeIntent(prev: Intent | null | undefined, next: Intent, refine?: Refine | null): Intent {
  const fresh = !prev || (!refine && !!(next.area || next.areaText) && !!(next.cuisine || next.term)) || (!refine && !!next.name);
  const m: Intent = fresh ? { ...next } : { ...prev, attrs: [...new Set([...prev.attrs, ...next.attrs])], area: next.area ?? (next.areaText ? null : prev.area), district: next.area ? next.district : next.areaText ? null : prev.district, areaText: next.areaText ?? (next.area ? null : prev.areaText), cuisine: next.cuisine ?? (next.term ? null : prev.cuisine), term: next.term ?? (next.cuisine ? null : prev.term), dish: next.dish ?? (next.cuisine || next.term ? null : prev.dish), party: next.party ?? prev.party, name: null, wholeCity: next.wholeCity || prev.wholeCity, budgetMax: next.budgetMax ?? prev.budgetMax, notCuisines: [...new Set([...prev.notCuisines, ...next.notCuisines])], notArea: next.area ? null : next.notArea ?? prev.notArea ?? null };
  /* "kebap olmasın" önceki kebabı siler; "aslında kebap olsun" önceki olumsuzluğu kaldırır */
  if (!fresh) { if (next.cuisine) m.notCuisines = m.notCuisines.filter((c) => c !== next.cuisine); if (m.cuisine && next.notCuisines.includes(m.cuisine)) { m.cuisine = null; m.dish = null; } }
  if (refine === "cheaper" && !m.attrs.includes("ekonomik")) m.attrs = [...m.attrs, "ekonomik"];
  if (refine === "quieter" && !m.attrs.includes("sakin")) m.attrs = [...m.attrs, "sakin"];
  /* "başka semtte": önceki semt dışlanır (yalnız kaldırılmaz), ki aynı semtten öneri gelmesin */
  if (refine === "other_area") { if (prev?.area && !m.notArea) m.notArea = prev.area; m.area = null; m.district = null; m.areaText = null; }
  return carryFoodPreferences(prev,{...m,notFoods:next.notFoods,drinks:next.drinks,occasion:next.occasion});
}

const textOf = (v: Venue) => [v.description, ...v.notes, v.secki?.text].filter(Boolean).join(". ");
const distM = (a: Area, v: Venue) => { if (a.lat == null || v.lat == null || v.lng == null) return null; const dy = (v.lat - a.lat) * 111000, dx = (v.lng - a.lng!) * 111000 * Math.cos((a.lat * Math.PI) / 180); return Math.round(Math.hypot(dx, dy)); };
/* olumsuz cümle kanıt değildir: "teras yok", "çocuk kabul edilmiyor" */
const NEGATIVE = /\b(degil|yok|edilmez|edilmiyor|giremez|olmaz|bulunmuyor|sunulmuyor|dogrulanmadi|dogrulanmamis|belirsiz)\b/;
function evidenceOf(v: Venue, terms: string[]) {
  for (const s of textOf(v).split(/[.!?\n]+/)) { const f = fold(s); if (terms.some((t) => f.includes(fold(t))) && !NEGATIVE.test(f)) return s.trim().slice(0, 160); }
  return null;
}
/* Gece yarısından sonra kapanış (00:30–05:59) ya da 24 saat: kayıtlı açılış saatinden. */
export function lateHours(h: string | null) {
  if (!h) return false;
  if (/24\/7|00:00\s*-\s*24:00/.test(h)) return true;
  return [...h.matchAll(/-\s*(\d{1,2})[:.](\d{2})/g)].some(([, hh, mm]) => { const x = Number(hh), y = Number(mm); return (x === 0 && y >= 30) || (x >= 1 && x <= 5) || x === 24; });
}
function verified(v: Venue, a: { key: string; evidence: string[] }): string | null {
  if (a.key === "gec") return lateHours(v.hours) ? `açılış saati ${v.hours}` : null;
  const ev = evidenceOf(v, a.evidence);
  if (ev) return `"${ev}"`;
  if (a.key === "vejetaryen" && a.evidence.some((t) => fold(v.name).includes(t))) return `adı ${v.name}`;
  return null;
}
/* Sabit ama mekâna göre dağılan sıra: eşit adaylarda hep aynı mekân öne çıkmaz, aynı soru aynı sonucu verir. */
const tie = (seed: string, slug: string) => { let h = 2166136261; for (const c of seed + "|" + slug) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

export interface Candidate { slug: string; name: string; kind: string; district: string; address: string | null; href: string; facts: string[]; why: string[]; caveats: string[]; score: number; sourced: boolean; areaFit: "tam" | "yakin" | "ilce" | "yok" | null; dishHit: boolean }

const GENERIC_KINDS = new Set(["Restoran"]);
/* yalnız yemek adları: "Japon Erdal", "Adana Sofrası" gibi köken sözcükleri mutfak çelişkisi sayılmaz */
const NAME_DISH = ["burger", "pizza", "sushi", "doner", "kebap", "kebab", "lahmacun", "kofte", "manti", "steak", "biftek", "ramen", "waffle", "tantuni", "kumpir", "cigkofte"];
const SOSYAL = /\b(sosyal tesis|polis evi|orduevi|ordu evi|askeri gazino|belediyesi .*tesis|ogretmenevi|ogretmen evi)/;
/* kent lokantası herkese açık belediye lokantasıdır: sosyal tesis sayılmaz */
/* "uygun fiyat" ölçütü: fiyatı kayıtlı mekânların ortancası. Fiyatı bilinmesi ucuz olduğunu göstermez. */
const PRICES = VENUES.map((v) => v.priceMedian).filter((p): p is number => p != null).sort((a, b) => a - b);
export const PRICE_MID = PRICES.length ? PRICES[Math.floor(PRICES.length / 2)] : null;
const RED_MEAT_KINDS = new Set(["Steakhouse","Kebapçı / Ocakbaşı","Dönerci","Burger","Köfteci","Tantunici","Ciğerci","Kokoreççi","Izgara"]);
export function drinkEvidence(v: Venue): string | null {
  // Only an explicit positive source/menu statement, never a venue category or general alcohol tag.
  const rows=v.menu; // Genel içki grubu, fiyat araştırması veya belirsiz not servis kanıtı değildir.
  return rows.find(row=>/\b(viski|whisky|whiskey)\b/.test(fold(row))&&!NEGATIVE.test(fold(row))) ?? null;
}
export function allowedByPreferences(v: Venue, i: Intent): boolean {
  const name=fold(v.name);
  for(const key of i.notCuisines){
    const c=CUISINES.find(x=>x.key===key);
    if(c && (c.kinds.includes(v.kind) || ((key!=="esnaf"||GENERIC_KINDS.has(v.kind)) && [...c.terms,...(c.text??[])].some(t=>hasTerm(name,t))) || (c.text??[]).some(t=>v.menu.some(m=>hasTerm(fold(m),t)))))return false;
  }
  if(i.notFoods.includes("kirmizi-et") && (RED_MEAT_KINDS.has(v.kind)||/\b(steak[a-z]*|biftek[a-z]*|kebap[a-z]*|kebab[a-z]*|ocakbasi|doner[a-z]*|burger[a-z]*|kofte[a-z]*|ciger[a-z]*|kokorec[a-z]*|tantuni[a-z]*|etci[a-z]*|et (?:lokant|restoran|mangal)[a-z]*|nusr et)\b/.test(name)))return false;
  if(i.drinks.includes("viski")&&!drinkEvidence(v))return false;
  return true;
}
function scoreVenue(v: Venue, i: Intent): Candidate | null {
  if (!allowedByPreferences(v,i)) return null;
  if(i.drinks.length && i.attrs.some(key=>{const a=ATTRS.find(a=>a.key===key);return a&&!PROFILE_ONLY.has(key)&&key!=="ekonomik"&&!verified(v,a);}))return null;
  const name = fold(v.name), addr = fold(`${v.address ?? ""} ${v.neighborhood ?? ""}`), menu = fold(v.menu.join(" ")), hay = fold(`${textOf(v)} ${v.menu.join(" ")}`);
  const why: string[] = [], caveats: string[] = []; let s = 0;
  let areaFit: Candidate["areaFit"] = null, dishHit = false;
  const named = i.name === v.slug;
  if (named) { s += 200; why.push("Adını sorduğun mekân."); }
  if (!named && i.notArea) { const sub = SUBAREAS.find((a) => a.name === i.notArea); if (sub ? fold(`${v.address ?? ""} ${v.neighborhood ?? ""}`).includes(fold(sub.name)) || ((d) => d != null && d <= 900)(distM(sub, v)) : fold(v.district) === fold(i.notArea)) return null; }
  if (i.area) {
    const sub = SUBAREAS.find((a) => a.name === i.area), t = fold(i.area);
    if (sub) {
      const d = distM(sub, v);
      /* semt koşulu adres ya da konumla sağlanır; yazıda adının geçmesi orada olduğunu göstermez */
      if (addr.includes(t)) { areaFit = "tam"; s += 50; why.push(`Adresinde ${i.area} geçiyor.`); }
      else if (d != null && d <= 900 && v.district === sub.district) { areaFit = "yakin"; s += 50; why.push(`Konum kaydına göre ${i.area} merkezine yaklaşık ${Math.round(d / 50) * 50} m.`); }
      else if (v.district === sub.district) { areaFit = "ilce"; caveats.push(`${i.area} içinde olduğu doğrulanmadı; ilçesi ${v.district}.`); }
      else if (!named) return null;
    } else if (fold(v.district) === t) { areaFit = "tam"; s += 45; why.push(`Kayıtlı ilçesi: ${v.district}.`); }
    else if (!named) return null;
  }
  if (i.areaText) {
    if (addr.includes(fold(i.areaText))) { areaFit = "tam"; s += 50; why.push(`Adresinde ${i.areaText} geçiyor.`); }
    else if (!named) return null;
  }
  if (i.term) {
    const t = fold(i.term);
    if (fold(v.kind).includes(t) || name.includes(t)) { s += 40; why.push(`Türü ya da adı "${i.term}" ile eşleşiyor.`); }
    else if (hay.includes(t)) { s += 40; why.push(`Kaydında ${i.term} geçiyor.`); }
    else if (!named) return null;
  }
  if (i.dish) {
    const d = DISHES.find((x) => x.key === i.dish);
    if (d?.text.some((t) => hay.includes(t) || name.includes(t))) { s += 70; dishHit = true; why.push(`Kaynaklı kaydında ${d.label} geçiyor.`); }
  }
  if (i.cuisine) {
    const c = CUISINES.find((x) => x.key === i.cuisine);
    if (c) {
      /* adı başka bir mutfağı açıkça söyleyen kayıt (ör. kahvaltı isteğinde "Burger House"): tür etiketi tek başına yetmez;
         adında ya da menüsünde istenen mutfak yoksa önerilmez (adıyla sorulduysa gösterilir) */
      const nameOther = !named && !c.terms.some((t) => name.includes(fold(t))) && !(c.text ?? []).some((t) => menu.includes(fold(t)))
        && NAME_DISH.some((t) => t !== c.key && !c.terms.includes(t) && new RegExp(`\\b${t}`).test(name));
      if (nameOther) return null;
      if (c.kinds.includes(v.kind)) { s += 40; why.push(`Türü: ${v.kind}.`); }
      /* "lokanta" sözcüğü yalnız türü belirsiz kayıtta geçerli: Steakhouse, adında lokanta var diye esnaf lokantası olmaz */
      else if ((c.key !== "esnaf" || GENERIC_KINDS.has(v.kind)) && [...c.terms, ...(c.text ?? [])].some((t) => name.includes(fold(t)))) { s += 30; why.push(`Adında ${c.label} geçiyor.`); }
      else if ((c.text ?? []).some((t) => menu.includes(fold(t)))) { s += 28; why.push(`Menüsünde ${c.label} var.`); }
      else if (!named) return null;
    }
  }
  if (i.budgetMax && !named) {
    const p = v.priceMedian ?? null;
    if (p != null && p > i.budgetMax) return null;
    if (p != null) { s += 25; why.push(`Menüdeki orta fiyat yaklaşık ${p} TL.`); } else caveats.push("Fiyat bilgisi kayıtlı değil.");
  }
  if (!i.cuisine && !i.term && !named && i.attrs.includes("aksam") && CAFE_LIKE.includes(v.kind)) return null;
  if (!i.cuisine && !i.term && !named && CAFE_LIKE.includes(v.kind)) s -= 20;
  /* çocukla: bar, pub ve meyhane önerilmez */
  if (!named && i.attrs.includes("cocuk") && ["Bar", "Pub", "Meyhane"].includes(v.kind)) return null;
  for (const key of i.attrs) {
    const a = ATTRS.find((x) => x.key === key); if (!a || PROFILE_ONLY.has(key)) continue;
    const ev = verified(v, a);
    if (ev) { s += 30; why.push(`Kaydında ${a.label} için: ${ev}`); }
    else if (key === "ekonomik" && !i.budgetMax && v.priceMedian != null && PRICE_MID != null && v.priceMedian > PRICE_MID) { s -= 15; caveats.push(`Menüdeki orta fiyat yaklaşık ${v.priceMedian} TL; kayıtlı mekânların ortasının üstünde.`); }
    else if (key === "ekonomik" && !i.budgetMax && v.priceMedian != null) { s += 20 - Math.min(19, Math.floor(v.priceMedian / 100)); caveats.push(`Menüdeki orta fiyat yaklaşık ${v.priceMedian} TL; "uygun" yargısı sana kalmış.`); }
    else if (key === "ekonomik" && !i.budgetMax) caveats.push("Fiyat bilgisi kayıtlı değil.");
  }
  /* Kamu kurumu sosyal tesisi (polis evi, orduevi, belediye tesisi): kayıt gerçek ama herkese açık bir restoran önerisi gibi öne çıkmaz */
  if (!named && SOSYAL.test(name)) { s -= 35; caveats.push("Kamu kurumuna ait sosyal tesis; giriş koşulunu gitmeden kontrol et."); }
  if(i.drinks.includes("viski"))why.push(`Kaynaklı kaydında viski: ${drinkEvidence(v)}`);
  const sourced = !!(v.description || v.secki);
  /* Yazı ve profil sıralamaya puan katmaz: yalnız istekle ilgili olduğunda gerekçe olur */
  if (v.secki && (dishHit || named)) why.push(`Gidenler Seçkisi'nde yazısı var: "${v.secki.title}".`);
  const facts = [`Tür: ${v.kind}`, `İlçe: ${v.district}`, v.address ? `Adres: ${v.address}` : null, v.hours ? `Açılış saati: ${v.hours}` : null, v.description, ...v.notes.slice(0, 3), v.menu.length ? `Menüden: ${v.menu.slice(0, 15).join(", ")}` : null, v.secki ? `Seçki yazısı: ${v.secki.title}` : null].filter((x): x is string => !!x);
  if (!why.length) why.push(`${v.kind}, ${v.district}.`);
  return { slug: v.slug, name: v.name, kind: v.kind, district: v.district, address: v.address, href: `/mekan/${v.slug}/`, facts, why: why.slice(0, 3), caveats: caveats.slice(0, 2), score: s, sourced, areaFit, dishHit };
}

export function findCandidates(i: Intent, opts: { exclude?: string[]; limit?: number } = {}): Candidate[] {
  const ex = new Set(opts.exclude ?? []), seed = JSON.stringify([i.area, i.areaText, i.cuisine, i.dish, i.term, i.attrs]);
  return VENUES.filter((v) => !ex.has(v.slug)).map((v) => scoreVenue(v, i)).filter((c): c is Candidate => !!c)
    .sort((a, b) => b.score - a.score || tie(seed, a.slug) - tie(seed, b.slug)).slice(0, opts.limit ?? 12);
}

export interface Answered { items: Candidate[]; alternatives: Candidate[]; altLabel: string | null; note: string | null; question: string | null; relaxed: string | null }
const NONE: Omit<Answered, "note" | "question"> = { items: [], alternatives: [], altLabel: null, relaxed: null };
const up = (s: string) => s[0].toLocaleUpperCase("tr") + s.slice(1);

/** Zorunlu koşullar burada uygulanır. Koşulu sağlamayan mekân öneri olarak dönmez; ayrı ve açıkça etiketli "alternatif"tir. */
export function answer(i: Intent, opts: { exclude?: string[] } = {}): Answered {
  const label = i.dish ? DISHES.find((d) => d.key === i.dish)!.label : i.term ?? CUISINES.find((c) => c.key === i.cuisine)?.label;
  if(i.drinks.length && !findCandidates(i,{...opts,limit:1}).length)return {...NONE,note:"Bu kriterlerin tamamına uyan doğrulanmış mekân bulamadım. Bu koşulları sağlayan kayıtlarda viski servisini doğrulayamadım.",question:"İçecek tercihini koruyarak farklı bir semt veya mutfakla bakalım mı?"};
  const asked = i.attrs.filter((a) => !PROFILE_ONLY.has(a)).map((k) => ATTRS.find((a) => a.key === k)!).filter(Boolean);
  /* yalnız nitelik: dayanak yoksa tahmini liste yok, tek soru */
  if (!hasHardFilter(i)) {
    const verified = asked.length ? findCandidates(i, { ...opts, limit: 5 }).filter((c) => c.why.some((w) => w.startsWith("Kaydında "))) : [];
    if (verified.length) return { ...NONE, items: verified, note: null, question: "Semt ya da mutfak söylersen daraltayım." };
    if (i.attrs.includes("populer") && !asked.length) return { ...NONE, note: "Gidenler puanı ya da popülerlik sıralaması henüz yayımlanmadı; \"en iyi\" diye bir mekân seçemem.", question: "Semt ya da mutfak söylersen kayıtlı bilgilerle önereyim." };
    return { ...NONE, note: asked.length ? `${up(asked.map((a) => a.label).join(" ve "))} kayıtlarımızda doğrulanmış değil; bu yüzden doğrudan mekân önermiyorum.` : "Bu istekten semt, mutfak ya da mekân adı çıkaramadım.", question: "Hangi semt ya da hangi mutfak olsun?" };
  }
  if (i.name && !i.area && !i.cuisine) {
    const items=findCandidates(i,{...opts,limit:1});
    return {...NONE,items,note:items.length?null:"Bu kriterlerin tamamına uyan doğrulanmış mekân bulamadım.",question:null};
  }
  const all = findCandidates(i, { ...opts, limit: 40 });
  let pool = all.filter((c) => c.areaFit !== "ilce");
  let alternatives: Candidate[] = [], altLabel: string | null = null, relaxed: string | null = null, question: string | null = null;
  const notes: string[] = [];
  if (i.area && !pool.length && all.length) { alternatives = all.slice(0, 5); altLabel = `${i.district} ilçesinden; ${i.area} içinde olduğu doğrulanmadı`; relaxed = `${i.area} içinde doğrulanmış kayıtlı mekân bulamadım.`; question = `${i.district} geneli de olur mu?`; }
  if (i.dish && pool.length && !pool.some((c) => c.dishHit)) { alternatives = pool.slice(0, 5); altLabel = `Aynı türden; ${label} geçtiği doğrulanmadı`; relaxed = `Kayıtlarımızda ${label} geçen mekân bulamadım.`; pool = []; }
  else if (i.dish) pool = pool.filter((c) => c.dishHit);
  if (i.budgetMax) {
    const known = pool.filter((c) => !c.caveats.includes("Fiyat bilgisi kayıtlı değil."));
    if (!known.length && pool.length) { alternatives = pool.slice(0, 5); altLabel = "Fiyatı kayıtlı değil; bütçene uyduğu doğrulanmadı"; relaxed = `${i.budgetMax} TL altında fiyatı doğrulanmış mekân bulamadım.`; pool = []; }
    else pool = known;
  }
  if (!pool.length && !all.length && opts.exclude?.length && findCandidates(i, { limit: 1 }).length) return { ...NONE, note: "Bu koşullarda gösterilmemiş başka kayıtlı mekân kalmadı.", question: "Başka semt ya da mutfak deneyelim mi?" };
  if (!pool.length && !all.length) {
    const wide = (i.area || i.areaText) && (i.cuisine || i.term) ? findCandidates({ ...i, area: null, district: null, areaText: null }, { ...opts, limit: 5 }) : [];
    const where = i.area ?? i.areaText;
    relaxed = where && label ? `${where} için kayıtlı ${label} mekânı bulamadım.` : where ? `${where} için kayıtlı mekân bulamadım.` : `${up(label ?? "Bu istek")} için kayıtlı mekân bulamadım.`;
    if (wide.length) { alternatives = wide; altLabel = `İstanbul'un başka semtlerinden ${label}; ${where} değil`; question = "Başka semt de olur mu?"; }
  }
  /* uygun fiyat isteğinde fiyatı kayıtlı mekânların ortasının üstündeki mekân öneri olmaz; ayrı ve etiketli kalır */
  if (i.attrs.includes("ekonomik") && !i.budgetMax && PRICE_MID != null) {
    const pricey = pool.filter((c) => { const p = VENUES.find((v) => v.slug === c.slug)!.priceMedian; return p != null && p > PRICE_MID; });
    if (pricey.length && pricey.length < pool.length) { pool = pool.filter((c) => !pricey.includes(c)); if (!alternatives.length) { alternatives = pricey.slice(0, 3); altLabel = "Fiyatı kayıtlı mekânların ortasının üstünde; uygun fiyat isteğine uymuyor"; } }
  }
  const unverified = asked.filter((a) => a.key !== "ekonomik" && !pool.some((c) => verified(VENUES.find((v) => v.slug === c.slug)!, a)));
  for (const a of asked.filter((x) => x.key !== "ekonomik" && !unverified.includes(x))) {
    const yes = pool.filter((c) => verified(VENUES.find((v) => v.slug === c.slug)!, a));
    if (yes.length < Math.min(pool.length, 5)) notes.push(`${up(a.label)} yalnız ${yes.slice(0, 3).map((c) => c.name).join(", ")} kaydında geçiyor; diğerlerinde doğrulanmadı.`);
  }
  /* kamu kurumu sosyal tesisi tek başına kaldıysa ana öneri olmaz: uyarısıyla etiketli alternatif */
  if (pool.length && pool.every((c) => SOSYAL.test(fold(c.name))) && !i.name) {
    if (!alternatives.length) { alternatives = pool.slice(0, 3); altLabel = "Kamu kurumuna ait sosyal tesis; herkese açık olmayabilir, giriş koşulunu gitmeden kontrol et"; }
    relaxed = relaxed ?? `${i.area ?? i.areaText ?? "Bu istek"} için herkese açık kayıtlı ${label ?? "mekân"} bulamadım.`;
    pool = [];
  }
  if (i.attrs.includes("populer")) notes.push("Gidenler puanı ya da popülerlik sıralaması henüz yayımlanmadı; seçimi kayıtlı bilgilere göre yaptım, sıralama bir beğeni ölçüsü değil.");
  if (pool.length && (i.party ?? 0) >= 5) notes.push(`${i.party} kişilik grup için yer ve rezervasyon durumu kayıtlarımızda yok; gitmeden mekânı aramanı öneririm.`);
  if (pool.length && unverified.length) notes.push(`${up(unverified.map((a) => a.label).join(" ve "))} kayıtlarımızla doğrulanamadı; bu niteliğe göre eleme yapmadım.`);
  if (pool.length && i.attrs.includes("ekonomik") && !i.budgetMax && !pool.some((c) => evidenceOf(VENUES.find((v) => v.slug === c.slug)!, ATTRS.find((a) => a.key === "ekonomik")!.evidence))) notes.push("Uygun fiyat yargısı kayıtlarımızda yok; fiyatı kayıtlı olanlarda ucuzdan pahalıya sıraladım; kayıtlı mekânların ortasının üstündekileri geriye aldım.");
  return { items: pool.slice(0, 12), alternatives, altLabel, note: notes.join(" ") || null, question, relaxed };
}
export const REFINE_LABELS = REFINES;
