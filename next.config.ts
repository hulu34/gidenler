import type { NextConfig } from "next";

/**
 * `output: "export"` üretir: backend yokken statik olarak servis edilebilir.
 * Gerçek backend bağlandığında bu satır kaldırılır, SSR/ISR devreye girer.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // Alt dizinde yayın (ör. GitHub Pages) için; boşsa kök dizin.
  basePath: process.env.NEXT_BASE_PATH || "",
};

export default nextConfig;
