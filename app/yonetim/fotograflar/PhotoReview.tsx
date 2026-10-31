"use client";

import { useEffect, useMemo, useState } from "react";

type M = { sayfa?: string; tur?: string; w?: number; h?: number; puan?: number; kopya?: boolean; subeKaniti?: boolean | null; kaynakTuru?: string; lisans?: string; yazar?: string; onInceleme?: string };
type C = { id: string; url: string; status: string; license: string | null; credit: string | null; slug: string; name: string; meta: M };
const API = "/api/admin/db/";
const TUR: Record<string, string> = { yemek: "Yemek", ic: "İç mekân", dis: "Dış cephe", belirsiz: "Belirsiz" };

/* Editör kuyruğu: filtre, kaynak ayrımı, tek ve toplu karar. Hakkı olmayan görsel burada da yayımlanamaz. */
export function PhotoReview({ env }: { env: string }) {
  const [rows, setRows] = useState<C[] | null>(null);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("pending");
  const [source, setSource] = useState("hepsi");
  const [tur, setTur] = useState("hepsi");
  const [q, setQ] = useState("");
  const load = () => fetch(`${API}?rapor=foto-adaylar`).then((r) => r.json()).then((j) => setRows(j.candidates ?? []));
  useEffect(() => { void load(); }, []);
  const send = async (body: Record<string, string>) => {
    const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "photo-decide", confirm: "EVET", target: env, admin: "editor", ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(`Kaydedilmedi: ${(j.issues ?? [j.error]).join(", ")}`);
    return r.ok;
  };
  const decide = async (body: Record<string, string>) => { if (await send(body)) setMsg("Kaydedildi."); await load(); };
  const shown = useMemo(() => (rows ?? []).filter((c) => (status === "hepsi" || c.status === status)
    && (source === "hepsi" || (source === "commons" ? c.meta.kaynakTuru === "commons" : c.meta.kaynakTuru !== "commons"))
    && (tur === "hepsi" || c.meta.tur === tur) && (!q || c.name.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")))), [rows, status, source, tur, q]);
  if (!rows) return <p className="mt-6 text-[13px] text-ink-3">Yükleniyor…</p>;
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const venues = [...new Set(shown.map((r) => r.slug))];
  const sel = "border border-line-2 bg-paper p-1.5 text-[13px]";
  return (
    <div className="mt-6 flex flex-col gap-8">
      <div className="flex flex-col gap-2 border-y border-line py-3">
        <p className="text-[13px] text-ink-2" aria-live="polite" data-ozet>{new Set(rows.map((r) => r.slug)).size} mekân · {rows.length} aday · {count("pending")} bekliyor · {count("approved")} onaylı · {count("rejected")} red. {msg}</p>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Durum" value={status} onChange={(e) => setStatus(e.target.value)} className={sel}><option value="pending">Bekleyen</option><option value="approved">Onaylı</option><option value="rejected">Reddedilen</option><option value="removed">Kaldırılan</option><option value="hepsi">Hepsi</option></select>
          <select aria-label="Kaynak" value={source} onChange={(e) => setSource(e.target.value)} className={sel}><option value="hepsi">Tüm kaynaklar</option><option value="site">Resmî site (izin gerekli)</option><option value="commons">Açık lisans</option></select>
          <select aria-label="Tür" value={tur} onChange={(e) => setTur(e.target.value)} className={sel}><option value="hepsi">Tüm türler</option>{Object.entries(TUR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input aria-label="Mekân ara" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mekân ara" className={sel} />
        </div>
      </div>
      {!venues.length && <p className="text-[13px] text-ink-3">Bu filtrede aday yok.</p>}
      {venues.map((s) => {
        const list = shown.filter((r) => r.slug === s).sort((a, b) => (b.meta.puan ?? 0) - (a.meta.puan ?? 0));
        const pend = list.filter((c) => c.status === "pending");
        return (
          <section key={s} data-mekan={s}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[18px] font-extrabold">{list[0].name}</h2>
              {pend.length > 1 && <button type="button" onClick={async () => { for (const c of pend) await send({ id: c.id, decision: "reject", why: "editör toplu reddi" }); setMsg("Mekânın adayları reddedildi."); await load(); }} className="text-[12px] underline">Bu mekânın {pend.length} adayını reddet</button>}
            </div>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => {
                const open = c.meta.kaynakTuru === "commons";
                return (
                  <li key={c.id} className="flex flex-col gap-2 border border-line p-2" data-aday={c.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.url} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-[4/3] w-full bg-sheet object-cover" />
                    <p className="text-[12px] text-ink-2">{open ? `Açık lisans: ${c.meta.lisans}` : "Resmî site: kullanım izni yok"} · Puan {c.meta.puan} · {c.meta.w}×{c.meta.h} · {TUR[c.meta.tur ?? ""] ?? c.meta.tur} · şube kanıtı {c.meta.subeKaniti ? "var" : "yok"}{c.meta.kopya ? " · KOPYA KUŞKUSU" : ""} · <b>{c.status}</b></p>
                    {c.meta.onInceleme && <p className="text-[12px] text-ink-3">Ön inceleme: {c.meta.onInceleme}</p>}
                    {c.meta.sayfa && <a href={c.meta.sayfa} target="_blank" rel="noopener noreferrer" className="truncate text-[12px] underline">{c.meta.sayfa}</a>}
                    {c.status === "pending" && (
                      <form className="flex flex-col gap-1.5" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void decide({ id: c.id, decision: "approve", rightsType: String(f.get("t")), rightsRef: String(f.get("r")), credit: String(f.get("c")) }); }}>
                        <select aria-label="İzin türü" name="t" defaultValue={open ? "acik-lisans" : "isletme-izni"} className="border border-line-2 p-1 text-[12px]"><option value="isletme-izni">İşletme izni</option><option value="kendi">Kendi çekimimiz</option><option value="acik-lisans">Açık lisans</option></select>
                        <input aria-label="İzin kanıtı" name="r" required minLength={8} defaultValue={open ? `${c.meta.lisans}: ${c.meta.sayfa}` : ""} placeholder="İzin kanıtı" className="border border-line-2 p-1 text-[12px]" />
                        <input aria-label="Künye" name="c" required minLength={2} defaultValue={open ? c.meta.yazar ?? "" : ""} placeholder="Künye" className="border border-line-2 p-1 text-[12px]" />
                        <span className="flex gap-2">
                          <button className="border border-line-strong px-2 py-1 text-[12px] font-bold">Hak kaydıyla onayla</button>
                          <button type="button" onClick={() => void decide({ id: c.id, decision: "reject", why: "editör reddi" })} className="px-2 py-1 text-[12px] underline">Reddet</button>
                        </span>
                      </form>
                    )}
                    {c.status === "approved" && <button type="button" onClick={() => void decide({ id: c.id, decision: "remove", why: "editör kaldırdı" })} className="self-start text-[12px] underline">Kaldır</button>}
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
