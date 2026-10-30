import { DEMO_VISIBLE } from "@/data/demoFlag";

/* Araç sayfası: bağlantılar izlenir, sayfa dizine girmez. */
export const metadata = { robots: { index: false, follow: !DEMO_VISIBLE } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
