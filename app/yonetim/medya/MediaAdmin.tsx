"use client";

import { useCallback, useEffect, useState } from "react";
import { parseVideoUrl, PLATFORM_LABEL, type VideoPlatform } from "@/lib/media/embed";

type V = { id: string; platform: VideoPlatform; externalId: string; url: string; credit: string | null; category: string | null };
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const CATS = [["video", "Genel"], ["yemek", "Yemek"], ["atmosfer", "Atmosfer"], ["ziyaretci", "Ziyaretçi"], ["isletme", "İşletme"], ["influencer", "İçerik üreticisi"], ["editor", "Editör"]] as const;
const ERR: Record<string, string> = { bad_url: "Bağlantı tanınmadı (YouTube, Instagram Reel ya da TikTok video bağlantısı olmalı).", no_place: "Mekân bulunamadı.", not_found_on_platform: "Platform bu videoyu bulamadı (silinmiş ya da gizli olabilir).", no_db: "Veritabanı yok.", write_locked: "Bu ortamda yazma kilitli.", target_mismatch: "Ortam uyuşmuyor." };

export function MediaAdmin({ venues, env }: { venues: Array<{ slug: string; name: string; district: string }>; env: string }) {
  const [slug, setSlug] = useState("");
  const [url, setUrl] = useState("");
  const [credit, setCredit] = useState("");
  const [cat, setCat] = useState("video");
  const [list, setList] = useState<V[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const venue = venues.find((v) => v.slug === slug);
  const parsed = url ? parseVideoUrl(url) : null;

  const refresh = useCallback(() => {
    if (!venue) { setList([]); return; }
    fetch(`${BASE}/api/media/${encodeURIComponent(venue.slug)}/`, { cache: "no-store" }).then((r) => r.json()).then((j) => setList(j.videos ?? [])).catch(() => setList([]));
  }, [venue]);
  useEffect(refresh, [refresh]);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`${BASE}/api/admin/db/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: "EVET", target: env, ...body }) });
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok && j.ok !== false, j };
    } finally { setBusy(false); }
  };
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venue) return;
    const { ok, j } = await post({ action: "media-add", slug: venue.slug, url, credit: credit || undefined, category: cat });
    setMsg(ok ? { ok, text: `${PLATFORM_LABEL[j.platform as VideoPlatform]} videosu ${j.created ? "eklendi" : "zaten vardı, mekâna bağlandı"}.` } : { ok, text: ERR[j.error] ?? `Hata: ${j.error ?? "bilinmiyor"}` });
    if (ok) { setUrl(""); setCredit(""); if (Array.isArray(j.videos)) setList(j.videos); }
  };
  const remove = async (id: string) => {
    const { ok } = await post({ action: "media-remove", id });
    setMsg({ ok, text: ok ? "Video yayından kaldırıldı (kayıt geçmişte kalır)." : "Kaldırılamadı." });
    if (ok) setList((x) => x.filter((v) => v.id !== id));
  };

  const field = "h-11 w-full border border-line-2 bg-paper px-3 text-[14px] focus:border-ink focus:outline-none";
  return (
    <div className="mt-6 flex flex-col gap-8">
      <form onSubmit={add} className="flex flex-col gap-3 border-2 border-line-strong p-4 sm:p-5">
        <label className="flex flex-col gap-1 text-[12px] font-semibold">Mekân
          <input list="mekanlar" value={venue ? `${venue.name} · ${venue.district}` : slug} onChange={(e) => { const t = e.target.value; const m = venues.find((v) => `${v.name} · ${v.district}` === t || v.slug === t); setSlug(m ? m.slug : t); }} placeholder="Ad yaz ve seç…" className={field} />
          <datalist id="mekanlar">{venues.map((v) => <option key={v.slug} value={`${v.name} · ${v.district}`} />)}</datalist>
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold">Video bağlantısı
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/shorts/… · instagram.com/reel/… · tiktok.com/@…/video/…" className={field} inputMode="url" />
          <span className={`text-[11.5px] font-normal ${url && !parsed && !/(vm|vt)\.tiktok\.com/.test(url) ? "text-neg-ink" : "text-ink-3"}`}>
            {parsed ? `${PLATFORM_LABEL[parsed.platform]} · kimlik ${parsed.id}${parsed.vertical ? " · dikey" : ""}` : url ? (/(vm|vt)\.tiktok\.com/.test(url) ? "TikTok kısa bağlantısı: kaydederken çözülecek" : "Tanınmayan bağlantı") : "Desteklenen: YouTube, YouTube Shorts, Instagram Reels, TikTok"}
          </span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[12px] font-semibold">Atıf (içerik sahibi)
            <input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="Boş bırakılırsa platformdaki kanal adı" className={field} />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-semibold">Tür
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={field}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
        </div>
        <button disabled={busy || !venue || !url} className="h-11 self-start rounded-[3px] bg-ink px-6 text-[14px] font-bold text-paper disabled:opacity-40">{busy ? "Kaydediliyor…" : "Videoyu ekle"}</button>
        {msg && <p role="status" className={`text-[13px] ${msg.ok ? "text-pos-ink" : "text-neg-ink"}`}>{msg.text}</p>}
      </form>

      {venue && (
        <section>
          <h2 className="text-[13px] font-bold uppercase tracking-[0.18em]">{venue.name} · yayındaki videolar ({list.length})</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {list.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[13.5px]">
                <span className="min-w-0"><b>{PLATFORM_LABEL[v.platform]}</b> · {v.credit ?? "atıf yok"} · <a href={v.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{v.externalId}</a></span>
                <button type="button" onClick={() => remove(v.id)} disabled={busy} className="text-[12.5px] font-semibold text-neg-ink underline underline-offset-2">Yayından kaldır</button>
              </li>
            ))}
            {!list.length && <li className="py-3 text-[13px] text-ink-3">Bu mekânda video yok.</li>}
          </ul>
          <a href={`${BASE}/mekan/${venue.slug}/`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[13px] font-semibold underline underline-offset-4">Mekân sayfasında gör ↗</a>
        </section>
      )}
    </div>
  );
}
