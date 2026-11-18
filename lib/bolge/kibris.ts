/* Kıbrıs bölge modeli — yalnız saf fonksiyonlar; henüz hiçbir sayfa, arama ya da Sor kodu bunu içe aktarmıyor.
   Amaç: İstanbul verisine dokunmadan Kuzey Kıbrıs kayıtlarının şehir/ilçe/yerleşim filtrelerini ve arama
   eşanlamlılarını tek yerde tanımlamak. Bağlama adımı (city alanı, harita sınırları, Sor) KUZEY-KIBRIS-TEKNIK.md'de.

   Model:
   - ada: "Kıbrıs" (coğrafi birim)
   - operasyonelBolge: "kuzey" | "güney" — telefon kodu, para birimi, adres biçimi için operasyonel etiket; hukuki hüküm değildir
   - ilce: kuzeyde 6 ilçe; Gidenler'in şehir seçimi ilçe adını kullanır (Türkiye il/plaka modeli kullanılmaz)
   - yerlesim: köy/mahalle/semt (Lapta, Long Beach, Dereboyu…) */

export type OperasyonelBolge = "kuzey" | "güney";
export type KuzeyIlce = "Lefkoşa" | "Girne" | "İskele" | "Gazimağusa" | "Güzelyurt" | "Lefke";

export const KUZEY_ILCELER: readonly KuzeyIlce[] = ["Lefkoşa", "Girne", "İskele", "Gazimağusa", "Güzelyurt", "Lefke"];
/** Bu operasyonun kapsamı (öncelik sırasıyla). */
export const KAPSAM: readonly KuzeyIlce[] = ["İskele", "Girne", "Lefkoşa"];

export const fold = (s: string) =>
  s.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase().replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** İlçe adları: Türkçe, İngilizce ve yerel (Rumca Latin yazımı) karşılıklar. */
const ILCE_ADLARI: Record<KuzeyIlce, string[]> = {
  "Lefkoşa": ["lefkoşa", "lefkosa", "nicosia", "lefkosia", "north nicosia", "kuzey lefkoşa"],
  "Girne": ["girne", "kyrenia", "keryneia"],
  "İskele": ["iskele", "trikomo", "trikomon"],
  "Gazimağusa": ["gazimağusa", "mağusa", "famagusta", "ammochostos"],
  "Güzelyurt": ["güzelyurt", "morphou", "omorfo"],
  "Lefke": ["lefke", "lefka"],
};

/** Yerleşimler → ilçe. Yalnız bu operasyonda kaynaklarda geçen ve ilçesi kesin olanlar. */
const YERLESIMLER: { ad: string; ilce: KuzeyIlce; esAdlar: string[] }[] = [
  { ad: "Long Beach", ilce: "İskele", esAdlar: ["long beach", "uzun plaj", "yeni iskele"] },
  { ad: "Boğaz", ilce: "İskele", esAdlar: ["boğaz", "bogaz", "boghaz", "iskele boğazı"] },
  { ad: "Bafra", ilce: "İskele", esAdlar: ["bafra", "vokolida", "bafra turizm bölgesi"] },
  { ad: "Karpaz", ilce: "İskele", esAdlar: ["karpaz", "karpas", "karpasia"] },
  { ad: "Dipkarpaz", ilce: "İskele", esAdlar: ["dipkarpaz", "rizokarpaso"] },
  { ad: "Yeni Erenköy", ilce: "İskele", esAdlar: ["yeni erenköy", "yenierenköy", "yialousa", "karpaz gate"] },
  { ad: "Şafaköy", ilce: "İskele", esAdlar: ["şafaköy", "safakoy"] },
  { ad: "Lapta", ilce: "Girne", esAdlar: ["lapta", "lapithos"] },
  { ad: "Alsancak", ilce: "Girne", esAdlar: ["alsancak", "karavas"] },
  { ad: "Karaoğlanoğlu", ilce: "Girne", esAdlar: ["karaoğlanoğlu", "karaoglanoglu", "ayios georgios"] },
  { ad: "Çatalköy", ilce: "Girne", esAdlar: ["çatalköy", "catalkoy", "ayios epiktitos"] },
  { ad: "Ozanköy", ilce: "Girne", esAdlar: ["ozanköy", "ozankoy", "kazafani"] },
  { ad: "Beylerbeyi", ilce: "Girne", esAdlar: ["beylerbeyi", "bellapais", "bellapaïs"] },
  { ad: "Esentepe", ilce: "Girne", esAdlar: ["esentepe", "ayios amvrosios"] },
  { ad: "Zeytinlik", ilce: "Girne", esAdlar: ["zeytinlik", "templos"] },
  { ad: "Ilgaz", ilce: "Girne", esAdlar: ["ilgaz"] },
  { ad: "Karmi", ilce: "Girne", esAdlar: ["karmi", "karaman"] },
  { ad: "Girne Limanı", ilce: "Girne", esAdlar: ["girne limanı", "eski liman", "kyrenia harbour", "kordonboyu"] },
  { ad: "Surlariçi", ilce: "Lefkoşa", esAdlar: ["surlariçi", "walled city", "old city lefkoşa"] },
  { ad: "Dereboyu", ilce: "Lefkoşa", esAdlar: ["dereboyu"] },
  { ad: "Köşklüçiftlik", ilce: "Lefkoşa", esAdlar: ["köşklüçiftlik", "koskluciftlik"] },
  { ad: "Ortaköy", ilce: "Lefkoşa", esAdlar: ["ortaköy lefkoşa"] },
  { ad: "Gönyeli", ilce: "Lefkoşa", esAdlar: ["gönyeli", "gonyeli", "kioneli"] },
  { ad: "Hamitköy", ilce: "Lefkoşa", esAdlar: ["hamitköy", "hamitkoy", "mandres"] },
  { ad: "Küçük Kaymaklı", ilce: "Lefkoşa", esAdlar: ["küçük kaymaklı", "kucuk kaymakli", "omorphita"] },
  { ad: "Taşkınköy", ilce: "Lefkoşa", esAdlar: ["taşkınköy", "taskinkoy"] },
];

/** İstanbul'da (ya da başka yerde) de geçen adlar: yalnız Kıbrıs bağlamı varken eşlenir.
    Örnek: Boğaz (İstanbul Boğazı), İskele (Çengelköy İskele), Beylerbeyi, Esentepe, Zeytinlik, Dereboyu (Ortaköy),
    Girne (Girne Pilavcısı), Long Beach (ABD). */
const BELIRSIZ = new Set(["boğaz", "bogaz", "iskele", "girne", "beylerbeyi", "esentepe", "zeytinlik", "dereboyu", "ortaköy lefkoşa", "karaman", "bafra", "alsancak", "lapta", "kordonboyu", "eski liman", "long beach", "uzun plaj", "yeni iskele", "ilgaz", "karpaz gate", "walled city", "old city lefkoşa", "omorfo", "mağusa", "karpas", "templos", "mandres", "karmi"].map(fold));
const KIBRIS_ISARET = ["kıbrıs", "kibris", "kktc", "cyprus", "north cyprus", "kuzey kıbrıs", "trnc"].map(fold);

export type BolgeEslesme = { ilce: KuzeyIlce; yerlesim?: string; eslesen: string };

const has = (q: string, phrase: string) => ` ${q} `.includes(` ${phrase} `);
const TUM_ADLAR: { ad: string; ilce: KuzeyIlce; yerlesim?: string }[] = [
  ...YERLESIMLER.flatMap((y) => y.esAdlar.map((e) => ({ ad: fold(e), ilce: y.ilce, yerlesim: y.ad }))),
  ...(Object.entries(ILCE_ADLARI) as [KuzeyIlce, string[]][]).flatMap(([ilce, adlar]) => adlar.map((a) => ({ ad: fold(a), ilce }))),
].sort((a, b) => b.ad.length - a.ad.length);

/** Kıbrıs bağlamı: açık işaret (Kıbrıs/KKTC/Cyprus) ya da yalnız Kıbrıs'ta geçen bir yer adı (Kyrenia, Lefkoşa, Lapithos…). */
export function kibrisBaglami(metin: string): boolean {
  const q = fold(metin);
  return KIBRIS_ISARET.some((w) => has(q, w)) || TUM_ADLAR.some((a) => !BELIRSIZ.has(a.ad) && has(q, a.ad));
}

/** Serbest metinden ilçe/yerleşim çıkarır (en uzun ad önce). Belirsiz adlar yalnız Kıbrıs bağlamında eşlenir. */
export function bolgeBul(metin: string, opts: { kibrisBaglami?: boolean } = {}): BolgeEslesme | null {
  const q = fold(metin);
  const baglam = opts.kibrisBaglami ?? kibrisBaglami(metin);
  const yer = TUM_ADLAR.find((a) => a.yerlesim && has(q, a.ad) && (baglam || !BELIRSIZ.has(a.ad)));
  if (yer) return { ilce: yer.ilce, yerlesim: yer.yerlesim, eslesen: yer.ad };
  const il = TUM_ADLAR.find((a) => !a.yerlesim && has(q, a.ad) && (baglam || !BELIRSIZ.has(a.ad)));
  return il ? { ilce: il.ilce, eslesen: il.ad } : null;
}

/** Arama sorgusundaki İngilizce/yerel adları Türkçe ilçe/yerleşim adına çevirir (yalnız Kıbrıs bağlamında). */
export function aramaNormalize(sorgu: string): string {
  if (!kibrisBaglami(sorgu)) return sorgu;
  let q = ` ${fold(sorgu)} `;
  for (const a of TUM_ADLAR) q = q.split(` ${a.ad} `).join(` ${fold(a.yerlesim ?? a.ilce)} `);
  return q.replace(/\s+/g, " ").trim();
}

export type KibrisKayit = { ad: string; adVaryantlari?: string[]; durum: string; bolge: { operasyonelBolge: OperasyonelBolge; ilce: string; yerlesim?: string | null }; kategori: { kind?: string | null } };

/** İlçe/yerleşim filtresi. Varsayılan: yalnız kuzey ve yalnız doğrulanmış kayıtlar (koşullu ve inceleme listelenmez). */
export function filtrele<T extends KibrisKayit>(kayitlar: T[], f: { ilce?: KuzeyIlce; yerlesim?: string; dahil?: string[] } = {}): T[] {
  const dahil = f.dahil ?? ["dogrulandi"];
  return kayitlar.filter((r) => r.bolge.operasyonelBolge === "kuzey" && dahil.includes(r.durum) && (!f.ilce || r.bolge.ilce === f.ilce) && (!f.yerlesim || fold(r.bolge.yerlesim ?? "").includes(fold(f.yerlesim))));
}

/** Basit arama: ad + varyant + tür + ilçe/yerleşim; sorgudaki bölge sözcüğü filtreye dönüşür. */
export function ara<T extends KibrisKayit>(kayitlar: T[], sorgu: string, dahil: string[] = ["dogrulandi"]): T[] {
  const b = bolgeBul(sorgu);
  const n = aramaNormalize(sorgu);
  const kalan = n.split(" ").filter((w) => w && !(b && (fold(b.ilce).split(" ").includes(w) || fold(b.yerlesim ?? "").split(" ").includes(w))) && !KIBRIS_ISARET.includes(w));
  return filtrele(kayitlar, { ilce: b?.ilce, dahil }).filter((r) => {
    const hay = fold([r.ad, ...(r.adVaryantlari ?? []), r.kategori.kind ?? "", r.bolge.yerlesim ?? "", r.bolge.ilce].join(" "));
    return kalan.every((w) => hay.includes(w));
  });
}

/** Slug önerisi: <ad>-<ilçe>-kibris (İstanbul slug'larıyla çakışmaz; "girne pilavcısı" gibi adları ayırır). */
export function slugOner(ad: string, ilce: KuzeyIlce): string {
  const b = fold(ad.replace(/\(.*?\)/g, "")).replace(/ /g, "-");
  const i = fold(ilce).replace(/ /g, "-");
  return `${b.endsWith(`-${i}`) ? b : `${b}-${i}`}-kibris`;
}

/** Kaba kutu: koordinat adada mı (kuzey/güney ayrımı için YETERSİZ — Lefkoşa ikiye bölünür; ayrım ilçe alanıyla yapılır). */
export const adadaMi = (lat: number, lng: number) => lat >= 34.5 && lat <= 35.75 && lng >= 32.2 && lng <= 34.65;

export const OPERASYON = {
  kuzey: { telefonUlkeKodu: "+90", alanKodu: "392", paraBirimi: "TRY", saatDilimi: "Asia/Famagusta" },
  güney: { telefonUlkeKodu: "+357", alanKodu: null, paraBirimi: "EUR", saatDilimi: "Asia/Nicosia" },
} as const;
