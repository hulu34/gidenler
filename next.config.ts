import type { NextConfig } from "next";

/**
 * İKİ DAĞITIM MODU — tek kod tabanı.
 *
 *  · NEXT_OUTPUT=export  → statik önizleme (GitHub Pages). Backend yok; API route'ları derlemeye girmez,
 *                          "Gidenler AI'a Sor" tarayıcıdaki deterministik karar motoruyla çalışır.
 *  · (varsayılan)        → sunucu modu (Vercel / Node). app/api/.../route.ts route handler'ları etkin;
 *                          model çağrıları yalnızca sunucuda, API anahtarları yalnızca sunucu ortam değişkenlerinde.
 *
 * Statik export'ta POST route handler'ları derlenemez. Export modunda sayfa uzantıları "tsx"/"js" olduğu için
 * app/api/.../route.ts dosyaları görünmez olur; sunucu modunda normal route handler'ı gibi davranır.
 * (Önceki "route.api.ts" yöntemi Vercel derlemesinde manifest hatası veriyordu.)
 */
const isExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  ...(isExport ? { output: "export" as const } : {}),
  images: { unoptimized: true },
  trailingSlash: true,
  // Alt dizinde yayın (ör. GitHub Pages) için; boşsa kök dizin.
  basePath: process.env.NEXT_BASE_PATH || "",
  // Export modunda yalnızca .tsx (+js) sayfalar: app/api/.../route.ts derlemeye girmez (app altında başka .ts sayfa yok;
  // tek uzantı webpack çözümlemesini bozduğu için "js" de listede).
  // Sunucu modunda varsayılan uzantılar (Vercel'in Next.js derleyicisi özel "api.ts" uzantısını izleyemiyor).
  pageExtensions: isExport ? ["tsx", "js"] : ["tsx", "ts"],
  // İstemciye giden tek yapılandırma: basePath (gizli değil). API anahtarları ve AI_* değerleri yalnızca sunucuda kalır.
  env: { NEXT_PUBLIC_BASE_PATH: process.env.NEXT_BASE_PATH || "" },
  serverExternalPackages: [],
  ...(!isExport ? {
    async headers() {
      return [
        /* Kendi sunduğumuz görseller içerik adına göre sabit: uzun süreli, değişmez önbellek. */
        { source: "/media/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
        /* Yatırımcı demosu: her yanıtta arama motoru yasağı (meta etiketine ek olarak başlık). */
        ...(process.env.NEXT_PUBLIC_SHOW_DEMO === "true" ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] }] : []),
      ];
    },
  } : {}),
};

export default nextConfig;
