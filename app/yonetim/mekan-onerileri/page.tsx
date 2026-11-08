import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { adminAccess } from "@/lib/yonetim/access";
import { suggestionCounts, suggestionQueue } from "@/lib/oneri";
import { SuggestionDecision } from "./SuggestionDecision";

/* YÖNETİM · MEKÂN ÖNERİLERİ — kullanıcıların Gidenler'de bulamadığı yerler. Öneri yayımlanmaz, Google puanı almaz.
   Karar: Doğrulamaya al (veri hattına aday) · Var olan mekân (mükerrer) · Reddet. Hepsi denetim kaydına yazılır. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yönetim · Mekân önerileri", robots: { index: false, follow: false } };
const LABEL: Record<string, string> = { open: "Bekleyen", accepted: "Doğrulamaya alınan", duplicate: "Var olan mekân", rejected: "Reddedilen" };

export default async function Page({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const a = await adminAccess();
  if (!a) notFound();
  const status = Object.keys(LABEL).includes((await searchParams).durum ?? "") ? (await searchParams).durum! : "open";
  const [rows, counts] = await Promise.all([suggestionQueue(a.db, status), suggestionCounts(a.db)]);
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-7" data-oneri-kuyruk>
      <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Mekân önerileri</h1>
      <p className="mt-1 max-w-[80ch] text-[13px] text-ink-3">Kullanıcıların aradığı ama Gidenler&apos;de bulamadığı yerler. &ldquo;Doğrulamaya al&rdquo; mekân oluşturmaz; mekân OSM kaydı ve Google sayfası doğrulamasından geçince veri paketiyle eklenir.{a.role ? "" : " Bu adreste rapor salt okunur; karar için personel oturumu gerekir."}</p>
      <nav className="mt-4 flex flex-wrap gap-4 text-[13px] font-semibold">
        {Object.entries(LABEL).map(([k, l]) => <a key={k} href={`?durum=${k}`} className={k === status ? "text-accent-ink" : "underline decoration-line-2 underline-offset-4"}>{l} ({counts[k]?.n ?? 0})</a>)}
      </nav>
      {rows.length === 0 ? <p className="mt-8 text-[14px] text-ink-2">Bu durumda öneri yok.</p> : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {rows.map((s) => {
            const cands = (s.candidates as Array<{ slug: string; name: string; district: string | null; same: boolean }>) ?? [];
            return (
              <li key={s.id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" data-oneri-satir>
                <div className="min-w-0">
                  <p className="text-[16px] font-bold">{s.name} <span className="font-normal text-ink-2">· {s.district}</span></p>
                  <p className="text-[12.5px] text-ink-3 tnum">{s.requests} kez önerildi · {new Date(s.createdAt).toLocaleDateString("tr-TR")} {s.userId ? "· hesaplı" : "· hesapsız"}{s.locationNote ? ` · konum: ${s.locationNote}` : ""}</p>
                  {cands.length > 0 && <p className="mt-1 text-[12.5px] text-ink-2">Olası var olan kayıt: {cands.map((c) => `${c.name} (${c.district ?? "?"})${c.same ? " ⚠ aynı ilçe" : ""}`).join(" · ")}</p>}
                  {s.matchedSlug && <p className="mt-1 text-[12.5px]">Eşlenen: /mekan/{s.matchedSlug}/</p>}
                </div>
                {status === "open" && a.role ? <SuggestionDecision id={s.id} candidates={cands.map((c) => ({ slug: c.slug, name: c.name }))} /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
