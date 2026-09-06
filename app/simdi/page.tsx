"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { gidenlerNow, listDecisionContexts } from "@/lib/decision";
import type { DecisionContextKey } from "@/lib/types";
import { DecisionCard } from "@/components/decision/DecisionCard";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { EntityActions } from "@/components/decision/EntityActions";

/**
 * GİDENLER NOW — "bu akşam nereye?"
 * Zaman, bağlam ve zevk profilinden üretilir. Canlı masa, kalabalık veya
 * bekleme süresi gibi elimizde olmayan veriler üretilmez.
 */
export default function NowPage() {
  const [ctx, setCtx] = useState<DecisionContextKey>("default");
  const items = useMemo(() => gidenlerNow(ctx), [ctx]);
  const contexts = listDecisionContexts();

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <section className="pt-10 sm:pt-14">
        <p className="label">Gidenler Now</p>
        <h1 className="mt-2 max-w-[16ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">
          Bu akşam sana göre
        </h1>
        <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-ink-2">
          Akşam açık olan yerler, senin zevk profilinle ve son 90 günün deneyimleriyle sıralandı.
        </p>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {contexts.map((c) => (
            <button key={c.key} type="button" onClick={() => setCtx(c.key)} aria-pressed={ctx === c.key}
              className={`h-8 border px-3 text-[13px] font-semibold ${ctx === c.key ? "border-accent bg-accent text-on-accent" : "border-line-2 hover:border-ink"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <ol className="mt-8 border-t-2 border-line-strong">
        {items.map(({ card, decision }, i) => (
          <li key={card.entity.id} className="grid gap-x-10 gap-y-3 border-b border-line py-7 sm:grid-cols-[auto_1fr]">
            <span className="tnum text-[13px] font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex flex-col gap-3">
              <DecisionCard decision={decision!} entityName={card.entity.name} entitySlug={card.entity.slug} compact />
              <EntityActions entityId={card.entity.id} entitySlug={card.entity.slug} entityName={card.entity.name} variant="compact" via="now" />
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-[13px] text-ink-3">
        Daha özel bir durum mu var? <Link href="/sor/" className="underline underline-offset-4 hover:text-ink">Sor Gidenler</Link>.
      </p>
      <div className="mt-12"><DemoNotice>Bu sayfa "şu an masa var" demez; canlı müsaitlik verisi yoktur. Sıralama demo zevk profiline ve deneyim verisine dayanır.</DemoNotice></div>
    </div>
  );
}
