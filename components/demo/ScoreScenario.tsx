"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { markNoticeRead, runScoreEvent, useThresholds } from "@/lib/thresholdStore";
import { eventId, MIN_NEW_EXPERIENCES, MIN_VERIFIED, type ScoreEvent } from "@/lib/threshold";
import { score1 } from "@/lib/format";
import { NoticeBody, type ThresholdVenue } from "./ThresholdCard";

/* ──────────────────────────────────────────────────────────────────────────
   SUNUM · PUAN DEĞİŞİMİNİ CANLANDIR — yalnız /demo'da.
   Senaryo restoranın demo başlangıç puanından (simüle demo verisi) başlar ve yalnız bu cihazdaki demo kaydında
   tutulur: sayfadaki puan, grafik, deneyim sayısı ve sıralama değişmez. Güven koşulu simülasyondur.
   ────────────────────────────────────────────────────────────────────────── */

type Kind = "asar" | "zayif" | "altinda" | "dalga";
const KINDS: { k: Kind; title: string; note: string }[] = [
  { k: "asar", title: "Eşiği aşan artış · güven koşulu sağlanıyor", note: `12 yeni deneyim, 5'i doğrulanmış ziyaret (simüle)` },
  { k: "zayif", title: "Eşiği aşan artış · güvenilir deneyim yetersiz", note: "4 yeni deneyim, 1'i doğrulanmış ziyaret (simüle)" },
  { k: "altinda", title: "Artış var ama eşiğin altında kalıyor", note: "8 yeni deneyim, 3'ü doğrulanmış ziyaret (simüle)" },
  { k: "dalga", title: "Eşik etrafında dalgalanma", note: "aş → in → yeniden aş; ikinci bildirim çıkmamalı" },
];
const r1 = (n: number) => Math.round(n * 10) / 10;

export function ScoreScenario({ venues }: { venues: ThresholdVenue[] }) {
  const data = useThresholds();
  const [slug, setSlug] = useState(venues[0]?.slug ?? "");
  const v = venues.find((x) => x.slug === slug) ?? venues[0];
  const pref = v ? data.prefs[v.entityId] : undefined;
  const [shown, setShown] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const raf = useRef<number | null>(null);
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);
  useEffect(() => { setShown(null); setLog([]); }, [slug]);
  if (!v) return null;
  const s = v.score;
  const latest = data.notices.find((n) => n.entityId === v.entityId && pref && n.threshold === pref.threshold);

  const animate = (from: number, to: number) => new Promise<void>((done) => {
    const t0 = performance.now(), D = 1100;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / D); const e = p * p * (3 - 2 * p);
      setShown(from + (to - from) * e);
      if (p < 1) raf.current = requestAnimationFrame(tick); else done();
    };
    raf.current = requestAnimationFrame(tick);
  });
  const ev = (from: number, to: number, n: number, ver: number): ScoreEvent => ({ id: eventId(v.entityId, from, to, n, ver), entityId: v.entityId, from, to, newExperiences: n, verifiedExperiences: ver, simulated: true });
  const venueInfo = { slug: v.slug, name: v.name, menu: v.menu, reservation: v.reservation };

  async function play(kind: Kind) {
    if (s === null || busy) return;
    const t = pref?.threshold ?? r1(s + 0.3);
    const up = r1(Math.max(s + 0.1, t + 0.1));
    const steps: ScoreEvent[] =
      kind === "asar" ? [ev(s, up, 12, 5)] :
      kind === "zayif" ? [ev(s, up, 4, 1)] :
      kind === "altinda" ? [ev(s, r1(Math.min(t, s + 0.2)), 8, 3)] :
      [ev(s, up, 12, 5), ev(up, r1(t - 0.1), 9, 3), ev(r1(t - 0.1), r1(t + 0.2), 12, 5)];
    setBusy(true); setLog([]);
    for (const e of steps) {
      await animate(e.from, e.to);
      const r = runScoreEvent(e, venueInfo);
      setLog((l) => [...l, `${score1(e.from)} → ${score1(e.to)}: ${r.created ? "Örnek bildirim oluştu. " : ""}${r.message}`]);
    }
    setBusy(false);
  }

  const belowOk = s !== null && pref && pref.threshold > r1(s);
  return (
    <section id="canlandir" aria-labelledby="h-canlandir" className="mt-12 scroll-mt-24 border-t-2 border-line-strong pt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="h-canlandir" className="label">Puan değişimini canlandır · deneme eşiği</h2>
        <span className="text-[12px] text-ink-3">Sunum senaryosu · yalnız bu cihazdaki demo kaydı</span>
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">Restoran
            <select value={slug} onChange={(e) => setSlug(e.target.value)} className="h-10 rounded-[3px] border border-line-2 bg-paper px-2 text-[14px] font-semibold normal-case tracking-normal text-ink">
              {venues.map((x) => <option key={x.slug} value={x.slug}>{x.name}{x.score === null ? " (puan yok)" : ` · ${score1(x.score)}`}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-6">
            <div className="flex flex-col"><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3">{shown !== null ? "Senaryo sonucu" : "Demo başlangıç puanı"}</span>
              <span className="tnum text-[34px] font-extrabold leading-none">{s === null ? "—" : score1(shown ?? s)}</span>
              {shown !== null && <span className="text-[11px] text-ink-3">demo başlangıç puanı {s === null ? "—" : score1(s)} · sayfada değişmez</span>}</div>
            <div className="flex flex-col"><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3">Eşiğin</span>
              <span className="tnum text-[22px] font-extrabold leading-none">{pref ? score1(pref.threshold) : "—"}</span>
              <span className="text-[11px] text-ink-3">{!pref ? "seçilmedi" : pref.notify ? "takipte" : "takip kapalı"}</span></div>
          </div>
          {!pref && <p className="text-[13px] text-ink-2">Önce <Link href={`/mekan/${v.slug}/`} className="font-semibold underline underline-offset-4">{v.name}</Link> sayfasındaki “Deneme eşiğin” kartından bir eşik kaydet; eşik yoksa senaryo bildirim üretmez.</p>}
          {s === null && <p className="text-[13px] text-ink-2">Yeterli deneyim oluşması bekleniyor: bu restoranın henüz Gidenler puanı yok, senaryo çalışmaz.</p>}
          <p className="text-[12px] leading-relaxed text-ink-3">
            Senaryo, restoranın demo başlangıç puanından başlar (bu puan da simüle demo verisidir); sayfadaki puan, grafik, deneyim sayısı ve sıralama değişmez. Güven koşulu (en az {MIN_NEW_EXPERIENCES} yeni deneyim, en az {MIN_VERIFIED} doğrulanmış ziyaret) simülasyondur; Google ile giriş yapmış olmak ziyaret doğrulaması sayılmaz. Gerçek e-posta, SMS ya da push bildirimi gönderilmez.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {KINDS.map(({ k, title, note }) => (
            <button key={k} type="button" disabled={busy || s === null || (k === "altinda" && !belowOk)} onClick={() => play(k)}
              className="flex flex-col items-start gap-0.5 border border-line-2 px-3 py-2.5 text-left hover:border-ink disabled:opacity-40">
              <span className="text-[14px] font-bold">{title}</span>
              <span className="text-[12px] text-ink-3">{k === "altinda" && !belowOk ? "Eşik güncel puanın üstünde olmalı" : note}</span>
            </button>
          ))}
          {log.length > 0 && (
            <ol role="status" className="mt-1 flex flex-col gap-1.5 border-l-2 border-line-2 pl-3 text-[12.5px] leading-snug text-ink-2">
              {log.map((l, i) => <li key={i}>{l}</li>)}
            </ol>
          )}
          {latest && pref?.notify && <div className="mt-2 border border-accent p-3"><NoticeBody n={latest} onGo={() => markNoticeRead(latest.id)} /></div>}
        </div>
      </div>
    </section>
  );
}
