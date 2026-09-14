import type { NextConfig } from "next";

/**
 * İKİ DAĞITIM MODU — tek kod tabanı.
 *
 *  · NEXT_OUTPUT=export  → statik önizleme (GitHub Pages). Backend yok; API route'ları derlemeye girmez,
 *                          "Gidenler AI'a Sor" tarayıcıdaki deterministik karar motoruyla çalışır.
 *  · (varsayılan)        → sunucu modu (Vercel / Node). app/api/.../route.api.ts route handler'ları etkin;
 *                          model çağrıları yalnızca sunucuda, API anahtarları yalnızca sunucu ortam değişkenlerinde.
 *
 * Neden `route.api.ts`? Statik export'ta POST route handler'ları derlenemez. Sayfa uzantıları export modunda
 * "api.ts"i içermediği için bu dosyalar görünmez olur; sunucu modunda normal `route` handler'ı gibi davranır.
 */
const isExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  ...(isExport ? { output: "export" as const } : {}),
  images: { unoptimized: true },
  trailingSlash: true,
  // Alt dizinde yayın (ör. GitHub Pages) için; boşsa kök dizin.
  basePath: process.env.NEXT_BASE_PATH || "",
  pageExtensions: isExport ? ["tsx", "ts"] : ["api.ts", "tsx", "ts"],
  // İstemciye giden tek yapılandırma: basePath (gizli değil). API anahtarları ve AI_* değerleri yalnızca sunucuda kalır.
  env: { NEXT_PUBLIC_BASE_PATH: process.env.NEXT_BASE_PATH || "" },
  serverExternalPackages: [],
};

export default nextConfig;
