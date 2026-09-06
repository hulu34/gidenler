import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { listCategories, listCards } from "@/lib/api";
import { getCategory } from "@/data/categories";
import { nf } from "@/lib/format";
import { CategoryList } from "@/app/kategori/[slug]/CategoryList";
import { ComplianceNotice } from "@/components/ui/ComplianceNotice";

/** Kategori sayfaları: hafif rota — evrenden beslenir, semt/alt tür filtreleri gerçek çalışır. */
export function generateStaticParams() {
  return listCategories().map((c) => ({ slug: c.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const c = listCategories().find((x) => x.slug === slug);
  return { title: c ? c.label : "Kategori" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = listCategories().find((c) => c.slug === slug);
  if (!category) notFound();
  const cards = listCards().filter((c) => c.category.id === category.id);
  const subs = Array.from(new Set(cards.map((c) => c.entity.subcategory).filter(Boolean))) as string[];
  const cities = Array.from(new Set(cards.map((c) => c.entity.location?.city).filter(Boolean))) as string[];
  const districts = Array.from(new Set(cards.filter((c) => c.entity.location?.city === "İstanbul").map((c) => c.entity.location?.district).filter(Boolean))) as string[];
  const cat = getCategory(category.id)!;
  const others = listCategories().filter((c) => c.id !== category.id);

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <nav className="flex flex-wrap items-center gap-x-2.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-3">
          <Link href="/kesfet/" className="hover:text-ink">Keşfet</Link><span aria-hidden>/</span><span className="text-accent-ink">{category.label}</span>
        </nav>
        <h1 className="max-w-[16ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">{category.label}</h1>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
          <span><span className="tnum font-bold text-ink">{nf(cards.length)}</span> kayıt</span>
          <span><span className="tnum font-bold text-ink">{cities.length}</span> şehir</span>
          {districts.length > 0 && <span><span className="tnum font-bold text-ink">{districts.length}</span> İstanbul semti</span>}
          {subs.length > 1 && <span><span className="tnum font-bold text-ink">{subs.length}</span> alt tür</span>}
        </p>
        {cat.compliance.mode === "regulated" && <div className="mt-2"><ComplianceNotice policy={cat.compliance} noun={cat.noun} /></div>}
      </header>

      <div className="mt-8 border-t-2 border-line-strong pt-6">
        <CategoryList categoryId={category.id} subs={subs} cities={cities} />
      </div>

      <nav className="mt-12 flex flex-wrap gap-2 border-t border-line pt-4" aria-label="Diğer kategoriler">
        <span className="label mr-2 self-center">Diğer</span>
        {others.map((c) => <Link key={c.id} href={`/kategori/${c.slug}/`} className="inline-flex h-8 items-center border border-line-2 px-3 text-[12.5px] font-semibold hover:border-ink">{c.label}</Link>)}
      </nav>
    </div>
  );
}
