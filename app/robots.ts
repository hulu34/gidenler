import type { MetadataRoute } from "next";

/* Demo önizlemeler, işletme panelleri ve API arama motorlarına kapalı; demo mekân ve profil sayfaları
   ayrıca kendi meta etiketleriyle (noindex) kapatılır. */
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/demo/", "/gidenler-100/onizleme/", "/isletme/"] },
    host: "https://www.gidenler.com",
  };
}
