"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { askGidenler } from "@/lib/decision";
import { getEntityById } from "@/data/entities";
import { getTopicIntelligence } from "@/lib/api";
import { score1 } from "@/lib/format";
import { WhyThisResult } from "@/components/decision/WhyThisResult";
import { DemoNotice } from "@/components/ui/DemoNotice";

const ORNEKLER = [
  "Kadıköy'de sakin, iyi yemekli, 4 kişi gideceğimiz bir yer",
  "Nişantaşı'nda first date için nereyi seçeyim?",
  "Bu akşam iyi sushi nerede?",
  "Moda Lokantası mı Sakura mı?",
  "Çocukla pazar öğlen nereye gidelim?",
  "F/P önemli, atmosfer çok önemli değil — Beşiktaş",
];

const OVERRIDES = [
  ["F/P benim için daha önemli", " F/P önemli"],
  ["Atmosfer önemli değil", " atmosfer önemli değil"],
  ["Çocukla gidiyorum", " çocukla"],
  ["Kalabalık istemiyorum", " sakin"],
];

/**
 * SOR GİDENLER — aramanın üstünde konuşma dilinde karar katmanı.
 * Gerçek LLM yok: sorgu kurallarla anlaşılır, cevap Decision servisinden
 * gelir ve dayandığı sinyalleri gösterir. Hayali gerçek üretmez.
 */
export default function AskPage() {
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("q");
    if (p) { setQ(p); setAsked(p); }
  }, []);

  const result = useMemo(() => (asked.trim() ? askGidenler(asked) : null), [asked]);

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <section className="pt-10 sm:pt-14">
        <p className="label">Sor Gidenler</p>
        <h1 className="mt-2 max-w-[18ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">
          Nereye gitmek istiyorsun?
        </h1>
        <form
          onSubmit={(e) => { e.preventDefault(); setAsked(q); }}
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Kadıköy'de sakin bir akşam yemeği…"
            aria-label="Sor Gidenler"
            className="h-12 w-full border-b-2 border-line-strong bg-transparent pb-1 text-[clamp(1.125rem,3vw,1.5rem)] outline-none placeholder:text-ink-3 focus:border-accent"
          />
          <button type="submit" className="h-10 shrink-0 rounded-[3px] bg-accent px-5 text-[14px] font-semibold text-on-accent">Sor</button>
        </form>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
          {ORNEKLER.map((o) => (
            <li key={o}>
              <button type="button" onClick={() => { setQ(o); setAsked(o); }} className="text-[13px] text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink hover:decoration-ink">
                {o}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {result && (
        <section className="mt-10 border-t-2 border-line-strong pt-7" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-extrabold leading-none tracking-[-0.04em]">
              {result.items.length ? `Sana ${result.items.length} yer buldum` : "Bu tarife uyan bir yer bulamadım"}
            </h2>
            {result.understood.length > 0 && (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
                <span>Anladığım:</span>
                {result.understood.map((u) => (
                  <span key={u} className="border border-line-2 px-1.5 py-px text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-2">{u}</span>
                ))}
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {OVERRIDES.map(([label, add]) => (
              <button
                key={label} type="button"
                onClick={() => { const n = (asked || q) + add; setQ(n); setAsked(n); }}
                className="h-8 border border-line-2 px-3 text-[12.5px] font-semibold hover:border-ink"
              >
                {label}
              </button>
            ))}
          </div>

          <ol className="mt-6">
            {result.items.map((it, i) => {
              const e = getEntityById(it.entityId)!;
              const intel = getTopicIntelligence(it.entityId)!;
              return (
                <li key={it.entityId} className="grid gap-x-8 gap-y-3 border-t border-line py-6 sm:grid-cols-[auto_1fr_auto]">
                  <span className="tnum text-[13px] font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <Link href={`/mekan/${e.slug}/`} className="text-[22px] font-bold leading-tight tracking-[-0.025em] hover:text-accent-ink">{e.name}</Link>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                        {e.location?.district}{e.priceLevel ? ` · ${"₺".repeat(e.priceLevel)}` : ""}
                        {intel.overallScore !== null ? ` · Gidenler ${score1(intel.overallScore)}` : ""}
                      </span>
                    </div>
                    <WhyThisResult reasons={it.reasons} warnings={it.warning ? [it.warning] : []} compact />
                  </div>
                  <div className="flex flex-col items-start sm:items-end">
                    <span className="text-[34px] font-extrabold leading-none tracking-[-0.05em] text-accent-ink">%{it.match}</span>
                    <span className="label">uyum</span>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 border-t border-line pt-4">
            <span className="label">Neden bunlar?</span>
            <p className="mt-2 max-w-[70ch] text-[13.5px] leading-relaxed text-ink-2">
              Sorgudan anladığım bağlam, senin zevk profilinle (demo) birleştirildi; adaylar Gidenler puanına değil,
              sana uyumuna göre sıralandı. Dayandığı sinyaller:{" "}
              {result.sources.map((s, i) => (
                <span key={s} className="font-semibold text-ink">{s}{i < result.sources.length - 1 ? " · " : ""}</span>
              ))}.
            </p>
            {result.query.context === "default" && result.items.length > 1 && (
              <p className="mt-2 text-[12.5px] text-ink-3">
                Karşılaştırmak için: <Link className="underline underline-offset-4" href={`/karsilastir/?a=${getEntityById(result.items[0].entityId)!.slug}&b=${getEntityById(result.items[1].entityId)!.slug}`}>ilk ikisini yan yana koy</Link>.
              </p>
            )}
          </div>
        </section>
      )}

      {!result && (
        <p className="mt-10 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-2">
          Mekân adı yazarsan klasik arama gibi çalışır. Bir durum yazarsan — semt, kaç kişi, ne için, bütçe —
          senin için karar üretir ve nedenini gösterir.
        </p>
      )}

      <div className="mt-12"><DemoNotice>Sor Gidenler prototipte kurallarla çalışır; cevaplar demo zevk profiline ve demo deneyim verisine dayanır. Canlı müsaitlik, masa, bekleme süresi gibi elimizde olmayan veriler üretilmez.</DemoNotice></div>
    </div>
  );
}
