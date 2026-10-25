import type { Entity } from "@/lib/types";
import { mapLinks } from "@/lib/venue";
import { PhotoGallery } from "./PhotoGallery";
import { GooglePlace } from "./GooglePlace";

/* ──────────────────────────────────────────────────────────────────────────
   GÖR — fotoğraflar · harita · 360° sokak görünümü · Instagram · Google (anahtar varsa).
   Yalnızca izinli kaynaklar: işletme/kullanıcı yüklemesi, açık lisanslı (Wikimedia Commons),
   Google Places (canlı, atıflı, saklanmadan), haritalar. Stok ya da izinsiz kopya görsel yok.
   Demo kayıtta gösterilmez: konumu temsilîdir, gerçek bir sokağa bağlanmamalı.
   ────────────────────────────────────────────────────────────────────────── */

export function VenueVisuals({ entity }: { entity: Entity }) {
  if (!entity.isReal && !entity.photos?.length) return null;
  const m = mapLinks(entity);
  const ig = entity.contact?.instagram;
  return (
    <section id="gor" aria-labelledby="h-gor" className="scroll-mt-28 mt-12 sm:scroll-mt-32">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-2.5">
        <h2 id="h-gor" className="text-[13px] font-bold uppercase tracking-[0.2em]">Gör</h2>
        <p className="max-w-[52ch] text-[12px] text-ink-3">Fotoğraflar, 360° sokak görünümü ve konum. Yalnızca izinli kaynaklar; her görselin sahibi yazılı.</p>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <PhotoGallery photos={entity.photos ?? []} name={entity.name} />
          <GooglePlace slug={entity.slug} name={entity.name} mapsUrl={m?.googleMaps} />
        </div>

        <div className="flex flex-col gap-3">
          {m && (
            <>
              <div className="relative aspect-[4/3] w-full overflow-hidden border border-line bg-sheet">
                <iframe title={`${entity.name} haritada`} src={m.osmEmbed} loading="lazy" className="absolute inset-0 h-full w-full" referrerPolicy="no-referrer" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[13px] font-semibold">
                <a href={m.streetView} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-[3px] bg-ink text-paper transition-colors hover:bg-accent">
                  <span aria-hidden>◎</span> 360° sokak görünümü
                </a>
                <a href={m.directions} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center rounded-[3px] border border-line-2 hover:border-ink">Yol tarifi</a>
                <a href={m.googleMaps} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center rounded-[3px] border border-line-2 hover:border-ink">Google Haritalar</a>
                {ig ? (
                  <a href={`https://www.instagram.com/${ig}/`} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center rounded-[3px] border border-line-2 hover:border-ink">Instagram @{ig.length > 14 ? ig.slice(0, 13) + "…" : ig}</a>
                ) : (
                  <a href={m.osm} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center rounded-[3px] border border-line-2 hover:border-ink">OpenStreetMap</a>
                )}
              </div>
              <p className="text-[11px] text-ink-3">Harita © OpenStreetMap katkıcıları. 360° görünüm ve yol tarifi Google Haritalar&apos;da açılır.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
