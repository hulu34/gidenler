export type DeliveryOutcome = "forwarded" | "unavailable" | "failed";

export async function forwardReservation(
  hook: string | undefined,
  record: unknown,
  opts: { fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<DeliveryOutcome> {
  if (!hook) return "unavailable";
  let url: URL;
  try { url = new URL(hook); } catch { return "unavailable"; }
  if (url.protocol !== "https:") return "unavailable";
  const f = opts.fetch ?? fetch;
  try {
    const res = await f(url, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(record),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 8000), redirect: "error",
    });
    return res.status >= 200 && res.status < 300 ? "forwarded" : "failed";
  } catch {
    return "failed";
  }
}

export function reservationResponse(isDemo: boolean, outcome: DeliveryOutcome | null, code: string):
  { status: number; body: { code?: string; status?: "önizleme" | "talep"; forwarded: boolean; error?: string } } {
  if (isDemo) return { status: 201, body: { code, status: "önizleme", forwarded: false } };
  if (outcome === "forwarded") return { status: 201, body: { code, status: "talep", forwarded: true } };
  if (outcome === "failed") return { status: 502, body: { error: "delivery_failed", forwarded: false } };
  return { status: 503, body: { error: "reservation_unavailable", forwarded: false } };
}

export function reservationErrorText(error: unknown): string {
  switch (error) {
    case "slot_unavailable": return "Bu saat az önce doldu, başka bir saat seç.";
    case "rate_limited": return "Çok fazla deneme; biraz sonra tekrar dene.";
    case "invalid_request": return "Ad ve telefonu kontrol et (telefon en az 10 hane).";
    case "reservation_unavailable": return "Bu mekân için çevrim içi rezervasyon şu an alınamıyor. Talebin işletmeye iletilmedi; lütfen işletmeyi telefonla ara.";
    case "delivery_failed": return "Talebin işletmeye iletilemedi. Rezervasyonun oluşmadı; biraz sonra tekrar dene ya da işletmeyi telefonla ara.";
    case "network": return "Bağlantı kurulamadı; talebin gönderilmedi. Tekrar dene.";
    default: return "Talep gönderilemedi; rezervasyonun oluşmadı. Tekrar dene.";
  }
}
