"use client";

import { useEffect, useState } from "react";

const API = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/moderation/registry/`;
export interface EditorVenue { slug: string; name: string; district: string; photos: Array<{ src: string; alt: string; credit: string; license: string | null; sourceUrl: string | null; addedBy?: string; rightsRef: string | null }> }
type State = Record<string, { cover?: string; hidden: string[] }>;
const btn = "rounded-full border border-line-strong min-h-11 px-3 py-1.5 text-[13px] font-bold sm:min-h-0 hover:bg-sheet";

export function RegistryEditor({ venues }: { venues: EditorVenue[] }) {
  const [state, setState] = useState<State>({});
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { fetch(API, { credentials: "same-origin" }).then((r) => r.json()).then((j) => setState(j.state ?? {})).catch(() => setMsg("Kararlar okunamadı.")); }, []);
  async function act(slug: string, src: string, action: string) {
    setMsg(null);
    const r = await fetch(API, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, src, action }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    if (!r?.ok) { setMsg(`İşlem yapılamadı: ${j?.error ?? "bağlantı"}`); return; }
    setState((s) => ({ ...s, [slug]: j.state })); setMsg("Kaydedildi.");
  }
  return (
    <div className="mt-6 flex flex-col gap-10">
      {msg && <p role="status" className="text-[13px] font-semibold">{msg}</p>}
      {venues.map((v) => {
        const st = state[v.slug] ?? { hidden: [] };
        const effective = st.cover ?? v.photos.find((p) => !st.hidden.includes(p.src))?.src;
        return (
          <section key={v.slug} data-venue={v.slug} className="border-t border-line pt-3">
            <h2 className="text-[17px] font-extrabold"><a href={`/mekan/${v.slug}/`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{v.name}</a> <span className="text-[13px] font-semibold text-ink-3">{v.district}</span></h2>
            <ul className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {v.photos.map((p) => {
                const hidden = st.hidden.includes(p.src), isCover = effective === p.src;
                return (
                  <li key={p.src} data-src={p.src} className="flex flex-col gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.src} alt={p.alt} loading="lazy" className={`aspect-[4/3] w-full bg-sheet object-cover ${hidden ? "opacity-40" : ""}`} />
                    <p className="text-[12.5px] font-bold">{hidden ? "Yayında değil" : isCover ? "Şu an kapak" : "Galeride"}</p>
                    <p className="text-[12.5px] text-ink-2">{p.credit}{p.license ? ` · ${p.license}` : ""}{p.sourceUrl ? <> · <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">kaynak</a></> : null}</p>
                    <p className={`text-[12px] ${p.rightsRef ? "text-ink-3" : "font-bold text-neg-ink"}`}>{p.rightsRef ?? "Hak kaydı eksik"}</p>
                    <div className="flex flex-wrap gap-2">
                      {!isCover && !hidden && <button className={btn} onClick={() => act(v.slug, p.src, "cover")}>Kapak yap</button>}
                      {hidden ? <button className={btn} onClick={() => act(v.slug, p.src, "show")}>Yayına al</button> : <button className={btn} onClick={() => { if (window.confirm("Fotoğraf bu restoranda yayından kalksın mı? Dosya ve hak kaydı silinmez.")) void act(v.slug, p.src, "hide"); }}>Yayından çıkar</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
