"use client";

import Link from "next/link";
import { useReservations } from "./store";

/* Benim Gidenler'im · Rezervasyonlarım — tarayıcıda tutulan kayıtlar (ad/telefon saklanmaz). */
export function MyReservations() {
  const list = useReservations();
  if (!list.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section className="mt-8 border-t-2 border-line-strong pt-6" aria-labelledby="h-rzv">
      <h2 id="h-rzv" className="text-[13px] font-bold uppercase tracking-[0.2em]">Rezervasyonlarım</h2>
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {list.map((r) => {
          const past = r.date < today;
          return (
            <li key={r.code} className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 ${past ? "opacity-60" : ""}`}>
              <span className="flex flex-col">
                <Link href={`/mekan/${r.entitySlug}/`} className="text-[16px] font-bold hover:text-accent-ink">{r.entityName}</Link>
                <span className="tnum text-[13px] text-ink-2">{new Date(r.date + "T12:00:00").toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "long" })} · {r.time} · {r.party} kişi</span>
              </span>
              <span className="flex items-baseline gap-3 text-[12px]">
                <span className="tnum font-semibold text-ink-3">{r.code}</span>
                <span className={`rounded-full border px-2 py-px font-semibold ${r.status === "önizleme" ? "border-line-2 text-ink-3" : "border-pos text-pos-ink"}`}>{past ? "geçti" : r.status}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
