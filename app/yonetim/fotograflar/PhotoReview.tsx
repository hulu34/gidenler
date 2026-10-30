"use client";

import { useEffect, useState } from "react";

type C = { id: string; url: string; status: string; license: string | null; slug: string; name: string; meta: { sayfa?: string; tur?: string; w?: number; h?: number; puan?: number; kopya?: boolean; subeKaniti?: boolean | null } };
const API = "/api/admin/db/";

export function PhotoReview({ env }: { env: string }) {
  const [rows, setRows] = useState<C[] | null>(null);
  const [msg, setMsg] = useState("");
  const load = () => fetch(`${API}?rapor=foto-adaylar`).then((r) => r.json()).then((j) => setRows(j.candidates ?? []));
  useEffect(() => { void load(); }, []);
  const send = async (body: Record<string, string>) => {
    const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "photo-decide", confirm: "EVET", target: env, admin: "editor", ...body }) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Kaydedildi." : `Kaydedilmedi: ${(j.issues ?? [j.error]).join(", ")}`);
    await load();
  };
  if (!rows) return <p className="mt-6 text-[13px] text-ink-3">Yükleniyor…</p>;
  const venues = [...new Set(rows.map((r) => r.slug))];
  return (
    <div className="mt-6 flex flex-col gap-10">
      <p className="text-[13px] text-ink-2" aria-live="polite">{venues.length} mekân, {rows.length} aday, {rows.filter((r) => r.status === "approved").length} onaylı. {msg}</p>
      {venues.map((s) => {
        const list = rows.filter((r) => r.slug === s).sort((a, b) => (b.meta.puan ?? 0) - (a.meta.puan ?? 0));
        return (
          <section key={s}>
            <h2 className="text-[18px] font-extrabold">{list[0].name}</h2>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <li key={c.id} className="flex flex-col gap-2 border border-line p-2" data-aday={c.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.url} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-[4/3] w-full bg-sheet object-cover" />
                  <p className="text-[12px] text-ink-2">Puan {c.meta.puan} · {c.meta.w}×{c.meta.h} · {c.meta.tur} · şube kanıtı {c.meta.subeKaniti ? "var" : "yok"}{c.meta.kopya ? " · KOPYA KUŞKUSU" : ""} · <b>{c.status}</b></p>
                  {c.meta.sayfa && <a href={c.meta.sayfa} target="_blank" rel="noopener noreferrer" className="truncate text-[12px] underline">{c.meta.sayfa}</a>}
                  {c.status === "pending" && (
                    <form className="flex flex-col gap-1.5" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void send({ id: c.id, decision: "approve", rightsType: String(f.get("t")), rightsRef: String(f.get("r")), credit: String(f.get("c")) }); }}>
                      <select name="t" className="border border-line-2 p-1 text-[12px]"><option value="isletme-izni">İşletme izni</option><option value="kendi">Kendi çekimimiz</option><option value="acik-lisans">Açık lisans</option></select>
                      <input name="r" required minLength={8} placeholder="İzin kanıtı: e-posta tarihi, lisans bağlantısı" className="border border-line-2 p-1 text-[12px]" />
                      <input name="c" required minLength={2} placeholder="Künye" className="border border-line-2 p-1 text-[12px]" />
                      <span className="flex gap-2">
                        <button className="border border-line-strong px-2 py-1 text-[12px] font-bold">Hak kaydıyla onayla</button>
                        <button type="button" onClick={() => void send({ id: c.id, decision: "reject", why: "editör reddi" })} className="px-2 py-1 text-[12px] underline">Reddet</button>
                      </span>
                    </form>
                  )}
                  {c.status === "approved" && <button type="button" onClick={() => void send({ id: c.id, decision: "remove", why: "editör kaldırdı" })} className="self-start text-[12px] underline">Kaldır</button>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
