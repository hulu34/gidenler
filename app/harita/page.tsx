import { DEMO_VISIBLE } from "@/data/demoFlag";
import { articles } from "@/lib/seckisi";
import { SemtHarita } from "@/components/map/SemtHarita";
import { HaritaDemo } from "./HaritaDemo";

/**
 * HARİTADA GİDENLER — semt semt "nerede ne yenir".
 * İstanbul → yaka → ilçe → mahalle; bölgeler Gidenler kataloğunda en çok bulunan türe göre renkli.
 * Kullanıcı konumu alınmaz; sınırlar ve konumlar OpenStreetMap'ten, dış harita servisine istek gitmez.
 */
export default function MapPage() {
  if (DEMO_VISIBLE) return <HaritaDemo />;
  const secki = [...new Set(articles().flatMap((a) => a.venues.map((v) => v.slug)))];
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-7">
      <section className="pt-8 sm:pt-12">
        <p className="label">Haritada Gidenler</p>
        <h1 className="mt-2 max-w-[18ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Hangi semtte ne yenir?</h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-snug text-ink-2">İlçeye, sonra mahalleye dokun. Renk o bölgede en çok bulunan türü, sağdaki liste oradaki mekânları gösterir.</p>
      </section>
      <SemtHarita secki={secki} />
    </div>
  );
}
