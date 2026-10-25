"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Entity } from "@/lib/types";
import { AVAIL_MARK, availabilityOf, reservationCode, slotOpen, type StoredReservation } from "@/lib/reservation";
import { saveReservation } from "./store";

/* ──────────────────────────────────────────────────────────────────────────
   REZERVASYON — Tabelog'un "boş yer takvimi" (○ △ ×) + tek ekranda talep.
   Kullanıcıdan ücret alınmaz; işletme gerçekleşen rezervasyonda kişi başı öder (bkz. lib/reservation.ts).
   ────────────────────────────────────────────────────────────────────────── */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type V = Pick<Entity, "id" | "slug" | "name" | "isDemo" | "reservation" | "hours">;

export function ReservationWidget({ venue, slots, maxParty }: { venue: V; slots: { lunch: string[]; dinner: string[] }; maxParty: number }) {
  const [days, setDays] = useState<Date[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [party, setParty] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<StoredReservation | null>(null);

  /* tarih yalnızca istemcide: sunucu/istemci saat farkı hidrasyonu bozmasın */
  useEffect(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const list = Array.from({ length: 14 }, (_, i) => new Date(t.getTime() + i * 86_400_000));
    setDays(list);
    const first = list.find((d) => { const a = availabilityOf(venue as Entity, iso(d)); return a === "open" || a === "few"; });
    if (first) setDate(iso(first));
  }, [venue]);

  const avail = useMemo(() => new Map(days.map((d) => [iso(d), availabilityOf(venue as Entity, iso(d))])), [days, venue]);
  const timeOk = (t: string) => !!date && slotOpen(venue as Entity, date, t);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) { setErr("Gün ve saat seç."); return; }
    if (!consent) { setErr("Bilgilerinin işletmeyle paylaşılması için onay gerekiyor."); return; }
    setBusy(true); setErr(null);
    let code = "", status: StoredReservation["status"] = "önizleme";
    try {
      const r = await fetch(`${BASE}/api/rezervasyon/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entitySlug: venue.slug, date, time, party, name, phone, note: note || undefined, consent: true }) });
      if (r.status === 404 || r.status === 405) throw new Error("api_yok");
      const j = await r.json();
      if (!r.ok) {
        setBusy(false);
        setErr(j.error === "slot_unavailable" ? "Bu saat az önce doldu, başka bir saat seç." : j.error === "rate_limited" ? "Çok fazla deneme; biraz sonra tekrar dene." : j.error === "invalid_request" ? "Ad ve telefonu kontrol et (telefon en az 10 hane)." : "Talep gönderilemedi, tekrar dene.");
        return;
      }
      code = j.code; status = j.status;
    } catch {
      /* statik önizleme (API yok): talep iletilmez, yalnızca akış gösterilir */
      code = reservationCode(); status = "önizleme";
    }
    const rec: StoredReservation = { code, entitySlug: venue.slug, entityName: venue.name, date, time, party, status, createdAt: new Date().toISOString() };
    saveReservation(rec);
    setDone(rec); setBusy(false);
  }

  if (done) {
    const d = new Date(done.date + "T12:00:00");
    return (
      <div className="receipt rise flex flex-col gap-3 px-5 pb-6 pt-4">
        <div className="flex items-baseline justify-between text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-3"><span>Gidenler · rezervasyon</span><span className="tnum">{done.code}</span></div>
        <div className="dash" />
        <p className="text-[20px] font-extrabold tracking-[-0.02em]">{done.entityName}</p>
        <p className="tnum text-[15px]">{d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })} · {done.time} · {done.party} kişi</p>
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          {done.status === "önizleme"
            ? "Önizleme: bu bir demo kayıt ya da çevrimdışı sürüm; talep işletmeye iletilmedi."
            : "Talebin işletmeye iletildi. Onay telefonuna gelecek; değişiklik için bu kodu kullan."}
        </p>
        <Link href="/benim/" className="text-[13px] font-semibold underline decoration-line-2 underline-offset-4 hover:text-accent-ink">Rezervasyonlarım →</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex min-w-0 flex-col gap-4 border border-line-strong bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[17px] font-extrabold tracking-[-0.015em]">Masa ayırt</span>
        <span className="text-[11.5px] text-ink-3">Gidenler&apos;den ücretsiz · {venue.isDemo ? "demo müsaitlik" : "işletme onaylar"}</span>
      </div>

      <label className="flex items-center justify-between gap-3 text-[13px]">
        <span className="font-semibold">Kişi</span>
        <select value={party} onChange={(e) => setParty(Number(e.target.value))} className="h-9 rounded-[3px] border border-line-2 bg-paper px-2 tnum">
          {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} kişi</option>)}
        </select>
      </label>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-ink-3"><span className="font-semibold uppercase tracking-[0.12em]">Gün</span><span>○ yer var · △ az yer · × dolu</span></div>
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Rezervasyon günü">
          {days.length === 0 && <span className="h-14 w-full animate-pulse bg-sheet" />}
          {days.map((d) => {
            const k = iso(d), a = avail.get(k) ?? "open", off = a === "full" || a === "closed";
            return (
              <button key={k} type="button" role="radio" aria-checked={date === k} disabled={off} onClick={() => { setDate(k); setTime(null); }}
                aria-label={`${d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}: ${AVAIL_MARK[a].label}`}
                className={`flex w-12 shrink-0 flex-col items-center gap-0.5 rounded-[3px] border py-1.5 text-[11px] transition-colors ${date === k ? "border-ink bg-ink text-paper" : off ? "border-line text-ink-3 opacity-50" : "border-line-2 hover:border-ink"}`}>
                <span>{DAYS[d.getDay()]}</span>
                <span className="tnum text-[15px] font-bold leading-none">{d.getDate()}</span>
                <span className={`text-[12px] leading-none ${date === k ? "" : a === "few" ? "text-[var(--warn,#b7791f)]" : a === "open" ? "text-pos-ink" : ""}`}>{AVAIL_MARK[a].mark}</span>
              </button>
            );
          })}
        </div>
      </div>

      {date && (["lunch", "dinner"] as const).map((m) => slots[m].length > 0 && (
        <div key={m}>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{m === "lunch" ? "Öğle" : "Akşam"}</div>
          <div className="flex flex-wrap gap-1.5">
            {slots[m].map((t) => (
              <button key={t} type="button" disabled={!timeOk(t)} onClick={() => setTime(t)} aria-pressed={time === t}
                className={`tnum h-9 rounded-[3px] border px-3 text-[13px] font-semibold transition-colors ${time === t ? "border-accent bg-accent text-on-accent" : !timeOk(t) ? "border-line text-ink-3 line-through opacity-50" : "border-line-2 hover:border-ink"}`}>{t}</button>
            ))}
          </div>
        </div>
      ))}

      {time && (
        <div className="rise flex flex-col gap-2.5 border-t border-line pt-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad soyad" autoComplete="name" required minLength={2} className="h-10 rounded-[3px] border border-line-2 bg-paper px-3 text-[14px]" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon (05xx xxx xx xx)" autoComplete="tel" inputMode="tel" required className="h-10 rounded-[3px] border border-line-2 bg-paper px-3 text-[14px] tnum" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not (isteğe bağlı): doğum günü, bebek sandalyesi, alerji…" maxLength={300} rows={2} className="resize-none rounded-[3px] border border-line-2 bg-paper px-3 py-2 text-[14px]" />
          <label className="flex items-start gap-2 text-[12px] leading-snug text-ink-2">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span>Adımın ve telefonumun yalnızca bu rezervasyon için {venue.name} ile paylaşılmasını kabul ediyorum. <Link href="/kurallar/#kvkk" className="underline underline-offset-2">Aydınlatma metni</Link></span>
          </label>
          {err && <p className="text-[13px] font-semibold text-neg-ink" role="alert">{err}</p>}
          <button type="submit" disabled={busy} className="h-11 rounded-[3px] bg-accent text-[15px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5 disabled:opacity-50">
            {busy ? "Gönderiliyor…" : `${time} · ${party} kişi — talep gönder`}
          </button>
        </div>
      )}
      {!time && err && <p className="text-[13px] font-semibold text-neg-ink" role="alert">{err}</p>}
    </form>
  );
}
