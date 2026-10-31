"use client";

import Link from "next/link";
import { getEntityById } from "@/data/entities";
import { useUserData } from "@/lib/store";

/* Kullanıcının kendi "gitmek istiyorum" listesi; boşsa hiç çizilmez. */
export function WantList() {
  const data = useUserData();
  const list = Object.values(data.relationships).filter((r) => r.state === "want_to_go").map((r) => getEntityById(r.entityId)).filter(Boolean).slice(0, 8);
  if (!list.length) return null;
  return (
    <section aria-labelledby="k-ist">
      <div className="kunye"><h2 id="k-ist">Gitmek istediklerin</h2><Link href="/benim/" className="text-[12px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4">Tümü →</Link></div>
      <ul className="mt-3 grid border-t border-line sm:grid-cols-2 sm:gap-x-8">
        {list.map((e) => <li key={e!.id} className="border-b border-line"><Link href={`/mekan/${e!.slug}/`} className="flex min-h-12 items-center text-[16px] font-bold hover:text-accent-ink">{e!.name}</Link></li>)}
      </ul>
    </section>
  );
}
