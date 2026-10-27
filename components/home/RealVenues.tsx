import Link from "next/link";
import { realEntities } from "@/data/real";

/* GERÇEK İSTANBUL — yeni eklenen gerçek mekânlar (OSM). Puan yok; ilk deneyimleri bekliyorlar. */
export function RealVenues({ limit = 12 }: { limit?: number }) {
  if (!realEntities.length) return null;
  /* semtler arasında dönüşümlü seçim: tek semt vitrini kaplamasın */
  const byD = new Map<string, typeof realEntities>();
  for (const e of realEntities) { const d = e.location?.district ?? ""; (byD.get(d) ?? byD.set(d, []).get(d)!).push(e); }
  const pick: typeof realEntities = [];
  for (let i = 0; pick.length < limit && i < 40; i++) for (const arr of byD.values()) { if (arr[i] && pick.length < limit) pick.push(arr[i]); }
  return (
    <section aria-labelledby="h-real" className="reveal">
      <div className="kunye">
        <h2 id="h-real">Gerçek İstanbul · ilk {realEntities.length} mekân</h2>
        <Link href="/gercek/" className="text-[12px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Tümü →</Link>
      </div>
      <p className="mt-2 max-w-[62ch] font-[family-name:var(--font-read)] text-[17px] leading-snug text-ink-2">
        Gerçek mekânlar ekleniyor. Puanları yok, çünkü puanı gidenler verir. Gittiysen ilk deneyimi sen yaz.
      </p>
      <ul className="mt-5 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
        {pick.map((e) => (
          <li key={e.id} className="border-b border-r border-line">
            <Link href={`/mekan/${e.slug}/`} className="group flex h-full flex-col gap-1 p-4 transition-colors hover:bg-sheet">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{e.subcategory} · {e.location?.district}</span>
              <span className="text-[17px] font-bold leading-tight tracking-[-0.015em] group-hover:text-accent-ink">{e.name}</span>
              <span className="mt-auto pt-2 text-[12px] text-pos-ink">İlk deneyim bekliyor →</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11.5px] text-ink-3">Kimlik bilgileri © OpenStreetMap katkıcıları (ODbL).</p>
    </section>
  );
}
