"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/* SOR GİDENLER — soru görünür kalır, kartlar profile gider, takip soruları önceki isteği korur.
   Model devre dışıysa bu açıkça yazılır; hata "sonuç yok" gibi gösterilmez. */
const API = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/sor/`;
type Item = { slug: string; name: string; kind: string; district: string; address: string | null; href: string; why: string[]; caveats: string[]; areaFit: string | null };
type Res = { mode: "ai" | "veri"; reason: string | null; understood: Record<string, unknown>; items: Item[]; alternatives: Item[]; altLabel: string | null; note: string | null; question: string | null; relaxed: string | null; context: unknown; shown: string[] };
type Turn = { q: string; res?: Res; error?: string };
const ORNEKLER = ["Galata'da iyi bir Samsun pidesi yemek istiyorum.", "Ataşehir'de kebap", "Balık yiyebileceğimiz sakin bir restoran?", "Uygun fiyatlı ama kaliteli bir esnaf lokantası öner."];
const REFINE: Array<[string, string]> = [["cheaper", "Daha ekonomik olsun"], ["other_area", "Başka semtte olsun"], ["quieter", "Daha sakin bir yer öner"], ["another", "Başka öner"]];
const REASON: Record<string, string> = {
  not_configured: "AI yorumu şu an kapalı. Öneriler kayıtlı verilerden kurallarla seçildi.",
  budget: "AI bütçe sınırına ulaştı. Öneriler kayıtlı verilerden kurallarla seçildi.",
  timeout: "AI zamanında yanıt vermedi. Öneriler kayıtlı verilerden kurallarla seçildi.",
  provider_error: "AI servisine ulaşılamadı. Öneriler kayıtlı verilerden kurallarla seçildi.",
  invalid_output: "AI yanıtı kullanılamadı. Öneriler kayıtlı verilerden kurallarla seçildi.",
};

function Understood({ u }: { u: Record<string, unknown> }) {
  const parts = [u.area, u.dish === "samsun" ? "Samsun pidesi" : u.dish ?? u.cuisine, ...((u.attrs as string[]) ?? []).filter((a) => a !== "kalite"), u.party ? `${u.party} kişi` : null].filter(Boolean) as string[];
  return parts.length ? <p className="text-[12.5px] text-ink-3">Anladığım: {parts.join(" · ")}</p> : null;
}

function Card({ c, i }: { c: Item; i: number }) {
  return (
    <li data-sor-kart={c.slug}>
      <Link href={c.href} className="group flex flex-col gap-1.5 border-t border-line py-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{i + 1} · {c.kind} · {c.district}</span>
        <span className="text-[19px] font-extrabold leading-tight tracking-[-0.02em] group-hover:text-accent-ink">{c.name}</span>
        <span className="flex flex-col gap-0.5 text-[14px] leading-snug text-ink-2">{c.why.slice(0, 3).map((w) => <span key={w}>{w}</span>)}</span>
        {c.caveats.length > 0 && <span className="text-[12.5px] leading-snug text-ink-3">{c.caveats.join(" ")}</span>}
        <span className="text-[13px] font-bold underline underline-offset-2">Profili aç</span>
      </Link>
    </li>
  );
}

export function SorAsistan() {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const last = [...turns].reverse().find((t) => t.res)?.res;

  const send = useCallback(async (text: string, refine: string | null, prev: Res | undefined) => {
    const t = text.trim(); if (!t) return;
    setBusy(true); setQ(""); setTurns((x) => [...x, { q: t }]);
    let turn: Turn = { q: t };
    try {
      const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: t, context: prev?.context ?? null, refine, shown: prev?.shown ?? [] }) });
      const j = await r.json().catch(() => null);
      turn = r.ok && j?.items ? { q: t, res: j } : { q: t, error: j?.message ?? "Sor Gidenler şu an yanıt veremedi. Bu bir bağlantı sorunu; \"sonuç yok\" anlamına gelmez." };
    } catch { turn = { q: t, error: "Bağlantı koptu. Bu \"sonuç yok\" anlamına gelmez; yeniden dene." }; }
    setTurns((x) => [...x.slice(0, -1), turn]); setBusy(false);
  }, []);

  useEffect(() => { const p = new URLSearchParams(window.location.search).get("q"); if (p) void send(p, null, undefined); }, [send]);
  useEffect(() => { if (turns.length) end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [turns, busy]);

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-5 pb-24 pt-8 sm:px-7 sm:pt-14">
      <header className="flex flex-col gap-2">
        <p className="label">Sor Gidenler</p>
        <h1 className="text-[clamp(1.9rem,6vw,3rem)] font-extrabold leading-[1] tracking-[-0.04em]">Nereye gidelim?</h1>
        <p className="max-w-[58ch] text-[14.5px] leading-relaxed text-ink-2">Ne istediğini yaz: semt, yemek, ortam. Yalnız Gidenler&apos;de kayıtlı mekânları, kayıtlı bilgilerle öneririm; bilmediğimi söylerim.</p>
      </header>
      {!turns.length && <ul className="flex flex-wrap gap-2">{ORNEKLER.map((o) => <li key={o}><button type="button" onClick={() => void send(o, null, undefined)} className="min-h-11 rounded-full border border-line-2 px-3.5 py-1.5 text-left text-[13px] font-semibold hover:bg-sheet">{o}</button></li>)}</ul>}
      <div className="flex flex-col gap-8" aria-live="polite">
        {turns.map((t, n) => (
          <section key={n} data-sor-tur className="flex flex-col gap-3">
            <p data-sor-soru className="self-end rounded-2xl bg-sheet px-4 py-2.5 text-[15px] font-semibold">{t.q}</p>
            {!t.res && !t.error && <p role="status" className="animate-pulse text-[14px] text-ink-3">Kayıtlı mekânlara bakıyorum…</p>}
            {t.error && <p role="alert" className="text-[14px] font-semibold text-neg-ink">{t.error}</p>}
            {t.res && (
              <div className="flex flex-col gap-2" data-sor-mod={t.res.mode}>
                <Understood u={t.res.understood} />
                {t.res.mode === "veri" && t.res.reason && <p data-sor-uyari className="border-l-2 border-line-strong pl-3 text-[13px] text-ink-2">{REASON[t.res.reason]}</p>}
                {t.res.relaxed && <p className="text-[14px] font-semibold">{t.res.relaxed}</p>}
                {t.res.note && <p className="text-[14px] text-ink-2">{t.res.note}</p>}
                {t.res.items.length > 0 && <ol className="flex flex-col">{t.res.items.map((c, i) => <Card key={c.slug} c={c} i={i} />)}</ol>}
                {t.res.alternatives?.length > 0 && <div data-sor-alternatif className="flex flex-col gap-1 pt-2"><p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">Koşulunu tam karşılamıyor · {t.res.altLabel}</p><ol className="flex flex-col">{t.res.alternatives.map((c, i) => <Card key={c.slug} c={c} i={i} />)}</ol></div>}
                {t.res.question && <p className="text-[14.5px] font-semibold">{t.res.question}</p>}
              </div>
            )}
          </section>
        ))}
        <div ref={end} />
      </div>
      {last && !busy && <div className="flex flex-wrap gap-2" aria-label="Öneriyi daralt">{REFINE.map(([k, l]) => <button key={k} type="button" onClick={() => void send(l, k, last)} className="min-h-11 rounded-full border border-line-strong px-3.5 py-1.5 text-[13px] font-bold hover:bg-sheet">{l}</button>)}</div>}
      <form onSubmit={(e) => { e.preventDefault(); void send(q, null, last); }} className="sticky bottom-3 flex gap-2 bg-paper/95 py-2">
        <textarea value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(q, null, last); } }} maxLength={600} rows={1} aria-label="Sorun" placeholder={last ? "Devam et: daha ucuz, Kadıköy olsun…" : "Galata'da iyi bir Samsun pidesi…"} className="min-h-12 flex-1 resize-none border border-line-strong bg-paper px-3 py-2.5 text-[16px]" />
        <button type="submit" disabled={busy || !q.trim()} className="min-h-12 bg-ink px-5 text-[14px] font-bold text-paper disabled:opacity-40">Sor</button>
      </form>
    </div>
  );
}
