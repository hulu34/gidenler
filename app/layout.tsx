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
import { AccountSync } from "@/components/auth/AccountSync";
import { DEMO_VISIBLE } from "@/data/demoFlag";
import { seckiNavVisible } from "@/lib/seckisi";

export const metadata: Metadata = {
  title: {
    default: "Gidenler — gidenler bilir.",
    template: "%s · Gidenler",
  },
  description:
    "Gidenler, dağınık deneyim sinyallerini karara dönüştürür. Restoran, kafe, otel, film ve daha fazlası için gerçek deneyimlerden üretilmiş puanlar.",
  applicationName: "Gidenler",
  /* Yatırımcı demosu arama motorlarına tamamen kapalı. */
  ...(DEMO_VISIBLE ? { robots: { index: false, follow: false, nocache: true } } : {}),
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
        {DEMO_VISIBLE && (
          <div role="note" className="sticky top-0 z-[60] bg-ink px-4 py-1.5 text-center text-[11.5px] font-bold uppercase tracking-[0.14em] text-paper">
            Yatırımcı demosu · puanlar, deneyimler ve kişiler sentetiktir · gerçek bir işletmeye ait değildir
          </div>
        )}
        <DemoBoot />
        {!DEMO_VISIBLE && <AccountSync />}
        <Header showSeckisi={seckiNavVisible()} />
        <main id="icerik">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
