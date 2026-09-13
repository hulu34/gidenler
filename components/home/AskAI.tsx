"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { askAI, type AIAnswer, type AIStructured, type FollowUp } from "@/lib/decisionEngine";
import { recordIntent, setEntityState, useUserData } from "@/lib/store";
import { nf } from "@/lib/format";

/* ──────────────────────────────────────────────────────────────────────────
   GİDENLER AI'A SOR — "Koşullarıma göre hangisini seçmeliyim?"
   Normal arama ("Ne arıyorum?") header'da ve /ara'da; burası karar alanı.
   Doğal dil birincil; Nerede / Gün / Saat / Kaç kişi / Kategori isteğe bağlı ve metinle birleşir.
   Sonuç: TOP 3 · NEDEN? · DİKKAT · kanıt satırı. Canlı uygunluk / masa iddiası yok.
   ────────────────────────────────────────────────────────────────────────── */

const DISTRICTS = ["Kadıköy", "Beşiktaş", "Beyoğlu", "Şişli", "Üsküdar", "Sarıyer", "Fatih", "Bakırköy", "Ataşehir", "Maltepe", "Beykoz", "Adalar"];
const DAYS = ["Bugün", "Yarın", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const TIMES = ["09:00", "10:30", "12:00", "12:30", "13:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:30"];
const CATS: Array<[AIStructured["category"] & string, string]> = [["hepsi", "Hepsi"], ["yemek", "Yemek"], ["kahve", "Kahve"], ["gece", "Gece"], ["konaklama", "Konaklama"], ["kultur", "Kültür"]];
const EXAMPLES = [
  "Cumartesi 20:30'da Kadıköy'de 4 kişi pide yemek istiyoruz. Sakin olsun, F/P iyi olsun.",
  "Beşiktaş'ta sakin kahve",
  "Bu akşam iyi sushi",
  "Pazar kahvaltısı için Boğaz tarafında sakin yer",
  "Şişli'de hızlı öğle yemeği",
  "Kadıköy'de F/P iyi döner",
];

export function AskAI() {
  const user = useUserData();
  const personalized = user.demoMode === "investor" || Object.keys(user.taste.dimensions).length > 0 || Object.keys(user.taste.cuisines).length > 0 || user.taste.dislikes.length > 0;
  const [text, setText] = useState("");
  const [s, setS] = useState<AIStructured>({ category: "hepsi" });
  const [asked, setAsked] = useState<{ text: string; s: AIStructured } | null>(null);
  const [follow, setFollow] = useState<FollowUp | null>(null);
  const [showParts, setShowParts] = useState<string | null>(null);

  /* ?ai=… ile gelen sorgu otomatik çalışır (demo bağlantıları) */
  useEffect(() => {
    try { const p = new URLSearchParams(window.location.search).get("ai"); if (p) { setText(p); setAsked({ text: p, s: { category: "hepsi" } }); } } catch { /* yok say */ }
  }, []);

  const answer: AIAnswer | null = useMemo(() => {
    if (!asked) return null;
    if (!asked.text.trim() && !asked.s.location && !asked.s.day) return null;
    return askAI(asked.text, asked.s, { personalized, taste: user.taste, followUp: follow });
  }, [asked, follow, personalized, user.taste]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t && !s.location) return;
    setFollow(null); setShowParts(null);
    setAsked({ text: t, s });
    recordIntent(t || [s.location, s.day, s.time, s.party ? `${s.party} kişi` : ""].filter(Boolean).join(" "));
  };
  const sel = "h-9 border-b-2 border-line-2 bg-transparent pr-5 text-[13px] font-semibold outline-none focus:border-accent";

  return (
    <section aria-labelledby="h-ai" className="border-t-2 border-line-strong pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="h-ai" className="text-[13px] font-bold uppercase tracking-[0.2em]">Gidenler AI&apos;a Sor</h2>
        <Link href="/ara/" className="text-[12px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Sadece bir yer mi arıyorsun? Ara →</Link>
      </div>
      <p className="mt-1 text-[15px] text-ink-2">Nereye gideceğini Gidenler&apos;e anlat; koşullarına göre deneyim grafiğinden seçsin.</p>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} rows={2}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Cumartesi 20:30'da Kadıköy'de 4 kişi pide yemek istiyoruz. Sakin olsun, F/P iyi olsun."
          aria-label="Gidenler AI'a sor"
          className="w-full resize-none border-b-2 border-line-strong bg-transparent pb-2 text-[clamp(1.0625rem,2.4vw,1.35rem)] leading-snug outline-none placeholder:text-ink-3 focus:border-accent"
        />
        <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
          <label className="flex flex-col gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-3">Nerede?
            <select value={s.location ?? ""} onChange={(e) => setS({ ...s, location: e.target.value || undefined })} className={sel}><option value="">Belirtme</option>{DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}</select>
          </label>
          <label className="flex flex-col gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-3">Gün
            <select value={s.day ?? ""} onChange={(e) => setS({ ...s, day: e.target.value || undefined })} className={sel}><option value="">Belirtme</option>{DAYS.map((d) => <option key={d} value={d}>{d}</option>)}</select>
          </label>
          <label className="flex flex-col gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-3">Saat
            <select value={s.time ?? ""} onChange={(e) => setS({ ...s, time: e.target.value || undefined })} className={sel}><option value="">Belirtme</option>{TIMES.map((d) => <option key={d} value={d}>{d}</option>)}</select>
          </label>
          <label className="flex flex-col gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-3">Kaç kişi?
            <input type="number" min={1} max={20} value={s.party ?? ""} onChange={(e) => setS({ ...s, party: e.target.value ? Number(e.target.value) : undefined })} placeholder="—" className={`${sel} tnum w-16 pr-0`} />
          </label>
          <label className="flex flex-col gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-3">Ne için?
            <select value={s.category ?? "hepsi"} onChange={(e) => setS({ ...s, category: e.target.value as AIStructured["category"] })} className={sel}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
          <button type="submit" className="h-10 rounded-[3px] bg-accent px-5 text-[14px] font-semibold text-on-accent">Gidenler AI&apos;a sor</button>
        </div>
        {!answer && (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-3">
            <span>Örnek:</span>
            {EXAMPLES.slice(0, 4).map((o) => (
              <button key={o} type="button" onClick={() => { setText(o); setFollow(null); setAsked({ text: o, s }); recordIntent(o); }} className="text-left underline decoration-line-2 underline-offset-4 hover:text-ink hover:decoration-ink">“{o}”</button>
            ))}
          </p>
        )}
      </form>

      {answer && <Answer a={answer} follow={follow} setFollow={setFollow} showParts={showParts} setShowParts={setShowParts} personalized={personalized} rel={user.relationships} />}
    </section>
  );
}

/* ───── yanıt ───── */
function Answer({ a, follow, setFollow, showParts, setShowParts, personalized, rel }: {
  a: AIAnswer; follow: FollowUp | null; setFollow: (f: FollowUp | null) => void; showParts: string | null; setShowParts: (s: string | null) => void; personalized: boolean; rel: Record<string, { state: string } | undefined>;
}) {
  const conf = a.overallConfidence;
  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px]">
        <span className="label">Anlaşılan</span>
        {a.intent.understood.map((u) => <span key={u} className="border border-line-2 px-2 py-0.5 font-semibold text-ink-2">{u}</span>)}
        <span className={`ml-auto font-semibold ${conf === "Yüksek" ? "text-pos-ink" : conf === "Orta" ? "text-ink-2" : "text-warn"}`}>Güven: {conf}</span>
      </div>

      {a.regulated ? (
        <div className="flex flex-col gap-3">
          <p className="max-w-[70ch] border-l-2 border-line-2 pl-4 text-[13.5px] leading-relaxed text-ink-2">{a.note}</p>
          <ol className="divide-y divide-line border-t border-line">
            {a.regulated.items.map((i, idx) => (
              <li key={i.slug}>
                <Link href={`/mekan/${i.slug}/`} className="group grid grid-cols-[1.6rem_minmax(0,1fr)_auto] items-start gap-x-2 py-2.5 hover:bg-sheet">
                  <span className="tnum pt-[3px] text-[11px] font-bold text-ink-3">{String(idx + 1).padStart(2, "0")}</span>
                  <span className="flex min-w-0 flex-col gap-0.5"><span className="text-[15px] font-semibold leading-tight group-hover:text-accent-ink">{i.name}</span><span className="text-[11px] text-ink-3">{i.branch} · {i.place}</span></span>
                  <span className="tnum text-right text-[12px] text-ink-2">{nf(i.count)} deneyim · {nf(i.verified)} doğrulanmış</span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="text-[11.5px] text-ink-3">{a.regulated.note} {a.provenance}</p>
        </div>
      ) : a.items.length === 0 ? (
        <p className="text-[14.5px] text-ink-2">Bu koşullar için yeterli kanıtı olan aday bulunamadı. Konumu genişletmeyi ya da isteği sadeleştirmeyi dene; <Link href="/ara/" className="font-semibold underline decoration-line-2 underline-offset-4">Ara</Link> ile tüm kayıtlara bakabilirsin.</p>
      ) : (
        <>
          {a.note && <p className="text-[12.5px] text-warn">{a.note}</p>}
          <ol className="grid gap-x-8 gap-y-6 md:grid-cols-3">
            {a.items.map((i, idx) => {
              const dir = i.delta > 0.15 ? "up" : i.delta < -0.15 ? "down" : "flat";
              const st = rel[i.entityId]?.state ?? "none";
              return (
                <li key={i.entityId} className={`flex flex-col gap-3 ${idx > 0 ? "border-t border-line pt-5 md:border-t-0 md:border-l md:pl-8 md:pt-0" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="tnum text-[11px] font-bold text-ink-3">{String(idx + 1).padStart(2, "0")}</span>
                      <Link href={`/mekan/${i.slug}/`} className="block text-[19px] font-bold leading-tight tracking-[-0.02em] hover:text-accent-ink">{i.name}</Link>
                      <span className="text-[11px] font-medium text-ink-3">{i.kind} · {i.place}</span>
                    </div>
                    {i.score !== null && <ScoreNumber score={i.score} size="md" label stack trend={{ direction: dir, delta: dir === "flat" ? undefined : i.delta }} />}
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="tnum text-[17px] font-extrabold tracking-[-0.02em] text-accent-ink">%{i.match} uygun</span>
                    <button type="button" onClick={() => setShowParts(showParts === i.entityId ? null : i.entityId)} className="text-[11.5px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">{showParts === i.entityId ? "kapat" : "uyum neden?"}</button>
                    {i.confidence !== "high" && <span className="text-[11px] text-ink-3">· Güven: {i.confidence === "medium" ? "Orta" : "Sınırlı"}</span>}
                  </div>
                  {showParts === i.entityId && (
                    <ul className="flex flex-col gap-0.5 border-l-2 border-line-2 pl-3 text-[11.5px] text-ink-2">
                      {i.matchParts.map((p) => <li key={p.label} className="flex justify-between gap-3"><span>{p.label}{p.note ? <span className="text-ink-3"> · {p.note}</span> : null}</span><span className="tnum shrink-0 font-semibold">{p.value > 0 ? "+" : ""}{p.value}{p.max > 0 ? ` / ${p.max}` : ""}</span></li>)}
                      <li className="pt-1 text-ink-3">{personalized ? "Zevk profilin uyuma dahil." : "Zevk profili yok; uyum yalnızca istek, konum ve kanıttan hesaplandı."} Uyum Gidenler puanı değildir.</li>
                    </ul>
                  )}
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">Neden?</p>
                    <ul className="mt-1 flex flex-col gap-1 text-[13.5px] leading-snug text-ink-2">{i.reasons.map((r) => <li key={r} className="flex gap-2"><span aria-hidden className="text-ink-3">•</span><span>{r}</span></li>)}</ul>
                  </div>
                  {i.cautions.length > 0 && (
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-warn">Dikkat</p>
                      <ul className="mt-1 flex flex-col gap-1 text-[13px] leading-snug text-ink-2">{i.cautions.map((r) => <li key={r} className="flex gap-2"><span aria-hidden className="text-warn">•</span><span>{r}</span></li>)}</ul>
                    </div>
                  )}
                  <p className="text-[11px] leading-snug text-ink-3">{i.hoursNote}. {i.provenance}</p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <Link href={`/mekan/${i.slug}/`} className="inline-flex h-8 items-center rounded-[3px] bg-ink px-3 text-[12.5px] font-semibold text-paper hover:bg-accent">Detaya git</Link>
                    <button type="button" onClick={() => setEntityState(i.entityId, st === "saved" ? "none" : "saved", "ai")} aria-pressed={st === "saved"} className={`inline-flex h-8 items-center border px-3 text-[12.5px] font-semibold ${st === "saved" ? "border-ink bg-ink text-paper" : "border-line-2 hover:border-ink"}`}>{st === "saved" ? "✓ Kaydedildi" : "Kaydet"}</button>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <span className="label mr-1">Ayarla</span>
            {a.followUps.map((f) => (
              <button key={f.key} type="button" aria-pressed={follow === f.key} onClick={() => setFollow(follow === f.key ? null : f.key)}
                className={`h-8 border px-3 text-[12.5px] font-semibold ${follow === f.key ? "border-ink bg-ink text-paper" : "border-line-2 text-ink-2 hover:border-ink"}`}>{f.label}</button>
            ))}
          </div>
          <p className="text-[11.5px] leading-relaxed text-ink-3">{a.provenance} Gidenler AI deneyim grafiği üzerinde çalışan bir karar motorudur; canlı uygunluk, masa durumu ya da çalışma saati doğrulaması üretmez.</p>
        </>
      )}
    </div>
  );
}
