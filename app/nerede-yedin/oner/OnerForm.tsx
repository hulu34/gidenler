"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { flowCode, track } from "@/lib/kampanya/client";
import { nameKey, saveSuggestionDraft } from "@/lib/oneri/key";
import { Button } from "@/components/ui/Button";

/* MEKÂN ÖNER — kullanıcı aradığı yeri bulamadı. Ad + ilçe (+ isteğe bağlı konum notu). Öneri yayımlanmaz, Google puanı almaz;
   yönetici kuyruğuna girer. Aynı ilçede adı aynı mekân varsa önce "bu mu?" sorulur. Deneyim metni istenirse YALNIZ bu
   cihazda taslak olarak saklanır; sunucuya gönderilmez. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
interface Cand { slug: string; name: string; district: string | null; area: string | null; same: boolean }

export function OnerForm({ districts }: { districts: string[] }) {
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [note, setNote] = useState("");
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Cand[] | null>(null);
  const [done, setDone] = useState<{ merged: boolean } | null>(null);
  const [draft, setDraft] = useState("");
  const [draftSaved, setDraftSaved] = useState<boolean | null>(null);

  useEffect(() => { const q = new URLSearchParams(location.search).get("ad"); if (q) setName(q.slice(0, 80)); }, []);

  async function send(force = false) {
    setBusy(true); setError(null);
    const r = await fetch(`${BASE}/api/mekan-oner/`, { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify({ name, district, locationNote: note || null, force, code: flowCode(), ...(hp ? { website: hp } : {}) }) }).catch(() => null);
    const j = r ? (await r.json().catch(() => null)) as { ok?: boolean; merged?: boolean; error?: string; message?: string; matches?: Cand[] } | null : null;
    setBusy(false);
    if (!r) { setError("Bağlantı sorunu: önerin gönderilemedi. Yeniden dene."); return; }
    if (r.status === 409 && j?.matches) { setMatches(j.matches); return; }
    if (r.status === 201 && j?.ok) { setDone({ merged: !!j.merged }); window.scrollTo({ top: 0 }); return; }
    setError(j?.message ?? "Önerin kaydedilemedi; yeniden dene.");
  }

  if (done) {
    return (
      <div className="mx-auto max-w-[720px] px-5 pb-24 pt-10 sm:px-7 sm:pt-16" data-oneri-alindi>
        <span className="label">Önerin alındı</span>
        <h1 className="mt-3 text-[clamp(1.9rem,6vw,2.8rem)] font-extrabold leading-none tracking-[-0.045em]">Teşekkürler, {name.trim()} kuyrukta.</h1>
        <p className="prose-exp mt-4 max-w-[54ch] text-ink-2">
          {done.merged ? "Bu mekân daha önce de önerilmiş; senin bildirimin de sayıldı. " : ""}
          Bir editör mekânı inceleyecek: açık mı, gerçekten restoran mı, başka bir kayıtla aynı mı. Doğrulanana kadar sitede
          yayımlanmaz ve Google puanı almaz. İnceleme birkaç gün sürebilir; sonuç sana ayrıca bildirilmez.
        </p>
        <section className="mt-8 border-t-2 border-ink pt-5">
          <h2 className="label">Deneyimini şimdiden yaz (isteğe bağlı)</h2>
          <p className="mt-2 max-w-[60ch] text-[13px] text-ink-2">Yazdıkların <strong className="font-semibold">yalnız bu cihazda</strong> taslak olarak saklanır; kimseye gönderilmez. Mekân eklenince bu tarayıcıdan deneyim formunu açtığında taslağın önerilir.</p>
          <textarea value={draft} onChange={(e) => { setDraft(e.target.value); setDraftSaved(null); }} rows={6} aria-label="Deneyim taslağı"
            placeholder="Ne zaman gittin, ne yedin, nasıldı?" className="mt-3 w-full resize-y rounded-[10px] border border-line-2 bg-transparent p-3 font-[family-name:var(--font-read)] text-[17px] leading-[1.5] outline-none focus:border-accent" />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button variant="ghost" disabled={draft.trim().length < 10} onClick={() => setDraftSaved(saveSuggestionDraft({ nameKey: nameKey(name), name: name.trim(), district, body: draft, savedAt: new Date().toISOString() }))}>Bu cihazda sakla</Button>
            {draftSaved === true && <span className="text-[13px] font-semibold text-pos-ink" data-oneri-taslak>Taslak bu cihazda saklandı.</span>}
            {draftSaved === false && <span className="text-[13px] font-semibold text-neg-ink">Tarayıcının yerel kaydı kapalı; taslak saklanamadı.</span>}
          </div>
        </section>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/nerede-yedin/"><Button variant="primary">Başka bir yer ara</Button></Link>
          <Link href="/"><Button variant="ghost">Ana sayfa</Button></Link>
        </div>
      </div>
    );
  }

  const valid = name.trim().length >= 2 && !!district;
  return (
    <div className="mx-auto max-w-[720px] px-5 pb-24 pt-8 sm:px-7 sm:pt-14" data-oneri-form>
      <nav className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-3"><Link href="/nerede-yedin/" className="hover:text-ink">En son nerede yemek yedin?</Link> / <span className="text-accent-ink">Mekân öner</span></nav>
      <h1 className="mt-3 text-[clamp(1.9rem,6vw,2.8rem)] font-extrabold leading-none tracking-[-0.045em]">Aradığın yer Gidenler&apos;de yok mu?</h1>
      <p className="mt-3 max-w-[56ch] text-[14.5px] leading-relaxed text-ink-2">Adını ve semtini bildir; editörler doğrulayıp ekler. Öneriler doğrulanmadan yayımlanmaz ve otomatik puan almaz.</p>

      <form className="mt-8 flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); if (valid && !busy) void send(false); }}>
        <label className="flex flex-col gap-2">
          <span className="label">Mekânın adı</span>
          <input value={name} onChange={(e) => { setName(e.target.value); setMatches(null); }} maxLength={80} required autoComplete="off" data-oneri-ad
            className="h-12 rounded-[10px] border border-line-2 bg-transparent px-3 text-[17px] font-semibold outline-none focus:border-accent" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">İlçe</span>
          <select value={district} onChange={(e) => { setDistrict(e.target.value); setMatches(null); }} required data-oneri-ilce
            className="h-12 rounded-[10px] border border-line-2 bg-transparent px-3 text-[17px] outline-none focus:border-accent">
            <option value="">Seç…</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            <option value="Bilmiyorum">Emin değilim</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Bildiğin konum <span className="font-normal normal-case tracking-normal text-ink-3">· isteğe bağlı</span></span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={160} autoComplete="off" placeholder="Mahalle, cadde ya da yakınındaki bir yer" data-oneri-konum
            className="h-12 rounded-[10px] border border-line-2 bg-transparent px-3 text-[16px] outline-none focus:border-accent" />
        </label>
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={hp} onChange={(e) => setHp(e.target.value)} name="website" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

        {matches && (
          <div role="alert" className="rounded-[12px] border-2 border-ink p-4" data-oneri-eslesme>
            <p className="text-[14px] font-semibold">Bu ilçede aynı adlı bir mekân zaten var. Aradığın bu mu?</p>
            <ul className="mt-3 divide-y divide-line">
              {matches.map((m) => (
                <li key={m.slug} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="text-[14.5px]"><strong>{m.name}</strong> <span className="text-ink-2">· {[m.area, m.district].filter(Boolean).join(", ")}</span></span>
                  <Link href={`/yaz/${m.slug}/`} onClick={() => track("secim")} className="text-[13px] font-bold text-accent-ink">Evet, bunun için yaz →</Link>
                </li>
              ))}
            </ul>
            <button type="button" disabled={busy} onClick={() => void send(true)} data-oneri-farkli className="mt-3 text-[13px] font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">Hayır, farklı bir yer — yine de öner</button>
          </div>
        )}
        {error && <p role="alert" className="text-[13px] font-semibold text-neg-ink">{error}</p>}
        {!matches && <div><Button variant="primary" disabled={!valid || busy}>{busy ? "Gönderiliyor…" : "Öneriyi gönder"}</Button></div>}
        <p className="text-[12px] text-ink-3">Kişisel bilgi, bağlantı ya da telefon numarası yazma. Önerin, girişliysen hesabınla; değilsen kimliksiz kaydedilir.</p>
      </form>
    </div>
  );
}
