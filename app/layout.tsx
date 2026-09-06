import type { Metadata, Viewport } from "next";

/* Yazı karakterleri npm üzerinden self-host edilir: üçüncü taraf CDN'e
   istek gitmez (hız + KVKK), build ağ erişimi gerektirmez. */
import "@fontsource-variable/schibsted-grotesk";
import "@fontsource-variable/newsreader";
import "@fontsource/instrument-serif/latin-ext-400.css";
import "@fontsource/instrument-serif/latin-400.css";

import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DemoBoot } from "@/components/demo/DemoBoot";

export const metadata: Metadata = {
  title: {
    default: "Gidenler — gidenler bilir.",
    template: "%s · Gidenler",
  },
  description:
    "Gidenler, dağınık deneyim sinyallerini karara dönüştürür. Restoran, kafe, otel, film ve daha fazlası için gerçek deneyimlerden üretilmiş puanlar.",
  applicationName: "Gidenler",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
        >
          İçeriğe geç
        </a>
        <DemoBoot />
        <Header />
        <main id="icerik">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
