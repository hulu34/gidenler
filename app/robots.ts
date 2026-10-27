import type { MetadataRoute } from "next";
import { DEMO_VISIBLE } from "@/data/demoFlag";

/* Demo önizlemeler, işletme panelleri ve API arama motorlarına kapalı; demo mekân ve profil sayfaları
   ayrıca kendi meta etiketleriyle (noindex) kapatılır. */
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  /* Yatırımcı demosu: tümü kapalı. */
  if (DEMO_VISIBLE) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/demo/", "/gidenler-100/onizleme/", "/isletme/"] },
    host: "https://www.gidenler.com",
  };
}
