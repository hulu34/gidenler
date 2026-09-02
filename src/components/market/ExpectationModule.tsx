"use client";

import { useState } from "react";
import { nf, score1 } from "@/lib/format";
import type { CommunityExpectation, ExpectationChoice } from "@/lib/types";

const CHOICES: Array<{ key: ExpectationChoice; label: string }> = [
  { key: "up", label: "Yükselir" },
  { key: "same", label: "Aynı kalır" },
  { key: "down", label: "Düşer" },
];

/**
 * TOPLULUK BEKLENTİSİ — deneysel zekâ katmanı.
 *
 * KİLİTLİ KURALLAR (mimari ve arayüz bunları korur):
 *  · Deneyim yazarları puanı OLUŞTURUR; beklenti katılımcıları puanın
 *    gelecekteki YÖNÜ hakkında görüş bildirir. İkisi ayrı sistemdir.
 *  · Beklenti sonuçları Gidenler puanını DEĞİŞTİRMEZ.
 *  · Para, jeton, cüzdan, oran, bahis YOKTUR. Bu bir tahmin arayüzüdür.
 */
export function ExpectationModule({ e }: { e: CommunityExpectation }) {
  const [choice, setChoice] = useState<ExpectationChoice | null>(null);
  const [dist, setDist] = useState(e.distribution);
  const [count, setCount] = useState(e.participantCount);

  function pick(c: ExpectationChoice) {
    if (choice) return;
    setChoice(c);
    const total = count + 1;
    const raw = { ...dist };
    // yüzdeleri yeniden hesapla (prototip: tek oy eklenir)
    const abs = {
      up: Math.round((dist.up / 100) * count) + (c === "up" ? 1 : 0),
      same: Math.round((dist.same / 100) * count) + (c === "same" ? 1 : 0),
      down: Math.round((dist.down / 100) * count) + (c === "down" ? 1 : 0),
    };
    raw.up = Math.round((abs.up / total) * 100);
    raw.same = Math.round((abs.same / total) * 100);
    raw.down = 100 - raw.up - raw.same;
    setDist(raw);
    setCount(total);
  }

  const delta = e.communityExpected - e.currentScore;
  const arrow = delta > 0.05 ? "↑" : delta < -0.05 ? "↓" : "→";
  const tone = delta > 0.05 ? "text-pos-ink" : delta < -0.05 ? "text-neg-ink" : "text-ink-2";

  return (
    <section className="border-t-2 border-line-strong pt-7" aria-labelledby="beklenti">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <h2 id="beklenti" className="text-[13px] font-bold uppercase tracking-[0.2em]">
          Topluluk beklentisi
        </h2>
        <p className="max-w-[44ch] text-[12px] text-ink-3">
          Deneysel · {e.horizonDays} gün sonrası için görüş
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-x-12 gap-y-6">
        <div className="flex flex-col gap-0.5">
          <span className="label">Bugün</span>
          <span className="tnum text-[34px] font-extrabold leading-none tracking-[-0.05em] text-ink-2">
            {score1(e.currentScore)}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="label">Topluluk beklentisi</span>
          <span className={`tnum flex items-baseline gap-2 text-[34px] font-extrabold leading-none tracking-[-0.05em] ${tone}`}>
            {score1(e.communityExpected)}
            <span className="text-[20px]" aria-hidden>{arrow}</span>
          </span>
          <span className="tnum text-[11.5px] text-ink-3">{nf(count)} katılımcı</span>
        </div>

        {e.expertExpected !== null && (
          <div className="flex flex-col gap-0.5">
            <span className="label">Uzman beklentisi</span>
            <span className="tnum text-[34px] font-extrabold leading-none tracking-[-0.05em]">
              {score1(e.expertExpected)}
            </span>
            <span className="tnum text-[11.5px] text-ink-3">
              {e.expertParticipantCount} uzman
            </span>
          </div>
        )}
      </div>

      {/* dağılım */}
      <div className="mt-7 flex flex-col gap-2">
        <div className="flex h-[10px] max-w-[560px] gap-[2px]" aria-hidden>
          <span className="block bg-pos" style={{ flex: dist.up || 0.001 }} />
          <span className="block bg-line-2" style={{ flex: dist.same || 0.001 }} />
          <span className="block bg-neg" style={{ flex: dist.down || 0.001 }} />
        </div>
        <ul className="flex flex-wrap gap-x-7 gap-y-1 text-[12px] font-semibold uppercase tracking-[0.1em]">
          <li className="text-pos-ink"><span className="tnum">%{dist.up}</span> yükselir</li>
          <li className="text-ink-3"><span className="tnum">%{dist.same}</span> aynı kalır</li>
          <li className="text-neg-ink"><span className="tnum">%{dist.down}</span> düşer</li>
        </ul>
      </div>

      {/* katılım */}
      <div className="mt-7 border-t border-line pt-5">
        {choice ? (
          <p className="text-[15px]">
            <span className="font-semibold">Tahminin kaydedildi:</span>{" "}
            <span className="font-semibold text-accent-ink">
              {CHOICES.find((c) => c.key === choice)?.label}
            </span>
            . Otuz gün sonra sonuç açıklanır ve tahmin isabetin profiline işlenir.
          </p>
        ) : (
          <>
            <p className="mb-3 text-[15px] font-semibold">
              Sence {e.horizonDays} gün sonra ne olur?
            </p>
            <div className="flex flex-wrap gap-2">
              {CHOICES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => pick(c.key)}
                  className="h-10 border border-line-2 px-4 text-[14px] font-semibold hover:border-ink hover:bg-sunk"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="mt-4 max-w-[68ch] text-[12px] leading-relaxed text-ink-3">
          Bu bir bahis değildir; para, jeton ve oran yoktur. Deneyim yazarları puanı
          oluşturur, beklenti katılımcıları puanın <strong className="font-semibold text-ink-2">yönü</strong> hakkında
          görüş bildirir.{" "}
          <strong className="font-semibold text-ink-2">Beklentiler Gidenler puanını değiştirmez.</strong>{" "}
          İşletmeler ödeme yaparak ne puanı ne de beklentiyi etkileyebilir.
        </p>
      </div>
    </section>
  );
}
