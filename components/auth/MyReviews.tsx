"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccountStatus } from "@/lib/community/accountState";

/* DENEYİMLERİM — hesaptaki yayınlanmış / incelemedeki / gizlenmiş deneyimler; düzenle ve sil.
   Girişsizken görünmez (hesap kutusu girişe çağırır). Silme: deneyim kamudan kalkar. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const AYLAR = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"];
const STATUS: Record<string, [string, string]> = {
  published: ["Yayında", "border-pos text-pos-ink"], pending: ["İncelemede", "border-line-2 text-ink-2"], hidden: ["Moderasyonla gizlendi", "border-neg/50 text-neg-ink"],
};
interface Row { id: string; slug: string; place: string; visitedOn: string; overall: number; body: string; status: string }

export function MyReviews() {
  const account = useAccountStatus();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ask, setAsk] = useState<string | null>(null);

  useEffect(() => {
    if (account !== "in") return;
    fetch(`${BASE}/api/me/reviews/`, { cache: "no-store", credentials: "same-origin" }).then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { reviews: Row[] }) => setRows(j.reviews)).catch(() => setErr("Deneyimlerin yüklenemedi; sayfayı yenile."));
  }, [account]);

  async function remove(id: string) {
    setErr(null);
    const r = await fetch(`${BASE}/api/reviews/${id}/`, { method: "DELETE", credentials: "same-origin" }).catch(() => null);
    if (r?.ok) { setRows((x) => x?.filter((y) => y.id !== id) ?? null); setAsk(null); } else setErr("Silinemedi (bağlantı sorunu); yeniden dene.");
  }

  if (account !== "in") return null;
  return (
    <section className="mt-10 border-t-2 border-line-strong pt-6" aria-labelledby="h-deneyimlerim">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="h-deneyimlerim" className="text-[13px] font-bold uppercase tracking-[0.2em]">Deneyimlerim</h2>
        <span className="text-[12px] text-ink-3">{rows ? `${rows.length} deneyim` : ""}</span>
      </div>
      {err && <p role="alert" className="mt-3 text-[13px] text-neg-ink">{err}</p>}
      {rows && rows.length === 0 && <p className="mt-3 text-[14px] text-ink-2">Henüz deneyim yayınlamadın. Gittiğin bir mekânın sayfasında &ldquo;Gittim, deneyimimi yazayım&rdquo;a dokun.</p>}
      <ul className="mt-2 flex flex-col">
        {rows?.map((r) => {
          const [m, cls] = STATUS[r.status] ?? [r.status, "border-line-2 text-ink-3"];
          const [y, mo] = r.visitedOn.split("-");
          return (
            <li key={r.id} className="flex flex-col gap-2 border-b border-line py-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link href={`/mekan/${r.slug}/#deneyimler`} className="text-[17px] font-bold tracking-[-0.01em] hover:text-accent-ink">{r.place}</Link>
                <span className="text-[12.5px] text-ink-3">{AYLAR[Number(mo) - 1]} {y}{r.overall > 0 ? ` · ${r.overall}/10` : ""}</span>
                <span className={`rounded-full border px-2 py-px text-[10.5px] font-semibold uppercase tracking-[0.1em] ${cls}`}>{m}</span>
              </div>
              <p className="line-clamp-3 text-[14px] leading-relaxed text-ink-2">{r.body}</p>
              <div className="flex flex-wrap items-center gap-3 text-[13px]">
                {r.status !== "hidden" && <Link href={`/yaz/${r.slug}/`} className="font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">Düzenle</Link>}
                {ask === r.id ? (
                  <>
                    <span className="text-ink-2">Silinsin mi?</span>
                    <button type="button" onClick={() => remove(r.id)} className="h-9 rounded-[3px] bg-neg px-3 font-semibold text-paper">Evet, sil</button>
                    <button type="button" onClick={() => setAsk(null)} className="h-9 rounded-[3px] border border-line-2 px-3 font-semibold">Vazgeç</button>
                  </>
                ) : <button type="button" onClick={() => setAsk(r.id)} className="font-semibold text-neg-ink underline decoration-line-2 underline-offset-4">Sil</button>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
