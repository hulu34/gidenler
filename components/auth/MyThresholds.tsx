"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccountStatus } from "@/lib/community/accountState";

/* BENİM GİDENLER'İM · Deneme eşiklerim ve Bildirimler (hesaptaki kayıtlar; girişsizken görünmez).
   Eşik kişisel takip tercihidir; restoran değerlendirmesi değildir. Bildirimler yalnız site içindedir. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const f1 = (n: number) => n.toFixed(1).replace(".", ",");
const day = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
const link = "font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink";
interface W { slug: string; place: string; threshold: number; active: boolean; state: string; standing: { code: string; message: string } }
interface N { id: string; slug: string; place: string; threshold: number; score: number; scoredAt: string; createdAt: string; read: boolean; first: boolean; text: string; menu: boolean }
const send = (path: string, method: string, body: unknown) =>
  fetch(`${BASE}${path}`, { method, credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);

export function MyThresholds() {
  const account = useAccountStatus();
  const [rows, setRows] = useState<W[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (account !== "in") return;
    fetch(`${BASE}/api/me/esik/`, { cache: "no-store", credentials: "same-origin" }).then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { watches: W[] }) => setRows(j.watches)).catch(() => setErr("Deneme eşiklerin yüklenemedi; sayfayı yenile."));
  }, [account]);
  async function toggle(w: W) {
    setErr(null);
    const r = await send("/api/me/esik/", "PATCH", { slug: w.slug, active: !w.active });
    const j = r?.ok ? await r.json() : null;
    if (j?.watch) setRows((x) => x?.map((y) => (y.slug === w.slug ? j.watch : y)) ?? null); else setErr("Değiştirilemedi; yeniden dene.");
  }
  async function remove(w: W) {
    setErr(null);
    const r = await send("/api/me/esik/", "DELETE", { slug: w.slug });
    if (r?.ok) setRows((x) => x?.filter((y) => y.slug !== w.slug) ?? null); else setErr("Silinemedi; yeniden dene.");
  }
  if (account !== "in") return null;
  return (
    <section className="mt-10 border-t-2 border-line-strong pt-6" aria-labelledby="h-esik">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="h-esik" className="text-[13px] font-bold uppercase tracking-[0.2em]">Deneme eşiklerim</h2>
        <span className="text-[12px] text-ink-3">Kişisel takip; restoran puanına ve sıralamaya etkisi yok.</span>
      </div>
      {err && <p role="alert" className="mt-3 text-[13px] text-neg-ink">{err}</p>}
      {rows && rows.length === 0 && <p className="mt-3 text-[14px] text-ink-2">Henüz bir eşik kurmadın. Restoran sayfasındaki &ldquo;Deneme eşiğin&rdquo; kartından kurabilirsin.</p>}
      <ul className="mt-2">
        {rows?.map((w) => (
          <li key={w.slug} className="grid gap-x-6 gap-y-1.5 border-t border-line py-3.5 sm:grid-cols-[1fr_auto]">
            <div className="flex min-w-0 flex-col gap-1">
              <Link href={`/mekan/${w.slug}/#esik`} className="text-[17px] font-bold leading-tight hover:text-accent-ink">{w.place}</Link>
              <span className="text-[13px]">{w.active ? <><strong className="tnum">{f1(w.threshold)}</strong> üstünü takip ediyorsun</> : <>Takip kapalı · eşik <strong className="tnum">{f1(w.threshold)}</strong></>}</span>
              <span className="text-[12.5px] leading-snug text-ink-2">{w.standing.message}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
              <Link href={`/mekan/${w.slug}/#esik`} className={link}>Eşiği değiştir</Link>
              <button type="button" onClick={() => toggle(w)} className={link}>{w.active ? "Takibi kapat" : "Takibi aç"}</button>
              <button type="button" onClick={() => remove(w)} className={link}>Sil</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MyNotifications() {
  const account = useAccountStatus();
  const [data, setData] = useState<{ items: N[]; unread: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (account !== "in") return;
    fetch(`${BASE}/api/me/bildirimler/`, { cache: "no-store", credentials: "same-origin" }).then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData).catch(() => setErr("Bildirimler yüklenemedi; sayfayı yenile."));
  }, [account]);
  async function read(id: string | "all") {
    const r = await send("/api/me/bildirimler/", "POST", { read: id });
    if (!r?.ok) { setErr("İşaretlenemedi; yeniden dene."); return; }
    setData((d) => d && ({ unread: id === "all" ? 0 : Math.max(0, d.unread - (d.items.find((x) => x.id === id && !x.read) ? 1 : 0)), items: d.items.map((x) => (id === "all" || x.id === id ? { ...x, read: true } : x)) }));
  }
  if (account !== "in") return null;
  return (
    <section id="bildirimler" className="mt-10 scroll-mt-28 border-t-2 border-line-strong pt-6" aria-labelledby="h-bildirim">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="h-bildirim" className="text-[13px] font-bold uppercase tracking-[0.2em]">Bildirimler</h2>
        <span className="flex items-center gap-4 text-[12px] text-ink-3">
          {data && <span className="tnum">{data.unread} okunmamış</span>}
          {data && data.unread > 0 && <button type="button" onClick={() => read("all")} className={link}>Tümünü okundu say</button>}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-ink-3">Yalnız site içinde; e-posta, SMS ya da telefon bildirimi gönderilmez.</p>
      {err && <p role="alert" className="mt-3 text-[13px] text-neg-ink">{err}</p>}
      {data && data.items.length === 0 && <p className="mt-3 text-[14px] text-ink-2">Henüz bildirim yok. Takip ettiğin bir restoranın yayımlanmış Gidenler puanı eşiğini aşınca burada görünür.</p>}
      <ul className="mt-2">
        {data?.items.map((n) => (
          <li key={n.id} className={`flex flex-col gap-1.5 border-t border-line py-3.5 ${n.read ? "" : "border-l-2 border-l-accent pl-3"}`}>
            <span className="flex flex-wrap items-baseline gap-x-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              <span>{n.read ? "Okundu" : "Okunmadı"}</span><span className="normal-case tracking-normal">{day(n.scoredAt)}</span>
            </span>
            <p className="text-[14.5px] font-semibold leading-snug">{n.text}</p>
            <span className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
              <Link href={`/mekan/${n.slug}/`} onClick={() => !n.read && read(n.id)} className={link}>Restoran sayfası</Link>
              <Link href={`/mekan/${n.slug}/#deneyimler`} onClick={() => !n.read && read(n.id)} className={link}>Son deneyimler</Link>
              {n.menu && <Link href={`/mekan/${n.slug}/#menu`} onClick={() => !n.read && read(n.id)} className={link}>Menü</Link>}
              {!n.read && <button type="button" onClick={() => read(n.id)} className={link}>Okundu say</button>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
