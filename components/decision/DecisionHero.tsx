"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  decisionProvenance, effectiveProfile, getDecision, getPersonalMatch, getTimingVerdict, listDecisionContexts,
} from "@/lib/decision";
import { useUserData } from "@/lib/store";
import type { DecisionContextKey, Decision } from "@/lib/types";
import { WhyThisResult } from "@/components/decision/WhyThisResult";
import { TimingCard } from "@/components/decision/TimingCard";
import { EntityActions } from "@/components/decision/EntityActions";
import { RecommendationFeedback } from "@/components/decision/RecommendationFeedback";

const VERDICT_TONE: Record<Decision["verdict"], string> = {
  "Kesinlikle gidilir": "text-pos-ink", "Gidilir": "text-pos-ink", "Sana bağlı": "text-ink",
  "Biraz bekle": "text-warn", "Şimdilik pas geç": "text-neg-ink",
};

/**
 * TOPIC DECISION HERO — ilk viewport'ta karar.
 * 1 uyum · 1 hüküm · 3 neden · 1–2 risk · eylem. Sonra detay.
 * Bir karar kartı gibi; dashboard gibi değil. Mobile-first.
 */
export function DecisionHero({ entityId, entitySlug, entityName, compareWith }: {
  entityId: string; entitySlug: string; entityName: string; compareWith?: { slug: string; name: string };
}) {
  const data = useUserData();
  const [ctx, setCtx] = useState<DecisionContextKey>("default");
  const [why, setWhy] = useState(false);
  const contexts = listDecisionContexts();
  const profile = useMemo(() => effectiveProfile(data.taste), [data.taste]);
  const decision = useMemo(() => getDecision(entityId, ctx, undefined, profile), [entityId, ctx, profile]);
  const match = useMemo(() => getPersonalMatch(entityId, ctx, undefined, undefined, profile), [entityId, ctx, profile]);
  const prov = useMemo(() => decisionProvenance(entityId, match), [entityId, match]);
  const timing = useMemo(() => getTimingVerdict(entityId), [entityId]);
  if (!decision) return null;
  const edited = Object.keys(data.taste.dimensions).length > 0 || Object.keys(data.taste.cuisines).length > 0 || data.taste.dislikes.length > 0;

  return (
    <section className="border-t-2 border-line-strong pt-6" aria-labelledby="karar-h">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="karar-h" className="text-[13px] font-bold uppercase tracking-[0.2em]">Sana göre</h2>
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
          <span className="border border-dashed border-line-2 px-1.5 py-px">demo profil{edited ? " · düzenlendi" : ""}</span>
          <Link href="/zevkim/" className="underline decoration-line-2 underline-offset-4 hover:text-ink">Zevkim</Link>
        </span>
      </div>

      <div className="mt-5 grid gap-x-14 gap-y-8 lg:grid-cols-[1.45fr_1fr]">
        {/* ── karar kartı ── */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end gap-x-7 gap-y-2">
            <span className="flex items-baseline gap-2">
              <span className="text-[clamp(3.25rem,10vw,5rem)] font-extrabold leading-none tracking-[-0.055em] text-accent-ink">%{decision.personalMatch}</span>
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">uyum</span>
            </span>
            <span className="flex flex-col gap-1 pb-1.5">
              <span className={`text-[clamp(1.6rem,4.5vw,2.4rem)] font-extrabold leading-none tracking-[-0.035em] ${VERDICT_TONE[decision.verdict]}`}>{decision.verdict}</span>
              <span className="text-[12px] text-ink-3">{decision.timeContext}</span>
            </span>
          </div>

          <WhyThisResult reasons={decision.reasons.slice(0, 3)} warnings={decision.warnings.slice(0, 2)} />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] font-semibold">
            <button type="button" onClick={() => setWhy((v) => !v)} aria-expanded={why} className="border-b-2 border-accent pb-0.5 text-ink">
              {why ? "Nedenleri gizle" : `Neden %${decision.personalMatch}?`}
            </button>
            {compareWith && <Link href={`/karsilastir/?a=${entitySlug}&b=${compareWith.slug}`} className="text-ink-3 hover:text-ink">{compareWith.name} ile karşılaştır</Link>}
            <Link href="/sor/" className="text-ink-3 hover:text-ink">Sor Gidenler</Link>
            <Link href={`/birlikte/?g=abc123`} className="text-ink-3 hover:text-ink">Birlikte Nereye?</Link>
          </div>

          {why && prov && (
            <div className="flex flex-col gap-3 border-l-2 border-line pl-4" aria-label="Bu sayı nereden çıktı">
              <span className="label">Bu sonuç şunlardan oluşturuldu</span>
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[13.5px]">
                {prov.derivedFrom.map((d) => <li key={d} className="font-semibold text-ink">{d}</li>)}
              </ul>
              <WhyThisResult reasons={decision.reasons} warnings={decision.warnings} compact />
              <p className="text-[12px] leading-relaxed text-ink-3">
                {prov.timeWindow} · {prov.sourceCount} deneyim, {prov.verifiedCount} doğrulanmış · güncellendi {prov.lastUpdated}.{" "}
                <strong className="font-semibold text-ink-2">Uyum Gidenler puanı değildir;</strong> puan topluluğun deneyimlerinden çıkar, uyum senin zevk profilinle bu deneyimler arasındaki ilişkidir. Prototipte profil demodur; gerçekte kendi deneyimlerinden öğrenilir.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <EntityActions entityId={entityId} entitySlug={entitySlug} entityName={entityName} via="topic" />
            <RecommendationFeedback entityId={entityId} surface="topic" />
          </div>
        </div>

        {/* ── bağlam + zaman ── */}
        <div className="flex flex-col gap-6">
          <div>
            <span className="label">Ne için gidiyorsun?</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {contexts.map((c) => (
                <button key={c.key} type="button" onClick={() => setCtx(c.key)} aria-pressed={ctx === c.key}
                  className={`h-8 border px-3 text-[13px] font-semibold ${ctx === c.key ? "border-accent bg-accent text-on-accent" : "border-line-2 hover:border-ink"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] leading-snug text-ink-3">Aynı mekân her durumda aynı değil. Bağlam profilini değiştirmez; bu karar için öncelikleri geçici kaydırır.</p>
          </div>
          {timing && <TimingCard t={timing} />}
        </div>
      </div>
    </section>
  );
}

/** Mobilde yapışkan eylem çubuğu — içeriği kapatmaz, yalnızca dar ekranda. */
export function MobileActionBar({ entityId, entitySlug }: { entityId: string; entitySlug: string }) {
  const data = useUserData();
  const state = data.relationships[entityId]?.state ?? "none";
  if (state !== "none" && state !== "saved") return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line-strong bg-paper/95 px-5 py-2.5 backdrop-blur-sm sm:hidden">
      <EntityActions entityId={entityId} entitySlug={entitySlug} variant="compact" via="topic-mobile" />
    </div>
  );
}
