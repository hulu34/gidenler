/* GOOGLE PUANI ROZETİ (ana sayfa V8) — 5 üzerinden, kaynağı açıkça "Google". Gidenler puanı (10 üzerinden, ScoreNumber)
   ile görsel olarak karışmaz: yıldız + "/5" + "Google" etiketi. Değerlendirme sayısı yoksa yazılmaz (uydurulmaz). */
const f1 = (x: number) => x.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function GBadge({ rating, count = null, size = "md" }: { rating: number; count?: number | null; size?: "lg" | "md" | "sm" }) {
  const num = size === "lg" ? "text-[24px] sm:text-[26px]" : size === "md" ? "text-[19px]" : "text-[15px]";
  return (
    <span className="inline-flex flex-col items-end leading-none" data-gpuan={f1(rating)} aria-label={`Google puanı ${f1(rating)} / 5`}>
      <span className="inline-flex items-baseline gap-1">
        <span aria-hidden className={`${size === "sm" ? "text-[11px]" : "text-[13px]"} text-[#d99a00]`}>★</span>
        <span className={`tnum font-extrabold tracking-[-0.03em] text-ink ${num}`}>{f1(rating)}</span>
        <span className="tnum text-[11px] font-semibold text-ink-3">/5</span>
      </span>
      <span className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-3">
        Google{count != null ? <span className="font-semibold normal-case tracking-normal"> · {count.toLocaleString("tr-TR")}</span> : null}
      </span>
    </span>
  );
}
