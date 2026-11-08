/* KAMPANYA — "İstanbul'da en son nerede yemek yedin?" deneyim akışının kaynak kodları ve adımları (istemci + sunucu ortak).
   Her içerik üreticisinin ayrı bağlantısı: https://www.gidenler.com/nerede-yedin/?k=<kod>
   Kod listesi burada; ad/hesap bilgisi depoya YAZILMAZ (depo herkese açık) — eşleştirme yönetimdeki notta tutulur.
   Kampanya kaynağı sıralamaya, sinyallere ve Gidenler puanına girmez; yalnız toplu dönüşüm sayacıdır. */
export const CAMPAIGN_PATH = "/nerede-yedin/";
export const CAMPAIGN_MESSAGE = "İstanbul'da en son nerede yemek yedin? Gidenler'de deneyimini paylaş.";

export interface CampaignCode { code: string; label: string }
/** İçerik üreticisi bağlantıları (10). Yeni kod eklemek için listeye satır ekle; kod yalnız a-z, 0-9 ve tire. */
export const CREATOR_CODES: CampaignCode[] = Array.from({ length: 10 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return { code: `ic${n}`, label: `İçerik üreticisi ${n}` };
});
/** Kampanya dışı kaynaklar: ana sayfadaki bölüm ve kodsuz doğrudan giriş. */
export const SITE_CODES: CampaignCode[] = [
  { code: "site", label: "Ana sayfa bölümü" },
  { code: "dogrudan", label: "Kodsuz bağlantı" },
];
export const ALL_CODES = [...CREATOR_CODES, ...SITE_CODES];
const CODE_SET = new Set(ALL_CODES.map((c) => c.code));
export const isCode = (c: unknown): c is string => typeof c === "string" && CODE_SET.has(c);

/** Akış adımları — sırası huni sırasıdır. */
export const STEPS = [
  ["ziyaret", "Bölümü / bağlantıyı gördü"],
  ["arama", "Restoran aradı"],
  ["secim", "Restoran seçti"],
  ["form", "Deneyim formunu açtı"],
  ["giris", "Giriş için yönlendi"],
  ["gonderim", "Göndermeyi denedi"],
  ["tamam", "Deneyim kaydedildi (sunucu)"],
  ["hata", "Kayıt başarısız"],
  ["bulunamadi", "Mekânı bulamadı"],
  ["oneri", "Mekân önerdi (sunucu)"],
] as const;
export type Step = (typeof STEPS)[number][0];
/** İstemcinin bildirebileceği adımlar. "tamam" ve "oneri" yalnız sunucuda, gerçek kayıt oluştuğunda yazılır. */
export const CLIENT_STEPS: Step[] = ["ziyaret", "arama", "secim", "form", "giris", "gonderim", "hata", "bulunamadi"];

export function campaignLink(code: string, origin = "https://www.gidenler.com") {
  return `${origin}${CAMPAIGN_PATH}?k=${encodeURIComponent(code)}`;
}
