/* ==========================================================================
   MUTFAK VE HİZMET ETİKETLERİ (katalog genişlemesi)
   --------------------------------------------------------------------------
   Kural 1 — Etiket yalnız KAYNAKTAN gelir: OSM `cuisine` / `amenity` etiketi, işletmenin resmî sitesi ya da
            kaynağı yazılı elle karar. Mekânın ADI etiket üretmez; addaki kelime yalnız "ipucu"dur ve kaynakla
            çelişirse kayıt incelemeye düşer (Japon Erdal: adında "Japon" var, mutfağı Samsun pidesi → Japon DEĞİL).
   Kural 2 — Bir mekân birden çok etiket taşıyabilir (ör. kebap + Türk mutfağı). Sıra kaynaktaki sıradır.
   Kural 3 — Fine dining, popüler, ödüllü, "hype" gibi nitelikler OSM türünden ÇIKARILMAZ. Yalnız elle ve
            yazılı kaynakla (ör. resmî rehber sayfası) verilir; bu modül onları hiç üretmez.
   Kural 4 — Mevcut kayıtların gösterilen türü (`kind`) topluca değiştirilmez; bu modül denetim ve yeni paketler
            içindir. Çelişkiler rapora ve inceleme kuyruğuna gider.
   ========================================================================== */

export type MutfakId =
  | "turk" | "esnaf" | "kebap" | "doner" | "pide" | "balik" | "meyhane" | "et" | "burger" | "pizza"
  | "japon" | "asya" | "kahvalti" | "tatli" | "kafe" | "bar" | "dunya" | "vegan" | "tavuk" | "sokak" | "firin";

export const MUTFAK: Record<MutfakId, { ad: string; grup: "Türk" | "Dünya" | "Kafe ve tatlı" | "Bar" | "Diğer" }> = {
  turk: { ad: "Türk mutfağı", grup: "Türk" },
  esnaf: { ad: "Esnaf lokantası / ev yemekleri", grup: "Türk" },
  kebap: { ad: "Kebap ve ocakbaşı", grup: "Türk" },
  doner: { ad: "Döner", grup: "Türk" },
  pide: { ad: "Pide ve lahmacun", grup: "Türk" },
  balik: { ad: "Balık ve deniz ürünleri", grup: "Diğer" },
  meyhane: { ad: "Meyhane", grup: "Türk" },
  et: { ad: "Et ve steakhouse", grup: "Diğer" },
  burger: { ad: "Burger", grup: "Dünya" },
  pizza: { ad: "Pizza ve İtalyan", grup: "Dünya" },
  japon: { ad: "Japon, sushi ve ramen", grup: "Dünya" },
  asya: { ad: "Çin, Kore, Tayland ve diğer Asya", grup: "Dünya" },
  kahvalti: { ad: "Kahvaltı ve brunch", grup: "Kafe ve tatlı" },
  tatli: { ad: "Pastane ve tatlıcı", grup: "Kafe ve tatlı" },
  kafe: { ad: "Kafe", grup: "Kafe ve tatlı" },
  bar: { ad: "Bar", grup: "Bar" },
  dunya: { ad: "Diğer dünya mutfakları", grup: "Dünya" },
  vegan: { ad: "Vegan / vejetaryen", grup: "Diğer" },
  tavuk: { ad: "Tavuk", grup: "Diğer" },
  sokak: { ad: "Sokak lezzetleri (köfte, kokoreç, dürüm…)", grup: "Türk" },
  firin: { ad: "Fırın ve börek", grup: "Kafe ve tatlı" },
};

/** OSM `cuisine` değeri → Gidenler etiketi. Listede olmayan değer etiket üretmez (raporda "tanınmayan" olarak sayılır). */
export const OSM_CUISINE: Record<string, MutfakId> = {
  turkish: "turk", regional: "turk", local: "turk", ottoman: "turk", anatolian: "turk", black_sea: "turk", karadeniz: "turk",
  homestyle: "esnaf", home_cooking: "esnaf", ev_yemekleri: "esnaf", lokanta: "esnaf", soup: "esnaf", corba: "esnaf",
  kebab: "kebap", kebap: "kebap", grill: "kebap", ocakbasi: "kebap", adana: "kebap", iskender: "doner", cag_kebab: "kebap",
  doner: "doner", "döner": "doner", "doner_kebab": "doner",
  pide: "pide", lahmacun: "pide", "pide;lahmacun": "pide", turkish_pizza: "pide",
  fish: "balik", seafood: "balik", fish_and_chips: "balik",
  meyhane: "meyhane", meze: "meyhane",
  steak_house: "et", steak: "et", meat: "et", barbecue: "et", bbq: "et", kasap: "et",
  burger: "burger", american: "burger",
  pizza: "pizza", italian: "pizza", pasta: "pizza", italian_pizza: "pizza",
  japanese: "japon", sushi: "japon", ramen: "japon",
  chinese: "asya", korean: "asya", thai: "asya", asian: "asya", vietnamese: "asya", indian: "asya", noodle: "asya", dumpling: "asya", nepalese: "asya", indonesian: "asya", filipino: "asya", uyghur: "asya", malaysian: "asya",
  breakfast: "kahvalti", brunch: "kahvalti",
  cake: "tatli", pastry: "tatli", dessert: "tatli", ice_cream: "tatli", baklava: "tatli", waffle: "tatli", chocolate: "tatli", frozen_yogurt: "tatli", pudding: "tatli", kunefe: "tatli",
  coffee_shop: "kafe", coffee: "kafe", tea: "kafe", bubble_tea: "kafe", juice: "kafe",
  bakery: "firin", borek: "firin", "börek": "firin", simit: "firin", bagel: "firin",
  mexican: "dunya", french: "dunya", greek: "dunya", mediterranean: "dunya", georgian: "dunya", lebanese: "dunya", arab: "dunya",
  syrian: "dunya", persian: "dunya", iranian: "dunya", middle_eastern: "dunya", international: "dunya", spanish: "dunya", balkan: "dunya",
  russian: "dunya", azerbaijani: "dunya", uzbek: "dunya", african: "dunya", latin_american: "dunya", peruvian: "dunya", argentinian: "dunya",
  german: "dunya", fusion: "dunya", caucasian: "dunya", afghan: "dunya", iraqi: "dunya", yemeni: "dunya", turkmen: "dunya", kurdish: "turk",
  vegan: "vegan", vegetarian: "vegan", salad: "vegan",
  chicken: "tavuk", fried_chicken: "tavuk", wings: "tavuk",
  kofte: "sokak", "köfte": "sokak", cig_kofte: "sokak", kokorec: "sokak", "kokoreç": "sokak", wrap: "sokak", sandwich: "sokak", durum: "sokak", tantuni: "sokak", midye: "sokak", kumpir: "sokak", hot_dog: "sokak", kebab_wrap: "sokak", tost: "sokak",
  manti: "esnaf", "mantı": "esnaf", pilav: "esnaf", gozleme: "esnaf", "gözleme": "esnaf", kelle_paca: "esnaf", iskembe: "esnaf",
};

export type EtiketKaynagi = "osm_cuisine" | "osm_amenity" | "resmi_site" | "elle";
export interface MutfakEtiketi { id: MutfakId; kaynak: EtiketKaynagi; deger: string }

const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
export const cuisineValues = (raw: string | string[] | undefined): string[] =>
  (Array.isArray(raw) ? raw : (raw ?? "").split(/[;,]/)).map((x) => x.trim().toLowerCase()).filter(Boolean);

/** Kaynaklı etiketler: önce OSM cuisine (sırasıyla), sonra amenity. Ad KULLANILMAZ. */
export function sourcedLabels(input: { amenity?: string; cuisine?: string | string[] }): { labels: MutfakEtiketi[]; unknown: string[] } {
  const labels: MutfakEtiketi[] = []; const unknown: string[] = [];
  const push = (l: MutfakEtiketi) => { if (!labels.some((x) => x.id === l.id)) labels.push(l); };
  for (const c of cuisineValues(input.cuisine)) {
    const id = OSM_CUISINE[c] ?? OSM_CUISINE[fold(c)];
    if (id) push({ id, kaynak: "osm_cuisine", deger: c }); else unknown.push(c);
  }
  const a = input.amenity;
  if (a === "cafe" && !labels.length) push({ id: "kafe", kaynak: "osm_amenity", deger: a });
  if ((a === "bar" || a === "pub" || a === "biergarten") && !labels.some((l) => l.id === "meyhane")) push({ id: "bar", kaynak: "osm_amenity", deger: a });
  if (a === "ice_cream") push({ id: "tatli", kaynak: "osm_amenity", deger: a });
  return { labels, unknown };
}

/** Addaki tür kelimeleri: YALNIZ ipucu. Etiket üretmez; kaynakla çelişki denetimi için. */
const NAME_HINTS: [RegExp, MutfakId][] = [
  [/\bjapon|\bsushi|\bramen/, "japon"], [/\bcin\b|\bchinese|\bkore|\bkorean|\btay\b|\bthai|\basia|\basya|\bwok\b|\bnoodle/, "asya"],
  [/\bburger/, "burger"], [/\bpizz|\bitalyan|\bitalian|\btrattoria|\bosteria/, "pizza"], [/\bsteak|\bkasap\b|\bet lokanta/, "et"],
  [/\bbalik|\bfish|\bseafood|\bdeniz urun/, "balik"], [/\bkebap|\bkebab|\bocakbasi/, "kebap"], [/\bdoner/, "doner"],
  [/\bpide|\blahmacun/, "pide"], [/\bmeyhane/, "meyhane"], [/\bkahvalti|\bbrunch|\bbreakfast/, "kahvalti"],
  [/\bpastane|\bpatisserie|\btatli|\bbaklava|\bkunefe|\bdondurma|\bgelato/, "tatli"], [/\bkahve|\bcoffee|\bespresso|\broaster/, "kafe"],
  [/\blokanta|\besnaf|\bev yemek/, "esnaf"], [/\bvegan|\bvejetaryen/, "vegan"], [/\bkofte|\bkokorec|\btantuni|\bdurum/, "sokak"],
];
export function nameHints(name: string): MutfakId[] {
  const n = fold(name);
  return [...new Set(NAME_HINTS.filter(([re]) => re.test(n)).map(([, id]) => id))];
}

/** Uyumlu sayılan komşu etiketler (ör. addaki "kebap" ile kaynaktaki "turk" çelişki değildir). */
const COMPATIBLE: Partial<Record<MutfakId, MutfakId[]>> = {
  kebap: ["turk", "et", "doner", "sokak", "pide"], doner: ["turk", "kebap", "sokak", "tavuk"], pide: ["turk", "kebap", "firin"],
  esnaf: ["turk", "et", "kebap", "kahvalti", "sokak"], meyhane: ["turk", "balik", "bar"], et: ["kebap", "turk", "burger", "esnaf"], kahvalti: ["kafe", "turk", "tatli", "firin", "esnaf"],
  tatli: ["kafe", "firin", "kahvalti", "turk"], kafe: ["tatli", "kahvalti", "firin", "turk"], sokak: ["turk", "kebap", "doner", "tavuk"], balik: ["meyhane", "turk", "dunya"], tavuk: ["doner", "sokak"],
  burger: ["et", "dunya"], pizza: ["dunya"], japon: ["asya"], asya: ["japon"],
};

export interface MutfakDenetimi {
  labels: MutfakEtiketi[];
  /** addaki ipucu kaynakla çelişiyor (ör. "Japon" adı, OSM: turkish) → incele */
  nameConflict: { hint: MutfakId; sourced: MutfakId[] } | null;
  /** addaki ipucu var ama kaynakta hiç mutfak etiketi yok → tür KESİN DEĞİL */
  nameOnly: MutfakId[];
  unknown: string[];
}
export function auditCuisine(input: { name: string; amenity?: string; cuisine?: string | string[] }): MutfakDenetimi {
  const { labels, unknown } = sourcedLabels(input);
  const hints = nameHints(input.name);
  const ids = labels.map((l) => l.id);
  let nameConflict: MutfakDenetimi["nameConflict"] = null;
  const cuisineIds = labels.filter((l) => l.kaynak === "osm_cuisine").map((l) => l.id);
  for (const h of hints) {
    if (!cuisineIds.length) break;
    if (cuisineIds.includes(h) || cuisineIds.some((s) => COMPATIBLE[h]?.includes(s) || COMPATIBLE[s]?.includes(h))) continue;
    nameConflict = { hint: h, sourced: cuisineIds }; break;
  }
  const nameOnly = cuisineIds.length ? [] : hints.filter((h) => !ids.includes(h));
  return { labels, nameConflict, nameOnly, unknown };
}

/** Mevcut gösterim türü (`kind`) → etiket; yalnız envanterde mevcut gösterimi saymak için. */
/** Gösterilen tür (`kind`) addan türetilmiş ve kaynakla çelişiyor mu? (Japon Erdal türü hata: tür adda geçiyor, kaynak başka diyor.)
    Tür kaynaklı etiketle uyumluysa ya da kaynakta hiç mutfak yoksa çelişki DEĞİLDİR (ikinci durum ayrıca "addan tür" sayılır). */
export function kindConflict(kind: string | undefined, d: MutfakDenetimi, name: string): boolean {
  const k = kind ? KIND_TO_MUTFAK[kind] : null;
  if (!k) return false;
  const src = d.labels.filter((l) => l.kaynak === "osm_cuisine").map((l) => l.id);
  if (!src.length || src.includes(k) || src.some((s) => COMPATIBLE[k]?.includes(s) || COMPATIBLE[s]?.includes(k))) return false;
  return nameHints(name).includes(k);
}

export const KIND_TO_MUTFAK: Record<string, MutfakId | null> = {
  "Meyhane": "meyhane", "Burger": "burger", "Pizza": "pizza", "Steakhouse": "et", "Sushi / Japon": "japon", "Ramen": "japon",
  "Balık restoranı": "balik", "Kebapçı / Ocakbaşı": "kebap", "Dönerci": "doner", "Pideci": "pide", "Mantıcı": "esnaf",
  "Kahvaltı": "kahvalti", "Tatlıcı": "tatli", "Lokanta": "esnaf", "Kahveci": "kafe", "Pastane": "tatli", "Fırın": "firin",
  "Kafe": "kafe", "Bar": "bar", "Pub": "bar", "Kokteyl bar": "bar", "Restoran": null,
};
