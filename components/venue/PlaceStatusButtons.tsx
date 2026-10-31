"use client";

import Link from "next/link";
import { setEntityState, useUserData } from "@/lib/store";
import { useAccountStatus } from "@/lib/community/accountState";
import type { UserEntityState } from "@/lib/types";

/* GERÇEK MEKÂN · Kaydet / Gitmek istiyorum / Gittim — tek seçim; seçili olana yeniden dokununca kalkar.
   Giriş yapılmışsa hesapta saklanır (AccountSync), değilse bu cihazda. "Gittim" kişinin kendi beyanıdır,
   ziyaret doğrulaması değildir. */
const OPTIONS: Array<{ state: Exclude<UserEntityState, "none" | "experienced">; label: string }> = [
  { state: "saved", label: "Kaydet" },
  { state: "want_to_go", label: "Gitmek istiyorum" },
  { state: "visited", label: "Gittim" },
];

export function PlaceStatusButtons({ entityId }: { entityId: string }) {
  const data = useUserData();
  const account = useAccountStatus();
  const raw = data.relationships[entityId]?.state ?? "none";
  const current = raw === "experienced" ? "visited" : raw;
  const btn = "inline-flex h-11 items-center justify-center gap-1.5 rounded-[3px] border px-3.5 text-[14px] font-semibold whitespace-nowrap transition-colors";
  return (
    <div className="flex flex-col gap-1.5">
      <div role="group" aria-label="Bu mekân için durumun" className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => {
          const on = current === o.state;
          return (
            <button key={o.state} type="button" aria-pressed={on}
              onClick={() => setEntityState(entityId, on ? "none" : o.state, "venue")}
              className={`${btn} ${on ? "border-pos bg-pos/10 text-pos-ink" : "border-line-2 text-ink hover:border-ink"}`}>
              {on && <span aria-hidden>✓</span>}{o.label}
            </button>
          );
        })}
      </div>
      <p className="text-[12px] text-ink-3" aria-live="polite">
        <span className="block">Bunlar yalnız sana özel listelerdir; puanı etkilemez.</span>
        {account === "in" ? "Hesabında saklanıyor." : account === "anon"
          ? <>Bu cihazda saklanıyor. <Link href="/benim/" className="font-semibold underline decoration-line-2 underline-offset-4 hover:text-ink">Giriş yaparsan</Link> hesabına aktarılır.</>
          : account === "off" ? "Bu cihazda saklanıyor." : " "}
      </p>
    </div>
  );
}
