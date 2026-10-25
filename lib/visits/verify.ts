/* ==========================================================================
   ZİYARET DOĞRULAMA — çok sinyalli, kod tek başına kanıt DEĞİLDİR.
   --------------------------------------------------------------------------
   GDN rezervasyon kodu yalnız "bu hesap bu mekânda bu saate masa istedi" bilgisidir.
   Kod alınıp hiç gidilmeyebilir, başkasına verilebilir, işletme kendi hesaplarına
   sahte rezervasyon yaptırabilir. Bu yüzden doğrulama düzeyi sinyallerin TOPLAMINDAN gelir
   ve "güçlü" düzey için en az bir BAĞIMSIZ sinyal (işletmenin oturdu işareti ya da fiş)
   gerekir. Sinyal ağırlıkları kamuya açıklanmaz (kötüye kullanımı zorlaştırmak için);
   hangi sinyallerin kullanıldığı açıklanır.
   ========================================================================== */

export type SignalKind =
  | "reservation_created"     // GDN kodu üretildi (talep)
  | "business_seated"         // ortak işletme panelinde "geldi / oturdu" işareti
  | "code_redeemed"           // işletme kodu kendi panelinde girdi (masada)
  | "geo_checkin"             // kullanıcı mekâna ≤ 75 m, rezervasyon saatinin ±2 saati içinde
  | "receipt"                 // fiş: tarih + işletme adı/vergi no eşleşmesi (otomatik + örneklemeyle insan)
  | "account_history";        // hesap yaşı ve önceki güvenilir deneyimler (yalnız destekleyici)

export interface Signal { kind: SignalKind; at: string; ref?: string }

/** İç ağırlıklar — yayımlanmaz. */
const W: Record<SignalKind, number> = {
  reservation_created: 0.1,
  business_seated: 0.55,
  code_redeemed: 0.45,
  geo_checkin: 0.2,
  receipt: 0.45,
  account_history: 0.1,
};
const INDEPENDENT: SignalKind[] = ["business_seated", "code_redeemed", "receipt"];

export type Flag =
  | "related_account"         // yazar işletmeyle ilişkili (sahip/çalışan) → puana girmez
  | "self_seated_burst"       // işletme kısa sürede çok sayıda yeni hesaba "oturdu" işareti verdi
  | "code_reused"             // aynı kodla ikinci deneyim denemesi
  | "outside_window"          // deneyim, rezervasyondan 30 günden sonra ya da önce yazıldı
  | "geo_only"                // yalnız konum sinyali
  | "receipt_duplicate"       // aynı fiş görüntüsü başka hesapta
  | "new_account_cluster";    // aynı cihaz/ağdan kısa sürede çok hesap (karma kimlikle)

export interface VerifyContext {
  reservationAt?: string;     // rezervasyon zamanı (varsa)
  reviewAt: string;           // deneyimin yazıldığı an
  authorRelatedToBusiness?: boolean;
  codeAlreadyUsed?: boolean;
  receiptDuplicate?: boolean;
  businessSeatedBurst?: boolean;
  accountCluster?: boolean;
}

export type Level = "none" | "weak" | "likely" | "strong";

export function assess(signals: Signal[], ctx: VerifyContext) {
  const kinds = new Set(signals.map((s) => s.kind));
  const flags: Flag[] = [];
  if (ctx.authorRelatedToBusiness) flags.push("related_account");
  if (ctx.codeAlreadyUsed) flags.push("code_reused");
  if (ctx.receiptDuplicate) flags.push("receipt_duplicate");
  if (ctx.businessSeatedBurst) flags.push("self_seated_burst");
  if (ctx.accountCluster) flags.push("new_account_cluster");
  if (ctx.reservationAt) {
    const days = (Date.parse(ctx.reviewAt) - Date.parse(ctx.reservationAt)) / 86_400_000;
    if (days < 0 || days > 30) flags.push("outside_window");
  }
  if (kinds.size === 1 && kinds.has("geo_checkin")) flags.push("geo_only");

  let conf = 0;
  for (const k of kinds) {
    let w = W[k];
    /* işletme kaynaklı sinyal, işletme şüpheli patlama yaptıysa değersiz */
    if ((k === "business_seated" || k === "code_redeemed") && ctx.businessSeatedBurst) w = 0;
    if (k === "receipt" && ctx.receiptDuplicate) w = 0;
    conf += w;
  }
  conf = Math.min(1, conf);

  const hasIndependent = INDEPENDENT.some((k) => kinds.has(k)) && !ctx.businessSeatedBurst;
  let level: Level = conf >= 0.8 && hasIndependent ? "strong" : conf >= 0.5 && hasIndependent ? "likely" : conf >= 0.2 ? "weak" : "none";

  /* sert kurallar */
  if (flags.includes("code_reused") || flags.includes("outside_window")) level = level === "none" ? "none" : "weak";
  if (flags.includes("related_account")) level = "none";
  if (flags.includes("new_account_cluster") && level !== "none") level = "weak";

  return { level, confidence: Math.round(conf * 100) / 100, flags, countsAsVerified: level === "strong" || level === "likely" };
}

/** Kamuya açık açıklama (metodoloji sayfası). */
export const PUBLIC_VERIFICATION_TEXT = [
  "Ziyaret, birden fazla sinyalle doğrulanır: işletmenin masada onayı, fiş, konum ve rezervasyon kaydı gibi.",
  "Yalnız rezervasyon kodu, yalnız konum ya da yalnız hesap geçmişi ziyareti doğrulamaz.",
  "İşletme sahibi ve çalışanlarının deneyimleri doğrulanmış sayılmaz ve puana girmez.",
  "Şüpheli örüntüler (toplu hesaplar, aynı fişin tekrarı, işletmenin toplu onayları) doğrulamayı düşürür ve incelemeye alınır.",
] as const;
