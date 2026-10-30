"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAccountStatus } from "@/lib/community/accountState";
import { signInWithGoogle } from "@/lib/community/signin";

/* ──────────────────────────────────────────────────────────────────────────
   DENEME EŞİĞİN (gerçek mekân) — demodaki kart ve mobil şeridin görünümü; veri hesapta (/api/me/esik).
   · Kişisel takip tercihi; restoran değerlendirmesi değildir: puana, sıralamaya, deneyim ve doğrulanmış ziyaret
     sayılarına girmez; Kaydet / Gitmek istiyorum / Gittim'den bağımsızdır.
   · Yalnız yayımlanmış Gidenler puanı izlenir (Google vb. değil). Bildirim sunucuda, puan yayımlanınca üretilir.
   · Girişsiz: eşik seçilir; kaydetmek girişe götürür, seçim bu cihazda bekler ve giriş sonrası kaydedilir.
   · Sunucu onaylamadan "takip ediyorsun" denmez. Yalnız site içi bildirim (e-posta/SMS/push yok).
   ────────────────────────────────────────────────────────────────────────── */

export interface ThresholdVenue { slug: string; name: string; score: number | null; menu: boolean }
interface Watch { threshold: number; active: boolean; state: string; standing: { code: string; message: string } }

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const PENDING = "gidenler.esik.bekleyen.v1";
const link = "font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink";
const f1 = (n: number) => n.toFixed(1).replace(".", ",");
const ACC = ["ı", "i", "yi", "ü", "ü", "i", "yı", "yi", "i", "u"];
const withAcc = (n: number) => `${f1(n)}'${ACC[Math.round(n * 10) % 10]}`;
const parse = (s: string) => { const t = s.trim().replace(",", "."); return /^\d{1,2}(\.\d)?$/.test(t) ? Number(t) : NaN; };
const clamp = (n: number) => Math.min(9.9, Math.max(1, Math.round(n * 10) / 10));

/* kart ve mobil şerit aynı sayfada birlikte bulunur: bekleyen seçim yalnız bir kez gönderilir */
const autoSaving = new Set<string>();
function readPending(): { slug: string; threshold: number } | null {
  try { const v = JSON.parse(localStorage.getItem(PENDING) ?? "null"); return v && typeof v.slug === "string" && typeof v.threshold === "number" ? v : null; } catch { return null; }
}
function writePending(v: { slug: string; threshold: number } | null) {
  try { if (v) localStorage.setItem(PENDING, JSON.stringify({ ...v, at: new Date().toISOString() })); else localStorage.removeItem(PENDING); } catch { /* depolama kapalı */ }
}

function Picker({ initial, busy, onSave, onCancel }: { initial: number; busy: boolean; onSave: (t: number) => void; onCancel?: () => void }) {
  const [txt, setTxt] = useState(f1(initial));
  const n = parse(txt);
  const valid = Number.isFinite(n) && n >= 1 && n <= 9.9;
  const val = valid ? clamp(n) : clamp(initial);
  const step = (d: number) => setTxt(f1(clamp(val + d)));
  const btn = "flex h-9 w-9 items-center justify-center rounded-[3px] border border-line-2 text-[18px] font-bold hover:border-ink disabled:opacity-30";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => step(-0.1)} disabled={val <= 1} aria-label="Eşiği 0,1 azalt" className={btn}>−</button>
        <input type="text" inputMode="decimal" value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={() => valid && setTxt(f1(val))}
          aria-label="Deneme eşiği (1,0–9,9)" aria-invalid={!valid}
          className={`tnum h-9 w-16 rounded-[3px] border bg-paper text-center text-[18px] font-extrabold ${valid ? "border-line-2" : "border-neg"}`} />
        <button type="button" onClick={() => step(0.1)} disabled={val >= 9.9} aria-label="Eşiği 0,1 artır" className={btn}>+</button>
        <span className="text-[11.5px] text-ink-3">1,0–9,9</span>
      </div>
      {!valid && <p className="text-[11.5px] text-neg-ink">1,0 ile 9,9 arasında, en çok bir ondalıklı sayı yaz (ör. 8,3). Puan en çok 10 olduğu için daha yüksek eşik seçilemez.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!valid || busy} onClick={() => onSave(val)}
          className="h-9 rounded-[3px] bg-accent px-3 text-[13px] font-semibold text-on-accent hover:opacity-90 disabled:opacity-40">{busy ? "Kaydediliyor…" : `${withAcc(val)} aşınca haber ver`}</button>
        {onCancel && <button type="button" onClick={onCancel} className="h-9 px-2 text-[13px] font-semibold text-ink-3 hover:text-ink">Vazgeç</button>}
      </div>
    </div>
  );
}

function useWatch(v: ThresholdVenue) {
  const account = useAccountStatus();
  const [watch, setWatch] = useState<Watch | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<number | null>(null);

  const call = useCallback(async (method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`${BASE}/api/me/esik/`, { method, credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: v.slug, ...body }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { setMsg("Oturumun sona ermiş; yeniden giriş yap."); return false; }
      if (!r.ok) { setMsg(j.error === "not_ready" ? "Deneme eşiği şu an kaydedilemiyor; biraz sonra yeniden dene." : "Kaydedilemedi; yeniden dene."); return false; }
      setWatch(method === "DELETE" ? null : (j.watch as Watch));
      return true;
    } catch { setMsg("Bağlantı sorunu; kaydedilmedi. Yeniden dene."); return false; }
    finally { setBusy(false); }
  }, [v.slug]);

  useEffect(() => {
    if (account === "anon" || account === "off") { const p = readPending(); setDraft(p?.slug === v.slug ? p.threshold : null); setWatch(null); return; }
    if (account !== "in") return;
    let gone = false;
    (async () => {
      const r = await fetch(`${BASE}/api/me/esik/?slug=${encodeURIComponent(v.slug)}`, { cache: "no-store", credentials: "same-origin" }).catch(() => null);
      const j = r?.ok ? await r.json().catch(() => null) : null;
      if (gone) return;
      setWatch(j?.watch ?? null);
      if (!r?.ok) setMsg("Takip bilgin yüklenemedi; sayfayı yenile.");
      /* girişten dönüş: bu restoran için bekleyen seçim varsa bir kez kaydet */
      const p = readPending();
      if (p?.slug === v.slug && !autoSaving.has(v.slug)) { autoSaving.add(v.slug); writePending(null); await call("POST", { threshold: p.threshold }); autoSaving.delete(v.slug); }
    })();
    return () => { gone = true; };
  }, [account, v.slug, call]);

  const save = async (t: number) => {
    if (account === "in") return call("POST", { threshold: t });
    writePending({ slug: v.slug, threshold: t }); setDraft(t);
    if (!(await signInWithGoogle(`/mekan/${v.slug}/#esik`))) setMsg("Giriş başlatılamadı; seçimin bu cihazda bekliyor. Yeniden dene.");
    return false;
  };
  return { account, watch, busy, msg, draft, save, call };
}

function Body({ v, w }: { v: ThresholdVenue; w: ReturnType<typeof useWatch> }) {
  const [editing, setEditing] = useState(false);
  const { account, watch, busy, msg, draft } = w;
  const suggest = draft ?? (v.score === null ? 8 : clamp(v.score + 0.3));
  if (account === "unknown" || watch === undefined) return <p className="text-[12.5px] text-ink-3">Yükleniyor…</p>;
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[13.5px] font-semibold leading-snug">Kaç puanın üstüne çıkarsa denemek istersin?</p>
      {!watch || editing ? (
        <>
          <Picker initial={watch && editing ? watch.threshold : suggest} busy={busy}
            onSave={async (t) => { if (await w.save(t)) setEditing(false); }} onCancel={editing ? () => setEditing(false) : undefined} />
          {account !== "in" && <p className="text-[12px] leading-snug text-ink-3">Kaydetmek için Google ile giriş yaparsın; seçimin korunur ve girişten sonra hesabına kaydedilir.</p>}
          {v.score === null && <p className="text-[12px] leading-snug text-ink-2">Yeterli deneyim oluşması bekleniyor; puan oluşmadan da takip kurabilirsin.</p>}
        </>
      ) : (
        <>
          <p className="text-[14px]">
            {watch.active
              ? <><strong className="tnum text-[18px] font-extrabold">{f1(watch.threshold)}</strong> üstünü takip ediyorsun</>
              : <>Takip kapalı · eşiğin <strong className="tnum font-extrabold">{f1(watch.threshold)}</strong> saklı</>}
          </p>
          <p role="status" className="text-[12.5px] leading-snug text-ink-2">{watch.standing.message}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
            <button type="button" disabled={busy} onClick={() => setEditing(true)} className={link}>Eşiği değiştir</button>
            <button type="button" disabled={busy} onClick={() => w.call("PATCH", { active: !watch.active })} className={link}>{watch.active ? "Takibi kapat" : "Takibi aç"}</button>
            {watch.active && watch.state === "fired" && <button type="button" disabled={busy} onClick={() => w.call("POST", { threshold: watch.threshold })} className={link}>Takibi yeniden başlat</button>}
            <button type="button" disabled={busy} onClick={() => w.call("DELETE", {})} className={link}>Sil</button>
          </div>
        </>
      )}
      {msg && <p role="alert" className="text-[12px] text-neg-ink">{msg}</p>}
      <p className="border-t border-line pt-2 text-[11px] leading-snug text-ink-3">
        Kişisel beklentin; restoran değerlendirmesi değildir. Puana, deneyim sayısına ve sıralamaya etkisi yok; Kaydet / Gitmek istiyorum / Gittim&apos;den bağımsız.
        Bildirim yalnız site içinde, <Link href="/benim/#bildirimler" className={link}>Benim Gidenler&apos;im</Link> sayfasında görünür.
      </p>
    </div>
  );
}

function Head({ v }: { v: ThresholdVenue }) {
  return (
    <span className="flex min-w-0 items-baseline justify-between gap-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em]">Deneme eşiğin</span>
      <span className="tnum text-right text-[11px] leading-tight text-ink-3">Gidenler puanı {v.score === null ? <span className="text-ink-2">için yeterli deneyim bekleniyor</span> : <strong className="text-[14px] font-extrabold text-ink">{f1(v.score)}</strong>}</span>
    </span>
  );
}

/** Masaüstü: başlık yanındaki dar kart. */
export function ThresholdCard({ v }: { v: ThresholdVenue }) {
  const w = useWatch(v);
  return (
    <section id="esik" aria-label="Deneme eşiğin" className="flex scroll-mt-28 flex-col gap-2.5 border border-line-2 bg-paper p-3.5">
      <Head v={v} />
      <Body v={v} w={w} />
    </section>
  );
}

/** Mobil: fotoğrafların altında tek satır, dokununca açılır. */
export function ThresholdBar({ v }: { v: ThresholdVenue }) {
  const w = useWatch(v);
  const [open, setOpen] = useState(false);
  const summary = !w.watch ? "Eşik seç" : w.watch.active ? `${f1(w.watch.threshold)} üstünü takip ediyorsun` : "Takip kapalı";
  return (
    <section id="esik-mobil" aria-label="Deneme eşiğin" className="scroll-mt-28 border border-line-2 bg-paper">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left">
        <span className="flex min-w-0 flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.16em]">Deneme eşiğin</span>
          <span className="truncate text-[13px] font-semibold">{summary}</span>
        </span>
        <span className="tnum shrink-0 text-[12px] text-ink-3">Gidenler puanı {v.score === null ? "—" : <strong className="text-ink">{f1(v.score)}</strong>} <span aria-hidden className="ml-1">{open ? "▴" : "▾"}</span></span>
      </button>
      {open && <div className="border-t border-line px-3 pb-3 pt-2.5"><Body v={v} w={w} /></div>}
    </section>
  );
}
