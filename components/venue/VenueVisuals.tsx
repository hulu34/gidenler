import type { Entity } from "@/lib/types";
import { mapLinks } from "@/lib/venue";
import { OsmMapUnlessGoogle } from "./GooglePlace";

/* ──────────────────────────────────────────────────────────────────────────
   KONUM — harita · 360° sokak görünümü · yol tarifi · Instagram. (Fotoğraflar artık başlığın altındaki kapak
   mozaiğinde ve /fotograflar sayfasında; bkz. components/venue/media.)
   Yalnızca izinli kaynaklar: işletme/kullanıcı yüklemesi, açık lisanslı (Wikimedia Commons),
   Google Places (canlı, atıflı, saklanmadan), haritalar. Stok ya da izinsiz kopya görsel yok.
   Demo kayıtta gösterilmez: konumu temsilîdir, gerçek bir sokağa bağlanmamalı.
   ────────────────────────────────────────────────────────────────────────── */

export function VenueVisuals({ entity }: { entity: Entity }) {
  if (!entity.isReal) return null;
  const m = mapLinks(entity);
  const ig = entity.contact?.instagram;
  return (
    <section id="gor" aria-labelledby="h-gor" className="scroll-mt-28 mt-12 sm:scroll-mt-32">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-2.5">
        <h2 id="h-gor" className="text-[13px] font-bold uppercase tracking-[0.2em]">Konum</h2>
        <p className="max-w-[52ch] text-[12px] text-ink-3">{m ? "Harita, 360° sokak görünümü ve yol tarifi." : "Adres; harita noktası henüz yok."}</p>
      </div>

      <div className="mt-5">
        <div className="flex max-w-[720px] flex-col gap-3">
          {m && (
            <>
              <OsmMapUnlessGoogle>
                <div className="relative aspect-[4/3] w-full overflow-hidden border border-line bg-sheet">
                  <iframe title={`${entity.name} haritada`} src={m.osmEmbed} loading="lazy" className="absolute inset-0 h-full w-full" referrerPolicy="no-referrer" />
                </div>
              </OsmMapUnlessGoogle>
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
              <OsmMapUnlessGoogle><p className="text-[11px] text-ink-3">Harita © OpenStreetMap katkıcıları. 360° görünüm ve yol tarifi Google Haritalar&apos;da açılır.</p></OsmMapUnlessGoogle>
            </>
          )}
          {!m && (
            /* kaynaklı bir konum noktası yoksa harita uydurulmaz: adres ve adresle arama bağlantısı */
            <div className="border border-line bg-sheet p-4 text-[13.5px]">
              {entity.address && <p className="text-ink">{entity.address}</p>}
              <p className="mt-1 text-[12px] text-ink-3">Bu mekânın harita noktası açık bir kaynakta henüz doğrulanmadı; yerini adresle ara.</p>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${entity.name} ${entity.address ?? entity.location?.district ?? ""} İstanbul`)}`} target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-flex h-11 items-center justify-center rounded-[3px] border border-line-2 px-4 text-[13px] font-semibold hover:border-ink">Google Haritalar&apos;da adresle ara</a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
