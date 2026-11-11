/* VERİ KALİTE SINIFI — A / B / C
   A  Yüksek güven: kimlik, konum ve faaliyet güçlü ve güncel kanıtla doğrulanmış; tam adres; kaynaklı tür. Yayın adayı.
   B  Orta güven: güvenilir kısmi kaynak var; eksik alanlar `eksik` listesinde açıkça yazılı. Ayrıca değerlendirilir.
   C  İnceleme gerekiyor: şube/kimlik/faaliyet belirsiz, mükerrer ya da kapanış şüphesi. Doğrudan YAYIMLANMAZ.
   Google puanıyla eşleşmiş olmak tek başına A değildir: adres, tür ve OSM kaydının bugün de durması ayrıca aranır. */
import type { Aday } from "./aday";

export type Sinif = "A" | "B" | "C";
export interface Derece { sinif: Sinif; eksik: string[]; neden: string[]; kanit: string[] }
export interface SiteOlcum { ad: boolean; sokak: boolean; mahalle: boolean; ilce: boolean; telefon: boolean }
export interface SiteKanit { tarih: string; denenen: { url: string; status: number }[]; olcum: SiteOlcum | null; alan: string | null }

/** Faaliyet kanıtı sayılan en eski yerinde kontrol tarihi (OSM check_date / survey:date). */
export const CHECK_DATE_MIN = "2025-01";
export const hasHouseNo = (address?: string) => /\bNo\s*[:.]?\s*[A-Z]?\d/i.test(address ?? "");   // "No:12", "No. 5A", "No:J4" (Galataport birimi)

export function gradeCandidate(a: Aday, site?: SiteKanit): Derece {
  const eksik: string[] = [], neden: string[] = [], kanit: string[] = [];
  const o = site?.olcum;
  const siteStrong = !!o && o.ad && (o.sokak || o.telefon);
  const siteName = !!o && o.ad && (o.ilce || o.mahalle);
  const surveyed = !!a.checkDate && a.checkDate >= CHECK_DATE_MIN;
  const fullAddr = !!(a.street && a.housenumber);
  if (siteStrong) kanit.push(`resmî site (${site!.tarih}): ad + ${[o!.sokak && "sokak", o!.telefon && "telefon"].filter(Boolean).join(" + ")} eşleşti`);
  else if (siteName) kanit.push(`resmî site (${site!.tarih}): ad + ${o!.mahalle ? "mahalle" : "ilçe"} eşleşti, sokak/telefon eşleşmedi`);
  if (surveyed) kanit.push(`OSM yerinde kontrol tarihi ${a.checkDate}`);
  if (a.ret.length) return { sinif: "C", eksik, neden: [...a.ret], kanit };
  if (a.esles) neden.push(`mukerrer_suphesi:${a.esles.neden}:${a.esles.slug}`);
  neden.push(...a.inceleme);
  if (!siteStrong && !siteName && !surveyed) neden.push("faaliyet_kaniti_yok");
  if (!fullAddr) eksik.push(a.street ? "kapı numarası" : "sokak adresi");
  if (!a.mutfak.labels.length) eksik.push("mutfak türü (kaynakta yok)");
  if (a.mutfak.nameOnly.length) eksik.push(`addaki tür ipucu doğrulanmadı: ${a.mutfak.nameOnly.join(", ")}`);
  if (!a.phone) eksik.push("telefon");
  if (!a.openingHours) eksik.push("çalışma saatleri");
  if (neden.length) return { sinif: "C", eksik, neden, kanit };
  const strong = siteStrong || (surveyed && fullAddr);
  const core = eksik.filter((e) => e !== "telefon" && e !== "çalışma saatleri");
  return { sinif: strong && !core.length ? "A" : "B", eksik, neden, kanit };
}

/** Katalogdaki (yayında ya da hazır pakette) kaydın sınıfı. */
export interface MevcutGirdi {
  address?: string; cuisineLabels: number; nameConflict: boolean; ref: string; isBusiness: boolean;
  polygonOk: boolean | null; osmNow: "var" | "yok" | "kapali" | "isletme";
  closure: "closed_confirmed" | "closed_suspected" | "reopened" | null;
  googleChip: boolean | null;            // yalnız yayındaki 456 için canlı profilde ölçüldü
  verification?: { m: number; ad: number; date: string } | null;   // 906 dalgaları 2–4
  dup: string | null; checkDate?: string;
  /** resmî site ölçümü (dalga 6+): ad + sokak/telefon eşleşmesi */
  siteVerified?: boolean;
}
export function gradeExisting(x: MevcutGirdi): Derece {
  const eksik: string[] = [], neden: string[] = [], kanit: string[] = [];
  if (x.closure === "closed_confirmed") neden.push("kalici_kapali_kaydi");
  if (x.closure === "closed_suspected") neden.push("kapanis_suphesi");
  if (x.osmNow === "yok") neden.push("osm_kaydi_artik_yok");
  if (x.osmNow === "kapali") neden.push("osm_kapali_isareti");
  if (x.polygonOk === false) neden.push("koordinat_baska_ilcede");
  if (x.dup) neden.push(`katalog_ici_cift:${x.dup}`);
  if (x.nameConflict) neden.push("ad_tur_celiskisi");
  if (!x.address) eksik.push("adres"); else if (!hasHouseNo(x.address)) eksik.push("kapı numarası");
  if (!x.cuisineLabels) eksik.push("mutfak türü (kaynakta yok)");
  const idVerified = x.isBusiness || x.googleChip === true || x.siteVerified === true || (!!x.verification && x.verification.m <= 60 && x.verification.ad >= 0.8);
  if (x.isBusiness) kanit.push("işletmenin resmî sitesi (elle)");
  if (x.siteVerified) kanit.push("resmî site ölçümü: ad + sokak/telefon");
  if (x.googleChip) kanit.push("onaylı Google eşleşmesi (puan profilde görünüyor)");
  if (x.verification) kanit.push(`Google sayfası ölçümü ${x.verification.date}: konum ${x.verification.m} m, ad ${x.verification.ad}`);
  if (x.checkDate && x.checkDate >= CHECK_DATE_MIN) kanit.push(`OSM yerinde kontrol ${x.checkDate}`);
  if (!idVerified && !(x.checkDate && x.checkDate >= CHECK_DATE_MIN)) eksik.push("bağımsız kimlik/faaliyet doğrulaması");
  if (neden.length) return { sinif: "C", eksik, neden, kanit };
  return { sinif: eksik.length ? "B" : "A", eksik, neden, kanit };
}
