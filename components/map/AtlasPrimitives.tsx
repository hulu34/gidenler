import type { ReactNode } from "react";
import styles from "./atlas.module.css";

export function AtlasIcon({ name, size = 19 }: { name: "search" | "share" | "pin" | "arrow" | "list" | "layers" | "scope" | "check" | "close"; size?: number }) {
  const shape: Record<typeof name, ReactNode> = {
    search: <><circle cx="10.8" cy="10.8" r="5.8" /><path d="m15 15 4.2 4.2" /></>,
    share: <><path d="M12 15V3m-4 4 4-4 4 4M6 11H4v10h16V11h-2" /></>,
    pin: <><path d="M19 10.2c0 4.2-7 10.2-7 10.2s-7-6-7-10.2a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    list: <path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1" />,
    layers: <><path d="M3 8 12 3l9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5" /></>,
    scope: <><circle cx="12" cy="12" r="6.5" /><path d="M12 2v5m0 10v5M2 12h5m10 0h5" /></>,
    check: <path d="m5 12 4.5 4.5L19 7" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{shape[name]}</svg>;
}

export function AtlasEtiket({ children }: { children: ReactNode }) {
  return <span className={styles.eyebrow}>{children}</span>;
}

export function AtlasSayi({ value, label }: { value: number; label: string }) {
  return <span className={styles.metric}><strong>{value.toLocaleString("tr-TR")}</strong><span>{label}</span></span>;
}
