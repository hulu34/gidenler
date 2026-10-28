"use client";

import Link from "next/link";
import { useState } from "react";
import { markNoticeRead, setThreshold, setThresholdNotify, useThresholds } from "@/lib/thresholdStore";
import { clampThreshold, noticeText, standing, withAcc, type ThresholdNotice } from "@/lib/threshold";
import { score1 } from "@/lib/format";

/* ──────────────────────────────────────────────────────────────────────────
   DENEME EŞİĞİN — yatırımcı demosunda deneyim mührünün yerinde.
   Kişisel beklenti / takip tercihi: restoran değerlendirmesi değildir; puana, deneyim sayısına ve sıralamaya
   girmez; Kaydet / Gitmek istiyorum / Gittim'den bağımsızdır. Yalnız bu cihazdaki demo kaydında durur.
   Masaüstü: mührün yerinde dar kart. Mobil: tek satır, dokununca açılır (ilk ekrandaki fotoğrafları itmez).
   ────────────────────────────────────────────────────────────────────────── */

export interface ThresholdVenue { entityId: string; slug: string; name: string; score: number | null; menu: boolean; reservation: boolean }

const link = "font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink";

export function NoticeLinks({ n, onGo }: { n: Pick<ThresholdNotice, "slug" | "links">; onGo?: () => void }) {
  const base = `/mekan/${n.slug}/`;
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
      <Link href={`${base}#deneyimler`} onClick={onGo} className={link}>Son deneyimler</Link>
      {n.links.menu && <Link href={`${base}#menu`} onClick={onGo} className={link}>Menü</Link>}
      {n.links.reservation && <Link href={`${base}#bilgi`} onClick={onGo} className={link}>Demo rezervasyon</Link>}
    </span>
  );
}

/** Örnek bildirimin gövdesi (kartta ve sayfa altındaki bildirimde aynı). */
export function NoticeBody({ n, onGo }: { n: ThresholdNotice; onGo?: () => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="self-start border border-dashed border-line-2 px-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-3">Örnek bildirim — demo</span>
      <p className="text-[13.5px] font-semibold leading-snug">{noticeText(n)}</p>
      <NoticeLinks n={n} onGo={onGo} />
    </div>
  );
}

const parse = (s: string) => Number(s.replace(",", ".").trim());

function Picker({ initial, onSave, onCancel }: { initial: number; onSave: (t: number) => void; onCancel?: () => void }) {
  const [txt, setTxt] = useState(score1(initial));
  const n = parse(txt);
  const valid = Number.isFinite(n) && n >= 1 && n <= 10;
  const val = valid ? clampThreshold(n) : clampThreshold(initial);
  const step = (d: number) => setTxt(score1(clampThreshold(val + d)));
  const btn = "flex h-9 w-9 items-center justify-center rounded-[3px] border border-line-2 text-[18px] font-bold hover:border-ink disabled:opacity-30";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => step(-0.1)} disabled={val <= 1} aria-label="Eşiği 0,1 azalt" className={btn}>−</button>
        <input type="text" inputMode="decimal" value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={() => valid && setTxt(score1(val))}
          aria-label="Deneme eşiği (1–10)" aria-invalid={!valid}
          className={`tnum h-9 w-16 rounded-[3px] border bg-paper text-center text-[18px] font-extrabold ${valid ? "border-line-2" : "border-neg"}`} />
        <button type="button" onClick={() => step(0.1)} disabled={val >= 10} aria-label="Eşiği 0,1 artır" className={btn}>+</button>
        <span className="text-[11.5px] text-ink-3">1–10</span>
      </div>
      {!valid && <p className="text-[11.5px] text-neg-ink">1 ile 10 arasında bir sayı yaz (ör. 8,3).</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!valid} onClick={() => onSave(val)}
          className="h-9 rounded-[3px] bg-accent px-3 text-[13px] font-semibold text-on-accent hover:opacity-90 disabled:opacity-40">{withAcc(val)} aşınca haber ver</button>
        {onCancel && <button type="button" onClick={onCancel} className="h-9 px-2 text-[13px] font-semibold text-ink-3 hover:text-ink">Vazgeç</button>}
      </div>
    </div>
  );
}

function Body({ v }: { v: ThresholdVenue }) {
  const data = useThresholds();
  const pref = data.prefs[v.entityId];
  const sc = data.scenarios[v.entityId];
  const notice = data.notices.find((n) => n.entityId === v.entityId && pref && n.threshold === pref.threshold);
  const [editing, setEditing] = useState(false);
  const suggest = v.score === null ? 8 : Math.min(10, Math.round((v.score + 0.3) * 10) / 10);
  const st = pref ? standing(pref, v.score) : null;

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[13.5px] font-semibold leading-snug">Kaç puanın üstüne çıkarsa denemek istersin?</p>
      {!pref || editing ? (
        <Picker initial={pref?.threshold ?? suggest} onSave={(t) => { setThreshold(v.entityId, t); setEditing(false); }} onCancel={editing ? () => setEditing(false) : undefined} />
      ) : (
        <>
          <p className="text-[14px]">
            {pref.notify
              ? <><strong className="tnum text-[18px] font-extrabold">{score1(pref.threshold)}</strong> üstünü takip ediyorsun</>
              : <>Takip kapalı · eşiğin <strong className="tnum font-extrabold">{score1(pref.threshold)}</strong> saklı</>}
          </p>
          <p role="status" className="text-[12.5px] leading-snug text-ink-2">{st!.message}</p>
          {sc && (
            <p className="text-[12px] leading-snug text-ink-3">
              <span className="mr-1 border border-dashed border-line-2 px-1 text-[9.5px] font-bold uppercase tracking-[0.08em]">sunum senaryosu</span>
              {score1(sc.from)} → {score1(sc.to)} · {sc.state === "asti" ? "eşik aşıldı" : sc.message}
            </p>
          )}
          {notice && pref.notify && <div className="border-l-2 border-accent pl-2.5"><NoticeBody n={notice} onGo={() => markNoticeRead(notice.id)} /></div>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
            <button type="button" onClick={() => setEditing(true)} className={link}>Eşiği değiştir</button>
            <button type="button" onClick={() => setThresholdNotify(v.entityId, !pref.notify)} className={link}>{pref.notify ? "Takibi kapat" : "Takibi aç"}</button>
          </div>
        </>
      )}
      <p className="border-t border-line pt-2 text-[11px] leading-snug text-ink-3">
        Kişisel beklentin; restoran değerlendirmesi değildir. Puana, deneyim sayısına ve sıralamaya etkisi yok; Kaydet / Gitmek istiyorum / Gittim&apos;den bağımsız. Yalnız bu cihazdaki demo kaydında.
      </p>
    </div>
  );
}

function Head({ v }: { v: ThresholdVenue }) {
  return (
    <span className="flex min-w-0 items-baseline justify-between gap-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em]">Deneme eşiğin</span>
      <span className="tnum text-[11.5px] text-ink-3">Gidenler {v.score === null ? <span className="text-ink-2">henüz yok</span> : <strong className="text-[14px] font-extrabold text-ink">{score1(v.score)}</strong>}</span>
    </span>
  );
}

/** Masaüstü: mührün yerinde dar kart. */
export function ThresholdCard({ v }: { v: ThresholdVenue }) {
  return (
    <section aria-label="Deneme eşiğin" className="flex flex-col gap-2.5 border border-line-2 bg-paper p-3.5">
      <Head v={v} />
      <Body v={v} />
    </section>
  );
}

/** Mobil: tek satır özet, dokununca aynı içerik açılır. */
export function ThresholdBar({ v }: { v: ThresholdVenue }) {
  const data = useThresholds();
  const pref = data.prefs[v.entityId];
  const [open, setOpen] = useState(false);
  const summary = !pref ? "Eşik seç" : pref.notify ? `${score1(pref.threshold)} üstünü takip ediyorsun` : "Takip kapalı";
  return (
    <section aria-label="Deneme eşiğin" className="border border-line-2 bg-paper">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left">
        <span className="flex min-w-0 flex-col">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.16em]">Deneme eşiğin</span>
          <span className="truncate text-[13px] font-semibold">{summary}</span>
        </span>
        <span className="tnum shrink-0 text-[12px] text-ink-3">Gidenler {v.score === null ? "—" : <strong className="text-ink">{score1(v.score)}</strong>} <span aria-hidden className="ml-1">{open ? "▴" : "▾"}</span></span>
      </button>
      {open && <div className="border-t border-line px-3 pb-3 pt-2.5"><Body v={v} /></div>}
    </section>
  );
}
