/* GOOGLE MAPS ATFI — resmî kurallar (Places API politikaları, Ekim 2026):
   · Yer varsa resmî Google Maps logosu (değiştirilmeden; yükseklik 16–19 px; boşluk sol/sağ/üst 10, alt 5 px;
     erişilebilirlik etiketi "Google Maps"). Düz zeminde dolgulu, fotoğraf üstünde dış çizgili sürüm.
   · Yer dar ise metin: "Google Maps" — çevrilmez (translate="no"), bölünmez, Roboto/sans-serif, 400,
     12–16 px, beyaz / #1F1F1F / #5E5E5E. */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Resmî logo. tone: "auto" düz açık zemin (gri), "white" koyu zemin (görüntüleyici), "outline" fotoğraf üstü. */
export function GoogleMapsLogo({ tone = "auto", className = "" }: { tone?: "auto" | "white" | "outline"; className?: string }) {
  if (tone === "outline") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`${BASE}/media/google/GoogleMaps_Logo_WithLightOutline.svg`} width={105} height={22} alt="Google Maps" translate="no" className={`h-[22px] w-auto ${className}`} />;
  }
  if (tone === "white") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`${BASE}/media/google/GoogleMaps_Logo_White.svg`} width={98} height={18} alt="Google Maps" translate="no" className={`h-[18px] w-auto ${className}`} />;
  }
  /* site yalnız açık (kâğıt) zeminli: düz zeminde gri resmî logo */
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${BASE}/media/google/GoogleMaps_Logo_Gray.svg`} width={98} height={18} alt="Google Maps" translate="no" className={`h-[18px] w-auto ${className}`} />;
}

/** Metin atfı (dar alan): kurala uygun yazı biçimi. */
export function GoogleMapsText({ tone = "gray" }: { tone?: "gray" | "white" }) {
  return (
    <span translate="no" style={{ fontFamily: "Roboto, sans-serif", fontStyle: "normal", fontWeight: 400, fontSize: 12, letterSpacing: "normal", whiteSpace: "nowrap", color: tone === "white" ? "#FFFFFF" : "#5E5E5E" }}>
      Google Maps
    </span>
  );
}
