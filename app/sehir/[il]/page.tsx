import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { realEntities } from "@/data/real";
import { SEHIRLER, sehirOf, gorunur } from "@/lib/sehir";
import { nf } from "@/lib/format";

/* ŞEHİR SAYFASI — /sehir/<il>/. Yalnız görünür şehirler (yayında ya da pilot derlemede pilot) oluşur.
   Pilot şehir sayfası arama motoruna kapalıdır (noindex); İstanbul sayfası bugünkü sitenin özetidir. */
export function generateStaticParams() {
  return SEHIRLER.filter((s) => gorunur(s)).map((s) => ({ il: s.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ il: string }> }): Promise<Metadata> {
  const { il } = await params; const s = sehirOf(il);
  if (!s || !gorunur(s)) return { title: "Şehir" };
  return { title: `${s.ad} mekânları`, alternates: { canonical: `/sehir/${s.id}/` }, ...(s.durum === "pilot" ? { robots: { index: false, follow: false } } : {}) };
}

export default async function CityPage({ params }: { params: Promise<{ il: string }> }) {
  const { il } = await params;
  const s = sehirOf(il);
  if (!s || !gorunur(s)) notFound();
  const list = realEntities.filter((e) => (e.location?.city ?? "İstanbul") === s.ad);
  const byDistrict = new Map<string, typeof list>();
  for (const e of list) { const d = e.location?.district ?? "—"; byDistrict.set(d, [...(byDistrict.get(d) ?? []), e]); }
  const districts = [...byDistrict.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "tr"));
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7" data-sehir={s.id} data-sehir-durum={s.durum}>
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <h1 className="text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">{s.ad}</h1>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
          <span><span className="tnum font-bold text-ink" data-sehir-sayi>{nf(list.length)}</span> mekân</span>
          <span><span className="tnum font-bold text-ink">{districts.length}</span> ilçe</span>
        </p>
        {s.durum === "pilot" && <p className="max-w-[60ch] border-l-2 border-accent pl-3 text-[13px] text-ink-2" data-sehir-pilot>Deneme sürümü: bu şehir henüz yayında değil. Kayıtlar OpenStreetMap ve işletmelerin resmî sitelerinden doğrulandı.</p>}
      </header>
      <div className="mt-8 grid gap-8 border-t-2 border-line-strong pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {districts.map(([d, xs]) => (
          <section key={d}>
            <h2 className="label mb-2">{d} · {xs.length}</h2>
            <ul className="flex flex-col gap-1.5">
              {xs.sort((a, b) => a.name.localeCompare(b.name, "tr")).map((e) => (
                <li key={e.slug}><Link href={`/mekan/${e.slug}/`} className="text-[14px] font-semibold hover:underline">{e.name}</Link> <span className="text-[12px] text-ink-3">{e.subcategory}</span></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
