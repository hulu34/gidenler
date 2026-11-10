/* ==========================================================================
   ÇOK KATEGORİLİ GİDENLER — veri şeması PROTOTİPİ (bu turda hiçbir sayfaya bağlı değil; Production'a etkisi yok)
   --------------------------------------------------------------------------
   · Ortak temel (İsletme): kimlik, ad, şube, kategori, konum (il/ilçe/adres), iletişim, görsel, saat, faaliyet, kaynak/doğrulama.
   · Kategoriye özgü alanlar ayrı "ek" nesnelerinde: restoranın şeması otel ya da kuaföre zorla uygulanmaz.
   · Değerlendirme ölçütleri kategoriye ÖZGÜ ve ayrı: restoran deneyim puanı otel/kuaför/spor salonuna aktarılmaz.
     Puan yalnız aynı kategori ölçütleriyle hesaplanır; kategoriler arası tek "Gidenler puanı" sıralaması yoktur.
   · Mevcut restoran sistemi (RealVenueRecord, cat.restaurant/cafe/bar) DEĞİŞMEZ: `fromRealVenue` onu bu şemaya
     kayıpsız eşler; geri dönüşte hiçbir alan kaybolmaz.
   ========================================================================== */
import type { RealVenueRecord } from "@/data/real";

export type AnaKategori = "gastronomi" | "konaklama" | "kisisel-bakim" | "spor";
export type AltKategori =
  | "restoran" | "kafe" | "bar"
  | "otel" | "butik-otel" | "pansiyon"
  | "kuafor-kadin" | "kuafor-erkek" | "berber" | "guzellik-merkezi"
  | "spor-salonu" | "pilates-yoga" | "spor-tesisi";

export const KATEGORI_AGACI: Record<AnaKategori, { ad: string; alt: AltKategori[]; durum: "yayinda" | "taslak" }> = {
  gastronomi: { ad: "Yeme-içme", alt: ["restoran", "kafe", "bar"], durum: "yayinda" },
  konaklama: { ad: "Konaklama", alt: ["otel", "butik-otel", "pansiyon"], durum: "taslak" },
  "kisisel-bakim": { ad: "Kişisel bakım", alt: ["kuafor-kadin", "kuafor-erkek", "berber", "guzellik-merkezi"], durum: "taslak" },
  spor: { ad: "Spor ve yaşam", alt: ["spor-salonu", "pilates-yoga", "spor-tesisi"], durum: "taslak" },
};

/** Her kategorinin kaynağı OSM etiketi (aday bulma). Ad tür üretmez — restoranlardaki kural burada da geçerli. */
export const OSM_ESLEME: Record<AltKategori, Record<string, string>[]> = {
  restoran: [{ amenity: "restaurant" }, { amenity: "fast_food" }], kafe: [{ amenity: "cafe" }], bar: [{ amenity: "bar" }, { amenity: "pub" }],
  otel: [{ tourism: "hotel" }], "butik-otel": [{ tourism: "hotel" }], pansiyon: [{ tourism: "guest_house" }],
  "kuafor-kadin": [{ shop: "hairdresser", female: "yes" }], "kuafor-erkek": [{ shop: "hairdresser", male: "yes" }], berber: [{ shop: "hairdresser", "hairdresser:type": "barber" }],
  "guzellik-merkezi": [{ shop: "beauty" }],
  "spor-salonu": [{ leisure: "fitness_centre" }], "pilates-yoga": [{ leisure: "fitness_centre", sport: "yoga" }, { leisure: "fitness_centre", sport: "pilates" }], "spor-tesisi": [{ leisure: "sports_centre" }],
};

export interface Kaynak { tur: "osm" | "resmi_site" | "isletme_beyani" | "elle"; ref: string; tarih: string; lisans?: string }
export interface Isletme<E = KategoriEki> {
  id: string;                   // kalıcı Gidenler kimliği (bugünkü slug; değişmez)
  ad: string; sube?: string;    // aynı markanın şubesi: ad + sube + konum birlikte tekil
  ana: AnaKategori; alt: AltKategori;
  konum: { il: string; ilce: string; mahalle?: string; adres?: string; lat?: number; lng?: number };
  iletisim?: { telefon?: string; site?: string; instagram?: string };
  saat?: string;
  faaliyet: "acik" | "kalici_kapali" | "supheli";
  gorseller?: { src: string; hak: string }[];   // yalnız kullanım hakkı kayıtlı görsel
  kaynaklar: Kaynak[];
  dogrulama: { sinif: "A" | "B" | "C"; tarih: string; eksik: string[] };
  ek: E;
}

/* ───── kategoriye özgü alanlar ───── */
export interface RestoranEki { tip: "restoran"; mutfak: string[]; servis?: ("masa" | "paket" | "gel-al")[]; rezervasyon?: "yok" | "telefon" | "cevrimici"; menuUrl?: string; atmosfer?: string[] }
export interface OtelEki { tip: "otel"; konaklamaTuru: "otel" | "butik" | "pansiyon" | "apart"; yildiz?: number; odaSayisi?: number; tesisBelgesi?: { tur: "Kültür ve Turizm Bakanlığı" | "belediye"; no: string } ; girisCikis?: { giris: string; cikis: string }; rezervasyon?: "telefon" | "cevrimici" }
export interface KuaforEki { tip: "kuafor"; hizmetler: ("sac-kesim" | "boya" | "fon" | "sakal" | "manikur" | "cilt-bakim" | "epilasyon")[]; cinsiyet?: "kadin" | "erkek" | "karma"; randevu?: "zorunlu" | "onerilir" | "gerekmez"; fiyatListesiAcik?: boolean }
export interface SporEki { tip: "spor"; tesis: ("agirlik" | "kardiyo" | "havuz" | "grup-dersi" | "pilates-reformer" | "yoga" | "dovus")[]; uyelik?: ("gunluk" | "aylik" | "yillik" | "ders-paketi")[]; saat24?: boolean }
export type KategoriEki = RestoranEki | OtelEki | KuaforEki | SporEki;

/* ───── değerlendirme ölçütleri: kategoriye özgü, birbirine aktarılmaz ───── */
export interface Olcut { key: string; ad: string; agirlik: number }
export const DEGERLENDIRME: Record<KategoriEki["tip"], { olcek: 10; olcutler: Olcut[]; not: string }> = {
  restoran: { olcek: 10, not: "Bugünkü Gidenler puanı (değişmez).", olcutler: [{ key: "yemek", ad: "Yemek", agirlik: 0.45 }, { key: "servis", ad: "Servis", agirlik: 0.2 }, { key: "atmosfer", ad: "Atmosfer", agirlik: 0.15 }, { key: "fiyat", ad: "Fiyat/performans", agirlik: 0.2 }] },
  otel: { olcek: 10, not: "Oda ve temizlik ağırlıklı; konum ayrı ölçüt.", olcutler: [{ key: "oda", ad: "Oda", agirlik: 0.25 }, { key: "temizlik", ad: "Temizlik", agirlik: 0.25 }, { key: "hizmet", ad: "Hizmet", agirlik: 0.2 }, { key: "konum", ad: "Konum", agirlik: 0.15 }, { key: "fiyat", ad: "Fiyat/performans", agirlik: 0.15 }] },
  kuafor: { olcek: 10, not: "Sonuç ve hijyen ağırlıklı; fiyat şeffaflığı ayrı ölçüt.", olcutler: [{ key: "sonuc", ad: "Sonuç", agirlik: 0.35 }, { key: "hijyen", ad: "Hijyen", agirlik: 0.25 }, { key: "randevu", ad: "Randevuya uyum", agirlik: 0.15 }, { key: "fiyat_seffaflik", ad: "Fiyat şeffaflığı", agirlik: 0.25 }] },
  spor: { olcek: 10, not: "Ekipman ve temizlik ağırlıklı; üyelik koşulları ayrı ölçüt.", olcutler: [{ key: "ekipman", ad: "Ekipman ve tesis", agirlik: 0.3 }, { key: "temizlik", ad: "Temizlik", agirlik: 0.25 }, { key: "dersler", ad: "Dersler ve eğitmen", agirlik: 0.2 }, { key: "uyelik", ad: "Üyelik koşulları", agirlik: 0.15 }, { key: "saat", ad: "Çalışma saatleri", agirlik: 0.1 }] },
};

/** Puan yalnız kendi kategorisinin ölçütleriyle: başka kategorinin ölçüt anahtarı gelirse hata (otomatik aktarım yok). */
export function kategoriPuani(tip: KategoriEki["tip"], notlar: Record<string, number>): number {
  const { olcutler } = DEGERLENDIRME[tip];
  const keys = new Set(olcutler.map((o) => o.key));
  for (const k of Object.keys(notlar)) if (!keys.has(k)) throw new Error(`"${k}" ${tip} ölçütü değil`);
  let s = 0, w = 0;
  for (const o of olcutler) if (typeof notlar[o.key] === "number") { s += notlar[o.key] * o.agirlik; w += o.agirlik; }
  if (!w) throw new Error("ölçüt notu yok");
  return Math.round((s / w) * 10) / 10;
}

const ALT_BY_CAT: Record<RealVenueRecord["categoryId"], AltKategori> = { "cat.restaurant": "restoran", "cat.cafe": "kafe", "cat.bar": "bar" };
/** Bugünkü restoran kaydı → ortak şema (kayıpsız; kaynak kayıt `ham` içinde aynen durur). */
export function fromRealVenue(r: RealVenueRecord, il = "İstanbul"): Isletme<RestoranEki> & { ham: RealVenueRecord } {
  return {
    id: r.slug, ad: r.name, ana: "gastronomi", alt: ALT_BY_CAT[r.categoryId],
    konum: { il, ilce: r.district, mahalle: r.neighborhood, adres: r.address, lat: r.lat, lng: r.lng },
    iletisim: { telefon: r.phone, site: r.website, instagram: r.instagram }, saat: r.openingHours, faaliyet: "acik",
    kaynaklar: [{ tur: r.ref.startsWith("isletme/") ? "resmi_site" : "osm", ref: r.ref, tarih: r.verifiedAt ?? r.importedAt, ...(r.ref.startsWith("isletme/") ? {} : { lisans: "ODbL" }) }],
    dogrulama: { sinif: "B", tarih: r.verifiedAt ?? r.importedAt, eksik: [] },
    ek: { tip: "restoran", mutfak: r.cuisine ?? [] }, ham: r,
  };
}
