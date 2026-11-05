"use client";

import Link from "next/link";
import { Column } from "@/components/home/HomeRankings";
import { getEntityById } from "@/data/entities";
import { useUserData } from "@/lib/store";
import { placeOf, type RankItem } from "@/lib/rankings";

/* SANA GÖRE (gerçek): uydurma kişiselleştirme yok. Kendi "Gitmek istiyorum" ve "Kaydet" listen; yalnız bu cihazda ya da hesabında. */
export function RealForYou() {
  const data = useUserData();
  const items: RankItem[] = Object.values(data.relationships)
    .filter((r) => r.state === "want_to_go" || r.state === "saved")
    .map((r) => ({ r, e: getEntityById(r.entityId) }))
    .filter((x) => x.e?.isReal && !x.e.isDemo)
    .slice(0, 5)
    .map(({ r, e }) => ({ slug: e!.slug, name: e!.name, kind: e!.subcategory ?? "", where: e!.location?.district ?? "", place: [e!.subcategory, e!.location?.district].filter(Boolean).join(" · ") || placeOf(e!.location), categoryId: e!.categoryId, score: null, delta: 0, count: 0, reason: "", signal: r.state === "want_to_go" ? "gitmek istiyorum" : "kaydettin" }));
  return (
    <Column demo={false} seeAllLabel="Benim"
      section={{ key: "sana", title: "Sana göre", window: "Senin listen", hint: "Kendi kaydettiğin ve gitmek istediğin yerler; uydurma kişiselleştirme yapılmaz.", items, signalKind: "match", seeAll: items.length ? "/benim/" : undefined }}
      empty={
        <div className="flex flex-col gap-3 pt-4">
          <p className="text-[14px] leading-snug text-ink-2">Bir mekânda <b>Gitmek istiyorum</b> ya da <b>Kaydet</b> dediğinde burada görünür.</p>
          <p><Link href="/sor/" className="inline-flex h-9 items-center rounded-[3px] bg-accent px-3.5 text-[13.5px] font-semibold text-on-accent">Sor Gidenler&apos;e sor →</Link></p>
          <p className="text-[11.5px] text-ink-3">Liste bu cihazda saklanır; giriş yaparsan hesabına aktarılır.</p>
        </div>
      } />
  );
}
