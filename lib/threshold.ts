import { score1 } from "@/lib/format";

/* ==========================================================================
   DENEME EŞİĞİ — "Kaç puanın üstüne çıkarsa denemek istersin?"
   · Kişisel beklenti / takip tercihi; restoran değerlendirmesi DEĞİLDİR.
     Hiçbir puana, deneyim sayısına, sıralamaya ya da öneriye girmez; Kaydet / Gitmek istiyorum / Gittim'den bağımsızdır.
   · Yalnız Gidenler puanı izlenir (Google ya da başka platform puanı değil); yeni bir ortalama üretilmez.
   · Bildirim yalnız eşiğin ALTINDAN ÜSTÜNE geçişte ve güven koşulu sağlanınca; bir eşik için en çok bir kez
     (yenileme, tekrar işleme ya da eşik etrafında dalgalanma ikinci bildirim üretmez).
   Saf fonksiyonlar: tarayıcı deposundan bağımsız, testte doğrudan çalışır.
   ========================================================================== */

export interface ThresholdPref {
  entityId: string;
  /** 1–10, 0,1 adım */
  threshold: number;
  /** "aşınca haber ver" açık mı? Kapalıyken eşik saklanır, bildirim üretilmez. */
  notify: boolean;
  updatedAt: string;
}

/** Bir Gidenler puanı değişimi (sunumda senaryo). Deneyim sayıları olayın kendi penceresi içindir ve simülasyondur. */
export interface ScoreEvent {
  id: string;
  entityId: string;
  from: number;
  to: number;
  newExperiences: number;
  /** yeni deneyimlerden doğrulanmış ziyarete bağlı olanlar (≤ newExperiences). Yalnız Google ile giriş yapmış olmak doğrulama sayılmaz. */
  verifiedExperiences: number;
  simulated: true;
}

export interface ThresholdNotice {
  id: string;
  eventId: string;
  entityId: string;
  slug: string;
  name: string;
  from: number;
  to: number;
  threshold: number;
  newExperiences: number;
  verifiedExperiences: number;
  createdAt: string;
  read: boolean;
  /** bildirimden gidilebilecek bölümler (mekân sayfasında gerçekten varsa) */
  links: { menu: boolean; reservation: boolean };
  simulated: true;
}

/** Güven koşulu: olay penceresinde en az 5 yeni deneyim, en az 2'si doğrulanmış ziyaret. */
export const MIN_NEW_EXPERIENCES = 5;
export const MIN_VERIFIED = 2;

/** puanlar ekranda tek ondalıkla görünür; karşılaştırma da aynı yuvarlamayla yapılır (8,25 → 8,3) */
const r1 = (n: number) => Math.round(n * 10) / 10;
export const clampThreshold = (n: number) => (Number.isFinite(n) ? Math.min(10, Math.max(1, r1(n))) : 1);
export const eventId = (entityId: string, from: number, to: number, newExperiences: number, verified: number) =>
  `esik:${entityId}:${score1(from)}>${score1(to)}:${newExperiences}/${verified}`;

/* "8,3'ü" / "8,4'e": ondalığın son rakamının okunuşuna göre ek. */
const ACC = ["ı", "i", "yi", "ü", "ü", "i", "yı", "yi", "i", "u"];
const DAT = ["a", "e", "ye", "e", "e", "e", "ya", "ye", "e", "a"];
const last = (n: number) => Number(score1(n).slice(-1));
export const withAcc = (n: number) => `${score1(n)}'${ACC[last(n)]}`;
export const withDat = (n: number) => `${score1(n)}'${DAT[last(n)]}`;

/** Örnek bildirim metni. */
export const noticeText = (n: Pick<ThresholdNotice, "threshold" | "to">) =>
  `Beklediğin seviyeye geldi. Bu restoran, seçtiğin ${score1(n.threshold)} eşiğini aşarak ${withDat(n.to)} ulaştı.`;

export type ThresholdState =
  | "yok"           // eşik seçilmedi
  | "kapali"        // takip kapalı
  | "bekleniyor"    // Gidenler puanı henüz oluşmadı
  | "altinda"       // eşiğin altında
  | "karsiliyor"    // olay öncesi puan zaten eşiğin üzerinde
  | "yetersiz"      // eşik aşıldı ama güven koşulu sağlanmadı
  | "asagi"         // puan eşiğin altına indi
  | "tekrar"        // bu eşik için bildirim zaten oluştu
  | "asti";         // alttan üste geçiş + güven koşulu → bildirim

const evidence = (ev: ScoreEvent) => {
  const u = ev.newExperiences - ev.verifiedExperiences;
  return `${ev.newExperiences} yeni deneyim, bunların ${ev.verifiedExperiences} tanesi doğrulanmış ziyaret${u > 0 ? `, ${u} tanesi doğrulanmamış` : ""} (simülasyon)`;
};

/** Bir olay, bir tercih için ne anlama gelir? Mesajlar dürüsttür: doğrulanmamış deneyim doğrulanmış diye sayılmaz. */
export function evaluate(pref: ThresholdPref, ev: ScoreEvent): { state: ThresholdState; message: string } {
  const t = pref.threshold, from = r1(ev.from), to = r1(ev.to);
  if (!pref.notify) return { state: "kapali", message: "Takip kapalı; bildirim oluşmadı." };
  if (from > t && to > t) return { state: "karsiliyor", message: `Bu seviyeyi zaten karşılıyor (${score1(from)} > ${score1(t)}); yeni yükselmiş gibi bildirim üretilmedi.` };
  if (from > t) return { state: "asagi", message: `Puan ${score1(from)} → ${score1(to)} ile eşiğinin altına indi; bildirim yok.` };
  if (to <= t) return { state: "altinda", message: `Puan ${score1(from)} → ${score1(to)}; seçtiğin ${score1(t)} eşiğinin altında kaldı. Bildirim yok.` };
  if (ev.newExperiences < MIN_NEW_EXPERIENCES || ev.verifiedExperiences < MIN_VERIFIED)
    return { state: "yetersiz", message: `Puan ${withDat(to)} çıktı ama güven koşulu sağlanmadı: ${evidence(ev)}. Gerekli: en az ${MIN_NEW_EXPERIENCES} yeni deneyim ve ${MIN_VERIFIED} doğrulanmış ziyaret. Bildirim yok.` };
  return { state: "asti", message: `${noticeText({ threshold: t, to })} Dayanak: ${evidence(ev)}.` };
}

/**
 * Olayı işler: gerekiyorsa TEK bildirim üretir. Aynı restoran ve aynı eşik için bildirim varsa (yenileme,
 * tekrar oynatma, eşik etrafında dalgalanma) yenisi üretilmez. Tercihe ve başka hiçbir veriye dokunmaz.
 */
export function processEvent(
  notices: ThresholdNotice[], pref: ThresholdPref | undefined, ev: ScoreEvent,
  venue: { slug: string; name: string; menu: boolean; reservation: boolean }, now: string,
): { notices: ThresholdNotice[]; state: ThresholdState; message: string; created: boolean } {
  if (!pref) return { notices, state: "yok", message: "Bu restoran için deneme eşiği seçilmedi; bildirim yok.", created: false };
  const r = evaluate(pref, ev);
  if (r.state !== "asti") return { notices, ...r, created: false };
  if (notices.some((n) => n.entityId === ev.entityId && n.threshold === pref.threshold))
    return { notices, state: "tekrar", message: `Bu eşik (${score1(pref.threshold)}) için örnek bildirim zaten oluştu; aynı aşım ya da eşik etrafındaki dalgalanma ikinci bildirim üretmez.`, created: false };
  const notice: ThresholdNotice = {
    id: `${ev.id}@${pref.threshold}`, eventId: ev.id, entityId: ev.entityId, slug: venue.slug, name: venue.name, from: ev.from, to: ev.to, threshold: pref.threshold,
    newExperiences: ev.newExperiences, verifiedExperiences: ev.verifiedExperiences, createdAt: now, read: false, links: { menu: venue.menu, reservation: venue.reservation }, simulated: true,
  };
  return { notices: [notice, ...notices].slice(0, 20), ...r, created: true };
}

/** Olay yokken kartın durumu: güncel Gidenler puanına göre. */
export function standing(pref: ThresholdPref, current: number | null): { state: ThresholdState; message: string } {
  if (current === null) return { state: "bekleniyor", message: "Yeterli deneyim oluşması bekleniyor; Gidenler puanı oluşunca eşiğinle karşılaştırırız." };
  if (r1(current) > pref.threshold) return { state: "karsiliyor", message: `Bu seviyeyi zaten karşılıyor (${score1(current)} > ${score1(pref.threshold)}).` };
  if (!pref.notify) return { state: "kapali", message: "Takip kapalı; eşiğin saklı, bildirim oluşmaz." };
  return { state: "altinda", message: `Eşiğine ${score1(pref.threshold - r1(current))} puan var. Güven koşuluyla aşarsa haber veririz.` };
}
