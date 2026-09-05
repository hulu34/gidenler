"use client";

import Link from "next/link";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { getEntityById } from "@/data/entities";
import { getTopicIntelligence } from "@/lib/api";
import { useUserData } from "@/lib/store";
import { score1 } from "@/lib/format";
import { EntityActions } from "@/components/decision/EntityActions";

/**
 * ANA SAYFA — "Devam et". Döngüyü hatırlatan küçük modül:
 * gitmek istediklerin bekler, gittiklerin deneyim ister.
 * Boşsa zevk teaser'ı; kullanıcıyı kaybetmez.
 */
export function ContinueModule() {
  const data = useUserData();
  const rels = Object.values(data.relationships);
  const want = rels.filter((r) => r.state === "want_to_go");
  const visited = rels.filter((r) => r.state === "visited");
  const items = [...want, ...visited].slice(0, 3);

  if (!items.length) {
    return (
      <section aria-labelledby="devam" className="mt-14 border-y-2 border-line-strong py-6">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <div className="flex flex-col gap-1">
            <h2 id="devam" className="text-[13px] font-bold uppercase tracking-[0.2em]">Zevkini tanıyalım</h2>
            <p className="max-w-[56ch] text-[14px] text-ink-2">"Sana göre" uyumu bir zevk profilinden gelir. Bir dakikada düzelt; her mekânın uyumu anında değişsin.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/zevkim/" className="inline-flex h-9 items-center rounded-[3px] bg-accent px-3.5 text-[13.5px] font-semibold text-on-accent">Zevkim</Link>
            <Link href="/benim/" className="inline-flex h-9 items-center rounded-[3px] border border-line-2 px-3.5 text-[13.5px] font-semibold hover:border-ink">Benim Gidenler&apos;im</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="devam" className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-3">
        <h2 id="devam" className="text-[13px] font-bold uppercase tracking-[0.2em]">Devam et</h2>
        <Link href="/benim/" className="text-[12px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Benim Gidenler&apos;im</Link>
      </div>
      <ul>
        {items.map((r) => {
          const e = getEntityById(r.entityId)!; const it = getTopicIntelligence(r.entityId)!;
          return (
            <li key={r.entityId} className="grid gap-x-8 gap-y-2 border-b border-line py-5 sm:grid-cols-[1fr_auto]">
              <div className="flex flex-col gap-1">
                <Link href={`/mekan/${e.slug}/`} className="text-[19px] font-bold leading-tight tracking-[-0.02em] hover:text-accent-ink">{e.name}</Link>
                <span className="text-[13px] text-ink-2">{r.state === "want_to_go" ? "Gitmek istiyorum demiştin." : "Gittiğini söyledin — nasıl geçti?"}{it.overallScore !== null && <span className="ml-2 inline-flex"><ScoreNumber score={it.overallScore} size="sm" trend={{ direction: it.scoreTrend.direction }} /></span>}</span>
              </div>
              <EntityActions entityId={r.entityId} entitySlug={e.slug} entityName={e.name} variant={r.state === "visited" ? "full" : "compact"} via="home" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
