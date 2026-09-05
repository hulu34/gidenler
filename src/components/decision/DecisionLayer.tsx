"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getDecision, getTimingVerdict, listDecisionContexts } from "@/lib/decision";
import type { DecisionContextKey } from "@/lib/types";
import { DecisionCard } from "@/components/decision/DecisionCard";
import { TimingCard } from "@/components/decision/TimingCard";

/**
 * TOPIC PAGE — karar katmanı.
 * İlk 10 saniye: karar. Sonraki 30 saniye: neden. Sonra veri, sonra deneyimler.
 * Bağlam seçici aynı mekânın aynı kişi için her durumda aynı sonucu
 * vermediğini gösterir (date %94, çocukla %48 gibi).
 */
export function DecisionLayer({ entityId, entitySlug, entityName, compareWith }: {
  entityId: string; entitySlug: string; entityName: string; compareWith?: { slug: string; name: string };
}) {
  const [ctx, setCtx] = useState<DecisionContextKey>("default");
  const [showWhy, setShowWhy] = useState(true);
  const contexts = listDecisionContexts();
  const decision = useMemo(() => getDecision(entityId, ctx), [entityId, ctx]);
  const timing = useMemo(() => getTimingVerdict(entityId), [entityId]);
  if (!decision) return null;

  return (
    <section className="border-t-2 border-line-strong pt-7" aria-labelledby="sanagore">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="sanagore" className="text-[13px] font-bold uppercase tracking-[0.2em]">Gitmeli misin?</h2>
        <span className="border border-dashed border-line-2 px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.12em] text-ink-3">
          demo profil · @atlasdemo
        </span>
      </div>

      <div className="mt-5 grid gap-x-14 gap-y-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-5">
          <DecisionCard decision={decision} showWhy={showWhy} />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-semibold uppercase tracking-[0.1em]">
            <button type="button" onClick={() => setShowWhy((v) => !v)} className="border-b-2 border-accent pb-0.5 text-ink">
              {showWhy ? "Nedenleri gizle" : `Neden %${decision.personalMatch}?`}
            </button>
            {compareWith && (
              <Link href={`/karsilastir/?a=${entitySlug}&b=${compareWith.slug}`} className="text-ink-3 hover:text-ink">
                {compareWith.name} ile karşılaştır
              </Link>
            )}
            <Link href="/sor/" className="text-ink-3 hover:text-ink">Sor Gidenler</Link>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <span className="label">Ne için gidiyorsun?</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {contexts.map((c) => (
                <button
                  key={c.key} type="button" onClick={() => setCtx(c.key)}
                  aria-pressed={ctx === c.key}
                  className={`h-8 border px-3 text-[13px] font-semibold ${ctx === c.key ? "border-accent bg-accent text-on-accent" : "border-line-2 hover:border-ink"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] leading-snug text-ink-3">
              Bağlam profilini değiştirmez; yalnızca bu karar için öncelikleri geçici olarak kaydırır.
            </p>
          </div>
          {timing && <TimingCard t={timing} />}
        </div>
      </div>

      <p className="mt-6 max-w-[72ch] border-t border-line pt-3 text-[12px] leading-relaxed text-ink-3">
        <strong className="font-semibold text-ink-2">Uyum, Gidenler puanı değildir.</strong> Puan {entityName} hakkında
        topluluğun deneyimlerinden çıkar; uyum senin zevk profilinle bu deneyimler arasındaki ilişkidir. İkisi toplanmaz.
        Zevk profili prototipte elle yazılmış demo veridir; gerçekte kendi deneyimlerinden öğrenilir ve varsayılan olarak özeldir.
      </p>
    </section>
  );
}
