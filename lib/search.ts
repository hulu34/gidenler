import { entities } from "@/data/entities";
import { users } from "@/data/users";
import { lists } from "@/data/lists";
import { blurbs } from "@/data/blurbs";
import { ambientSignals } from "@/data/taste";
import { slugify } from "@/data/universe";
import { getTopicIntelligence, listCards, type EntityCard } from "@/lib/api";
import { score1 } from "@/lib/format";
import type { CuratedList, User } from "@/lib/types";

/* ──────────────────────────────────────────────────────────────────────────
   ARAMA MOTORU (v3) — "Ne arıyorum?"
   Sorgu → normalizasyon (Türkçe katlama, -ci/-cı ekleri, yazım toleransı) → niyet
   sınıflandırma (yemek / kategori / konum / nitelik) → alan ağırlıklı metin alakası
   (KAPI) × konum × kalite × güven × trend. "pide" ile "döner" farklı sonuç verir;
   genel popülerlik bir sushi restoranını pide sorgusuna sokamaz.
   Karar motoru (lib/decisionEngine.ts) adaylarını buradan alır; kendi kafasına göre ad seçmez.
   ────────────────────────────────────────────────────────────────────────── */

/* ───── 1 · sözlükler (tek kaynak) ───── */

/** Alt tür → yemek/ürün etiketleri (dishTags). Kayıt kendi `tags` alanıyla genişler. */
export const DISH_BY_SUB: Record<string, string[]> = {
  "Lokanta": ["ev yemeği", "sulu yemek", "kuru fasulye", "öğle yemeği", "esnaf lokantası", "tencere yemeği"],
  "Restoran": ["akşam yemeği", "restoran"],
  "Kebapçı / Ocakbaşı": ["kebap", "adana", "urfa", "ocakbaşı", "dürüm", "lahmacun", "et", "şiş"],
  "Meyhane": ["meze", "rakı", "balık", "meyhane", "rakı balık"],
  "Balık restoranı": ["balık", "levrek", "çupra", "deniz ürünleri", "meze", "kalamar"],
  "Steakhouse": ["steak", "et", "biftek", "dry age", "antrikot"],
  "Fine dining": ["tadım menüsü", "şef", "fine dining", "degustasyon"],
  "Sushi / Japon": ["sushi", "sashimi", "omakase", "japon", "nigiri", "maki", "sake"],
  "Ramen": ["ramen", "tonkotsu", "japon", "noodle", "gyoza"],
  "Pizza": ["pizza", "napoli", "margherita", "italyan", "odun fırını"],
  "Burger": ["burger", "hamburger", "smash", "cheeseburger", "patates"],
  "Kahvaltı": ["kahvaltı", "serpme", "menemen", "brunch", "simit", "boyoz", "katmer"],
  "Tatlıcı": ["tatlı", "baklava", "künefe", "sütlaç", "katmer", "kazandibi"],
  "Pideci": ["pide", "kıymalı pide", "kaşarlı pide", "kuşbaşılı pide", "karadeniz", "lahmacun", "ayran"],
  "Dönerci": ["döner", "et döner", "tavuk döner", "dürüm", "iskender", "porsiyon döner", "ayran"],
  "Mantıcı": ["mantı", "kayseri mantısı", "yoğurtlu", "ev yapımı", "hamur işi"],
  "Pastane": ["pasta", "kurabiye", "kruvasan", "tatlı", "kek", "profiterol"],
  "Kahveci": ["kahve", "filtre kahve", "espresso", "latte", "flat white", "third wave", "cortado", "çalışma"],
  "Fırın": ["ekmek", "ekşi maya", "simit", "poğaça", "kruvasan", "fırın"],
  "Kokteyl bar": ["kokteyl", "bar", "gece", "içki", "negroni"],
  "Pub": ["bira", "pub", "maç", "bar", "craft"],
  "Otel": ["otel", "konaklama", "oda"],
  "Butik otel": ["otel", "butik otel", "konaklama", "oda"],
  "Resort": ["otel", "resort", "havuz", "tatil", "deniz"],
  "Sahil": ["sahil", "deniz", "yürüyüş", "gün batımı"],
  "Park / Koru": ["park", "koru", "piknik", "koşu", "yürüyüş"],
  "Cadde": ["cadde", "alışveriş", "yürüyüş"],
  "Meydan": ["meydan", "buluşma"],
  "Pazar": ["pazar", "organik", "semt pazarı"],
  "AVM": ["avm", "alışveriş", "sinema"],
  "Müze": ["müze", "koleksiyon", "sergi"],
  "Galeri": ["galeri", "sergi", "çağdaş sanat", "sanat"],
  "Tarihi mekân": ["tarihi", "tarih", "mimari", "saray", "kule"],
  "Sinema": ["sinema", "film", "salon"],
  "Tiyatro sahnesi": ["tiyatro", "sahne", "oyun"],
  "Konser mekânı": ["konser", "canlı müzik", "sahne"],
  "Stadyum": ["stadyum", "maç", "tribün"],
  "Tiyatro oyunu": ["tiyatro", "oyun", "sahne"],
  "Konser": ["konser", "canlı müzik", "caz", "senfonik"],
  "Festival": ["festival", "açık hava", "müzik"],
  "Sergi": ["sergi", "fotoğraf", "resim", "sanat"],
  "Film": ["film", "sinema", "izle", "dram", "komedi", "belgesel"],
  "Şehir": ["şehir", "gezi", "hafta sonu"],
  "Destinasyon": ["tatil", "koy", "gezi", "kaçamak"],
  "Plaj": ["plaj", "deniz", "yaz", "koy"],
  "Rota": ["rota", "yürüyüş", "trekking", "bisiklet"],
  "Kuaför": ["kuaför", "saç", "randevu"],
  "Berber": ["berber", "tıraş", "sakal"],
  "Spor salonu": ["spor", "fitness", "pilates", "gym"],
  "Spa / Hamam": ["spa", "hamam", "masaj"],
  "Coworking": ["cowork", "coworking", "çalışma", "ofis", "toplantı odası"],
  "Hekim": ["doktor", "hekim", "muayene"],
  "Diş hekimi": ["diş", "dişçi", "diş hekimi"],
  "Avukat": ["avukat", "hukuk", "dava"],
};

/** Mutfak: sorgu "japon" / "italyan" derse. */
const CUISINE_BY_SUB: Record<string, string> = { "Sushi / Japon": "japon", "Ramen": "japon", "Pizza": "italyan", "Steakhouse": "et", "Kebapçı / Ocakbaşı": "türk", "Lokanta": "türk", "Pideci": "türk", "Dönerci": "türk", "Mantıcı": "türk", "Meyhane": "türk", "Kahvaltı": "türk", "Tatlıcı": "türk" };

/** Kategori anahtar kelimeleri (topic keywords). */
const CAT_KEYWORDS: Record<string, string[]> = {
  "cat.restaurant": ["restoran", "yemek", "akşam yemeği", "lokanta", "yeme içme", "mekan"],
  "cat.cafe": ["kafe", "cafe", "kahve", "kahveci", "pastane", "fırın"],
  "cat.hotel": ["otel", "hotel", "konaklama", "kalacak yer"],
  "cat.bar": ["bar", "içki", "gece", "kokteyl", "bira"],
  "cat.culture": ["müze", "galeri", "sergi", "kültür", "sanat"],
  "cat.show": ["etkinlik", "konser", "tiyatro", "oyun", "festival", "sergi", "sahne"],
  "cat.venue": ["salon", "sinema", "sahne", "stadyum", "konser"],
  "cat.place": ["park", "sahil", "cadde", "meydan", "pazar", "avm", "yürüyüş"],
  "cat.travel": ["gezi", "tatil", "şehir", "plaj", "rota", "kaçamak", "hafta sonu"],
  "cat.film": ["film", "sinema", "izle"],
  "cat.service": ["kuaför", "berber", "spor", "spa", "hamam", "cowork", "hizmet"],
  "cat.physician": ["doktor", "hekim", "muayene"],
  "cat.dentist": ["diş", "dişçi", "diş hekimi"],
  "cat.lawyer": ["avukat", "hukuk", "dava"],
};

/** Nitelik kelimeleri — metin değil, yapısal sinyal olarak eşleşir. */
const QUALIFIERS: Array<[RegExp, Qualifier]> = [
  [/^(en iyi|iyi|guzel|kaliteli|lezzetli|efsane|super)$/, "quality"],
  [/^(ucuz|hesapli|uygun|butce|ekonomik|f\/p|fp|fiyat)$/, "value"],
  [/^(sakin|sessiz|huzurlu|gurultusuz|dingin)$/, "quiet"],
  [/^(hizli|ayakustu|pratik|cabuk)$/, "fast"],
  [/^(romantik|date|flort)$/, "date"],
  [/^(canli|eglenceli|hareketli|kalabalik)$/, "lively"],
  [/^(manzara|manzarali|deniz manzarasi|bogaz manzarasi)$/, "view"],
  [/^(yeni|yukselen|trend)$/, "rising"],
  [/^(dogrulanmis|guvenilir)$/, "verified"],
  [/^(ge[cç]|gece)$/, "late"],
  [/^(calisilir|calisma|laptop)$/, "work"],
];
export type Qualifier = "quality" | "value" | "quiet" | "fast" | "date" | "lively" | "view" | "rising" | "verified" | "late" | "work";

/** Atılan kelimeler — sorguya bilgi katmaz. */
const STOP = new Set(["ve", "ile", "icin", "bir", "bu", "su", "o", "da", "de", "ta", "te", "dan", "den", "tan", "ten", "nin", "nun", "mi", "mu", "ne", "nerede", "nereye", "yer", "mekan", "bul", "oner", "istiyorum", "istiyoruz", "istiyor", "lazim", "olsun", "olan", "en", "cok", "biraz", "yakin", "yakinda", "civari", "civarinda", "tarafinda", "tarafi", "taraf", "bugun", "yarin", "aksam", "aksami", "ogle", "oglen", "sabah", "gece", "saat", "saatte", "kisi", "kisilik", "kisiyiz", "yemek", "yemege", "yemegi", "yemekleri", "yiyelim", "yemeye", "gitmek", "gidelim", "gidecegiz", "arayan", "ariyorum", "ariyoruz", "var", "yok", "ama", "hem", "gibi", "bana", "sana", "bize", "bize", "bir", "seyler", "bir", "lutfen", "oner", "onerir", "misin", "hangisi", "nereye", "gidebiliriz", "gitsek", "pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "hafta", "sonu", "haftasonu", "bugun", "yarin", "iyi", "guzel"]);

/* ───── 2 · normalizasyon ───── */

/** Türkçe katlama: küçük harf, aksan/İ-ı düzleştirme, noktalama temizliği. */
export const fold = (s: string) => slugify(s.toLocaleLowerCase("tr")).replace(/-/g, " ").trim();

/**
 * Gövdeleme (katlanmış metin üzerinde): "donerci" → "doner", "pideci" → "pide", "kahvecisi" → "kahve",
 * "sushici" → "sushi", "kadikoyde" → "kadikoy", "lokantasi" → "lokanta". Sözlük varsa sözlükteki en uzun gövde seçilir;
 * yoksa yalnızca -ci/-ler ekleri atılır (kör kesme "moda" → "mo" gibi hatalar üretmez).
 */
export function stem(w: string, V?: Map<string, unknown>): string {
  const cands: string[] = [];
  const push = (x: string) => { if (x.length >= 3 && !cands.includes(x)) cands.push(x); };
  push(w);
  let m: RegExpMatchArray | null;
  if ((m = w.match(/^(.+?)(ci|cu)(si|su|ler|lar|leri|lari|de|da|den|dan|ye|ya)?$/))) push(m[1]);
  if ((m = w.match(/^(.+?)(si|su|leri|lari|ler|lar|de|da|te|ta|den|dan|ten|tan|ye|ya|nin|nun|in|un|deki|daki)$/))) push(m[1]);
  if ((m = w.match(/^(.+?)(ci|cu)(si|su)?(ler|lar)?(de|da|den|dan)$/))) push(m[1]);
  if (V) { const hit = cands.find((c) => V.has(c)); if (hit) return hit; }
  /* sözlükte yoksa: -ci eki kesin bir meslek/mekân ekidir, at; -ler/-lar çoğulunu at */
  const ci = w.match(/^(.{3,}?)(ci|cu)(si|su)?(ler|lar)?$/); if (ci) return ci[1];
  const pl = w.match(/^(.{3,}?)(ler|lar)$/); if (pl) return pl[1];
  return w;
}

function damerau(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) d[i][0] = i;
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}

/* ───── 3 · dizin ───── */

export interface SearchDoc {
  card: EntityCard;
  name: string; nameWords: string[]; aliases: string[];
  category: string[]; subcategory: string; entityType: string; cuisine: string;
  dishTags: string[]; menuTags: string[]; themes: string[]; description: string;
  district: string; city: string; neighborhood: string;
  expertiseTags: string[]; listMembership: string[]; keywords: string[];
  /** Nitelik sinyalleri (yapısal): sessizlik 1–10, hız 1–10, fiyat 1–4, F/P boyutu, doğrulanma. */
  quiet: number; speed: number; price: number; value: number | null; verifiedRatio: number;
}

let DOCS: SearchDoc[] | null = null;
let VOCAB: Map<string, "dish" | "loc" | "cat"> | null = null;
/** Katlanmış kelime → görünen biçim ("kadikoy" → "Kadıköy", "doner" → "döner"). */
const DISPLAY = new Map<string, string>();
export const display = (t: string) => DISPLAY.get(t) ?? t;

function buildDocs(): SearchDoc[] {
  const listByEntity = new Map<string, string[]>();
  for (const l of lists) for (const id of l.entityIds) listByEntity.set(id, [...(listByEntity.get(id) ?? []), l.title]);
  const expertiseByFacet = new Map<string, string[]>();
  for (const u of users) for (const x of u.expertise) if (x.scope === "facet" || x.scope === "category") expertiseByFacet.set(fold(x.label), [...(expertiseByFacet.get(fold(x.label)) ?? []), `@${u.handle}`]);

  return listCards().map((card) => {
    const e = card.entity; const sub = e.subcategory ?? card.category.label;
    const it = getTopicIntelligence(e.id);
    const dishTags = [...new Set([...(DISH_BY_SUB[sub] ?? []), ...(e.tags ?? []), ...(e.facets ?? [])].map(fold))];
    const themes = [...(it?.positiveThemes ?? []), ...(it?.negativeThemes ?? [])].map((t) => fold(t.label));
    const nameWords = fold(e.name).split(" ").filter(Boolean);
    /* takma adlar: son ek (Lokantası, Kahve, Pide…) atılmış ad, parantezsiz ad */
    const aliases = [...new Set([nameWords.slice(0, -1).join(" "), fold(e.name.replace(/\(.*\)/, "")), nameWords.map((w) => stem(w)).join(" ")].filter((a) => a && a !== fold(e.name)))];
    const value = it?.ratingDimensions.find((d) => d.key === "value")?.value ?? null;
    const amb = ambientSignals[e.id] ?? { quiet: 5, speed: 5 };
    return {
      card, name: fold(e.name), nameWords, aliases,
      category: (CAT_KEYWORDS[e.categoryId] ?? []).map(fold), subcategory: fold(sub), entityType: fold(card.category.label), cuisine: CUISINE_BY_SUB[sub] ?? "",
      dishTags, menuTags: (e.tags ?? []).map(fold), themes, description: fold(blurbs[e.id] ?? ""),
      district: fold(e.location?.district ?? ""), city: fold(e.location?.city ?? ""), neighborhood: fold(e.location?.neighborhood ?? ""),
      expertiseTags: [...new Set((e.facets ?? []).flatMap((f) => expertiseByFacet.get(fold(f)) ?? []))],
      listMembership: (listByEntity.get(e.id) ?? []).map(fold), keywords: [...new Set([...(CAT_KEYWORDS[e.categoryId] ?? []), sub, card.category.label].map(fold))],
      quiet: amb.quiet, speed: amb.speed, price: e.priceLevel ?? 0, value, verifiedRatio: it?.verifiedRatio ?? 0,
    };
  });
}
export const searchDocs = () => (DOCS ??= buildDocs());

function vocab(): Map<string, "dish" | "loc" | "cat"> {
  if (VOCAB) return VOCAB;
  VOCAB = new Map();
  const add = (orig: string, kind: "dish" | "loc" | "cat") => {
    const ws = orig.split(/\s+/).filter(Boolean);
    for (const w of ws) { const t = fold(w); if (t.length >= 3 && !VOCAB!.has(t)) { VOCAB!.set(t, kind); DISPLAY.set(t, w.toLocaleLowerCase("tr") === w ? w : w); } }
  };
  for (const d of searchDocs()) { const l = d.card.entity.location; for (const w of [l?.district, l?.city, l?.neighborhood]) if (w) add(w, "loc"); }
  for (const xs of Object.values(DISH_BY_SUB)) for (const x of xs) add(x, "dish");
  for (const xs of Object.values(CAT_KEYWORDS)) for (const x of xs) add(x, "cat");
  return VOCAB;
}

/* ───── 4 · sorgu ayrıştırma ───── */

export interface ParsedQuery {
  raw: string;
  /** İçerik (yemek / kategori / ad) kelimeleri — alaka KAPISI. */
  content: string[];
  /** Konum kelimeleri. */
  locations: string[];
  qualifiers: Qualifier[];
  /** Yazım düzeltmeleri: girilen → anlaşılan. */
  corrections: Array<[string, string]>;
  /** Anlaşılan özet (UI). */
  understood: string[];
}

export function parseQuery(raw: string): ParsedQuery {
  const V = vocab();
  const words = fold(raw.replace(/@/g, "").replace(/f\s*\/\s*p/gi, " fp ")).split(" ").filter((w) => w.length >= 2);
  const q: ParsedQuery = { raw, content: [], locations: [], qualifiers: [], corrections: [], understood: [] };
  const seen = new Set<string>();
  /* iki kelimelik nitelikler ("en iyi", "deniz manzarası") */
  const joined = words.join(" ");
  for (const [re, k] of QUALIFIERS) { const m = re.source.replace(/^\^\(|\)\$$/g, "").split("|").filter((x) => x.includes(" ")); for (const ph of m) if (joined.includes(ph) && !q.qualifiers.includes(k)) q.qualifiers.push(k); }
  for (let w of words) {
    if (/^\d+$/.test(w) || /^\d{1,2}[.:]\d{2}$/.test(w)) continue;
    const qual = QUALIFIERS.find(([re]) => re.test(w))?.[1];
    if (qual) { if (!q.qualifiers.includes(qual)) q.qualifiers.push(qual); continue; }
    if (STOP.has(w)) continue;
    let s = stem(w, V);
    let kind = V.get(s);
    if (!kind && s.length >= 4) {
      /* hafif yazım toleransı: sözlükte 1 (≥8 harfte 2) düzenleme uzaklığında tek aday */
      const max = s.length >= 8 ? 2 : 1; let best: [string, number] | null = null;
      for (const [t] of V) { const dd = damerau(s, t, max); if (dd <= max && (!best || dd < best[1])) best = [t, dd]; }
      if (best) { q.corrections.push([w, best[0]]); s = best[0]; kind = V.get(s); }
    }
    if (seen.has(s)) continue; seen.add(s);
    if (kind === "loc") q.locations.push(s); else q.content.push(s);
  }
  q.understood = [...q.content.map(display), ...q.locations.map(display), ...q.qualifiers.map(qualifierLabel)];
  return q;
}

export const qualifierLabel = (k: Qualifier) => ({ quality: "iyi", value: "F/P", quiet: "sakin", fast: "hızlı", date: "romantik", lively: "canlı", view: "manzara", rising: "yükselen", verified: "doğrulanmış", late: "geç saat", work: "çalışılır" }[k]);

/* ───── 5 · sıralama ───── */

export interface SearchHit {
  card: EntityCard;
  /** Nihai sıralama puanı. */
  score: number;
  /** Metin alakası (0 = içerik eşleşmedi). */
  text: number;
  /** Konum eşleşti mi (sorgu konum istiyorsa). */
  loc: "district" | "neighborhood" | "city" | "none" | "n/a";
  /** Neden bu sonuç — kısa, veriye dayalı, anahtar kelime yığını değil. */
  reason: string;
  /** Tam eşleşme mi, yakın öneri mi. */
  tier: "exact" | "adjacent";
  matched: string[];
}

export interface SearchOutput {
  query: ParsedQuery;
  exact: SearchHit[];
  adjacent: SearchHit[];
  creators: User[];
  lists: Array<CuratedList & { author: User }>;
}

const has = (arr: string[], t: string) => arr.some((a) => a === t || a.split(" ").includes(t));
const hasPhrase = (arr: string[], t: string) => arr.some((a) => a.includes(t));

function textRelevance(d: SearchDoc, content: string[]): { score: number; matched: string[]; strong: boolean } {
  const V = vocab();
  let score = 0; const matched: string[] = []; let strong = false;
  for (const t of content) {
    let best = 0; let label = "";
    const nameHit = d.nameWords.some((w) => w === t || (t.length >= 4 && w.startsWith(t)) || stem(w) === t);
    const isDish = V.get(t) === "dish";
    /* ad eşleşmesi: özel ad ("Sakura") güçlü; yemek adı ("pide") ad içinde geçiyorsa etiketle aynı ağırlık — ad tabelası kaliteyi geçmez */
    if (nameHit) { best = Math.max(best, isDish ? 3 : d.nameWords[0] === t || stem(d.nameWords[0]) === t ? 4 : 3.4); label = isDish ? "etiket" : "ad"; }
    if (d.aliases.some((a) => a.split(" ").includes(t))) { best = Math.max(best, 2.8); label ||= "ad"; }
    if (has(d.dishTags, t) || d.dishTags.some((x) => stem(x) === t)) { best = Math.max(best, 3); label = label || "etiket"; }
    else if (hasPhrase(d.dishTags, t) && t.length >= 4) { best = Math.max(best, 1.8); label ||= "etiket"; }
    if (d.subcategory === t || d.subcategory.split(" ").includes(t) || stem(d.subcategory.split(" ")[0]) === t) { best = Math.max(best, 2.6); label ||= "tür"; }
    if (d.cuisine === t) { best = Math.max(best, 2.2); label ||= "mutfak"; }
    if (has(d.category, t) || d.entityType.split(" ").includes(t)) { best = Math.max(best, 1.4); label ||= "kategori"; }
    if (has(d.themes, t)) { best = Math.max(best, 1.1); label ||= "tema"; }
    if (d.listMembership.some((l) => l.includes(t))) { best = Math.max(best, 0.9); label ||= "liste"; }
    if (d.expertiseTags.some((x) => fold(x).includes(t))) { best = Math.max(best, 0.6); label ||= "uzman"; }
    if (d.description.split(" ").some((w) => w === t || stem(w) === t)) { best = Math.max(best, 0.7); label ||= "açıklama"; }
    if (best > 0) { score += best; matched.push(`${t}:${label}`); if (best >= 2.2) strong = true; }
  }
  /* birden fazla içerik kelimesi: hepsi eşleşirse bonus, hiçbiri güçlü değilse zayıf */
  if (content.length > 1 && matched.length === content.length) score *= 1.2;
  return { score, matched, strong };
}

function locMatch(d: SearchDoc, locations: string[]): SearchHit["loc"] {
  if (!locations.length) return "n/a";
  for (const l of locations) {
    if (d.district.split(" ").includes(l) || d.district === l) return "district";
    if (d.neighborhood.split(" ").includes(l) || d.neighborhood === l) return "neighborhood";
  }
  for (const l of locations) if (d.city.split(" ").includes(l) || d.city === l) return "city";
  return "none";
}

/** Sıralama: metin alakası (kapı) × konum × kalite × güven × trend × nitelikler. */
export function rankDoc(d: SearchDoc, q: ParsedQuery): SearchHit | null {
  const { card } = d;
  const tr = textRelevance(d, q.content);
  const loc = locMatch(d, q.locations);
  if (q.content.length && tr.score === 0) return null;                          /* içerik kapısı */
  if (!q.content.length && q.locations.length && loc === "none") return null;   /* yalnızca konum sorgusu: konum şart */

  const locF = loc === "district" || loc === "neighborhood" ? 1.6 : loc === "city" ? 1.0 : loc === "none" ? 0.45 : 1;
  const score = card.score ?? (card.category.compliance.showScores ? 6 : 7);
  const qualityF = 0.6 + 0.4 * (score / 10);
  const confF = card.confidence === "high" ? 1 : card.confidence === "medium" ? 0.95 : card.confidence === "low" ? 0.85 : 0.9;
  const trendF = 1 + Math.max(-0.5, Math.min(0.5, card.delta90d)) * 0.12;
  const richF = card.entity.tier === "A" ? 1.15 : card.entity.tier === "B" ? 1.05 : 1;
  /* konum söylenmediyse ev sahibi şehir önce: İstanbul-first (sert filtre değil, yumuşak tercih) */
  const homeF = !q.locations.length && (card.entity.location?.city ?? "İstanbul") === "İstanbul" ? 1.12 : 1;
  let qualF = 1;
  for (const k of q.qualifiers) {
    if (k === "quality") qualF *= 0.5 + 0.5 * (score / 10) * (card.confidence === "low" ? 0.8 : 1);
    if (k === "value") qualF *= d.value !== null ? 0.4 + 0.6 * (d.value / 10) : d.price && d.price <= 2 ? 1 : 0.75;
    if (k === "quiet") qualF *= 0.4 + 0.6 * (d.quiet / 10);
    if (k === "lively") qualF *= 0.4 + 0.6 * ((10 - d.quiet) / 10);
    if (k === "fast") qualF *= 0.4 + 0.6 * (d.speed / 10);
    if (k === "date") qualF *= 0.5 + 0.5 * (d.quiet / 10);
    if (k === "view") qualF *= d.themes.includes("manzara") || (card.entity.facets ?? []).includes("Manzara") ? 1.4 : 0.8;
    if (k === "rising") qualF *= card.delta90d >= 0.3 ? 1.5 : 0.7;
    if (k === "verified") qualF *= 0.5 + 0.5 * d.verifiedRatio;
    if (k === "work") qualF *= d.dishTags.includes("calisma") || d.dishTags.includes("calisilir") || d.themes.includes("calisma ortami") ? 1.4 : 0.8;
    if (k === "late") qualF *= /0[0-2]\.\d\d$/.test(card.entity.hours ?? "") ? 1.3 : 0.9;
  }
  const base = q.content.length ? tr.score : 2;
  const total = base * locF * qualityF * confF * trendF * richF * homeF * qualF;
  const exact = (q.content.length ? tr.strong : true) && (loc !== "none");
  return { card, score: total, text: tr.score, loc, reason: "", tier: exact ? "exact" : "adjacent", matched: tr.matched };
}

/** Kısa alaka nedeni — anahtar kelime yığını yok; eşleşen alan + tek kanıt. */
function reasonFor(h: SearchHit, q: ParsedQuery, d: SearchDoc): string {
  const parts: string[] = [];
  const it = getTopicIntelligence(h.card.entity.id);
  const dish = h.matched.find((m) => /:(etiket|tür|mutfak)$/.test(m));
  const byName = h.matched.find((m) => /:ad$/.test(m));
  if (dish) {
    const t = dish.split(":")[0];
    const theme = it?.positiveThemes.find((x) => fold(x.label).includes(t));
    parts.push(theme ? `${theme.label} konusunda ${theme.count} olumlu deneyim` : `${h.card.entity.subcategory ?? h.card.category.label} · ${h.card.experienceCount} deneyim`);
  } else if (byName) parts.push("Ad eşleşmesi");
  else if (h.matched.some((m) => /:kategori$/.test(m))) parts.push(`${h.card.category.label} kategorisi`);
  else if (h.matched.some((m) => /:tema$/.test(m))) parts.push(`Deneyimlerde "${h.matched.find((m) => /:tema$/.test(m))!.split(":")[0]}" geçiyor`);
  else if (h.matched.some((m) => /:liste$/.test(m))) parts.push("Bir kürasyon listesinde");
  if (h.loc === "district" || h.loc === "neighborhood") parts.push(h.card.entity.location?.district ?? "");
  else if (h.loc === "none" && q.locations.length) parts.push(`${display(q.locations[0])} dışında · ${h.card.entity.location?.district ?? h.card.entity.location?.city ?? ""}`);
  for (const k of q.qualifiers) {
    if (k === "value" && d.value !== null) parts.push(`F/P ${score1(d.value)}`);
    if (k === "quiet") parts.push(d.quiet >= 7 ? "sessizlik deneyimlerde güçlü" : d.quiet <= 4 ? "gürültü şikâyeti var" : "sessizlik karışık");
    if (k === "fast") parts.push(d.speed >= 7 ? "hızlı servis" : "tempo orta");
    if (k === "rising" || (k === "quality" && h.card.delta90d >= 0.3)) parts.push(`son 90 günde +${score1(h.card.delta90d)}`);
  }
  if (!q.qualifiers.length && h.card.delta90d >= 0.4) parts.push(`son 90 günde yükseliyor`);
  return parts.filter(Boolean).slice(0, 3).join(" · ");
}

export function searchV3(raw: string, opts: { limit?: number; city?: string; categoryId?: string } = {}): SearchOutput {
  const q = parseQuery(raw);
  const empty: SearchOutput = { query: q, exact: [], adjacent: [], creators: [], lists: [] };
  if (!q.content.length && !q.locations.length && !q.qualifiers.length) return empty;
  const docs = searchDocs();
  const hits: SearchHit[] = [];
  for (const d of docs) {
    if (opts.city && d.card.entity.location?.city !== opts.city) continue;
    if (opts.categoryId && d.card.entity.categoryId !== opts.categoryId) continue;
    /* yalnızca nitelik sorgusu ("sakin", "ucuz"): puanlı kayıtlar arasında nitelik sıralaması */
    if (!q.content.length && !q.locations.length && d.card.score === null) continue;
    const h = rankDoc(d, q); if (h) hits.push(h);
  }
  hits.sort((a, b) => b.score - a.score || (b.card.score ?? 0) - (a.card.score ?? 0) || b.card.experienceCount - a.card.experienceCount);
  for (const h of hits) h.reason = reasonFor(h, q, docs.find((d) => d.card === h.card)!);
  const limit = opts.limit ?? 200;
  const exact = hits.filter((h) => h.tier === "exact").slice(0, limit);
  const adjacent = hits.filter((h) => h.tier === "adjacent").slice(0, Math.max(6, Math.min(limit, 24)));

  /* kişi ve liste */
  const words = [...q.content, ...q.locations];
  const hitCount = (hay: string) => words.filter((w) => fold(hay).includes(w)).length;
  const creators = words.length ? users.map((u) => ({ u, n: hitCount([u.handle, u.displayName ?? "", ...u.expertise.map((x) => x.label)].join(" ")) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n || b.u.reputation.score - a.u.reputation.score).map((x) => x.u) : [];
  const listHits = words.length ? lists.map((l) => ({ l, n: hitCount([l.title, l.subtitle ?? ""].join(" ")) })).filter((x) => x.n > 0).map(({ l }) => ({ ...l, author: users.find((u) => u.id === l.authorId) as User })) : [];
  return { query: q, exact, adjacent, creators, lists: listHits };
}

export const searchIndexSizeV3 = () => entities.length;
