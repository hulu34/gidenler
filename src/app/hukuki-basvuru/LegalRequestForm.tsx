"use client";

import { useState } from "react";

const TYPES = ["İçerik kaldırma talebi", "Kişilik hakkı bildirimi", "Mahremiyet / kişisel veri", "Fikri mülkiyet", "Yetkili başvuru (işletme / kişi adına)", "Diğer"];

/**
 * Başvuru formu — dürüst prototip: gönderim kanalı yoktur, "gönderildi" demez.
 * Girilen bilgilerden yapılandırılmış bir başvuru metni hazırlar; kullanıcı kopyalar.
 * Backend geldiğinde yalnızca `submit` gövdesi değişir; alanlar aynı kalır.
 */
export function LegalRequestForm() {
  const [f, setF] = useState({ type: TYPES[0], name: "", contact: "", authority: "", url: "", content: "", reason: "", docs: "", action: "" });
  const [out, setOut] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const ready = f.name.trim() && f.contact.trim() && f.url.trim() && f.reason.trim();

  function prepare(e: React.FormEvent) {
    e.preventDefault();
    const lines = [
      `GİDENLER HUKUKİ BAŞVURU`, `Tür: ${f.type}`, `Ad / kurum: ${f.name}`, `İletişim: ${f.contact}`,
      f.authority ? `Temsil yetkisi: ${f.authority}` : null, `İlgili URL: ${f.url}`,
      f.content ? `İlgili içerik: ${f.content}` : null, `Gerekçe: ${f.reason}`,
      f.docs ? `Destekleyici belge / karar: ${f.docs}` : null, f.action ? `Talep edilen işlem: ${f.action}` : null,
    ].filter(Boolean);
    setOut(lines.join("\n")); setCopied(false);
  }
  async function copy() { try { await navigator.clipboard.writeText(out ?? ""); setCopied(true); } catch { setCopied(false); } }

  const inp = "h-10 w-full border-b-2 border-line-2 bg-transparent text-[14.5px] outline-none focus:border-accent";
  return (
    <form onSubmit={prepare} className="flex flex-col gap-5" aria-label="Hukuki başvuru formu">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.2em]">Gerekli bilgiler</h2>
      <label className="flex flex-col gap-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">Başvuru türü
        <select value={f.type} onChange={set("type")} className={inp + " font-normal normal-case tracking-normal text-ink"}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">Ad / kurum *<input value={f.name} onChange={set("name")} className={inp + " font-normal normal-case tracking-normal text-ink"} autoComplete="off" /></label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">İletişim bilgisi *<input value={f.contact} onChange={set("contact")} className={inp + " font-normal normal-case tracking-normal text-ink"} autoComplete="off" placeholder="e-posta ya da telefon" /></label>
      </div>
      <label className="flex flex-col gap-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">Temsil yetkisi (varsa)<input value={f.authority} onChange={set("authority")} className={inp + " font-normal normal-case tracking-normal text-ink"} placeholder="vekâlet, yetki belgesi, işletme sahipliği…" /></label>
      <label className="flex flex-col gap-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">İlgili Gidenler URL&apos;si *<input value={f.url} onChange={set("url")} className={inp + " font-normal normal-case tracking-normal text-ink"} placeholder="gidenler.com/mekan/…" /></label>
      <label className="flex flex-col gap-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">İlgili içerik<textarea value={f.content} onChange={set("content")} rows={2} className="w-full border-b-2 border-line-2 bg-transparent text-[14.5px] font-normal normal-case tracking-normal text-ink outline-none focus:border-accent" placeholder="hangi deneyim / cümle / bölüm" /></label>
      <label className="flex flex-col gap-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">Talebin gerekçesi *<textarea value={f.reason} onChange={set("reason")} rows={3} className="w-full border-b-2 border-line-2 bg-transparent text-[14.5px] font-normal normal-case tracking-normal text-ink outline-none focus:border-accent" /></label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">Destekleyici belge / karar<input value={f.docs} onChange={set("docs")} className={inp + " font-normal normal-case tracking-normal text-ink"} placeholder="mahkeme kararı, tescil, belge adı" /></label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">Talep edilen işlem<input value={f.action} onChange={set("action")} className={inp + " font-normal normal-case tracking-normal text-ink"} placeholder="kaldırma, düzeltme, erişim kısıtı…" /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button type="submit" disabled={!ready} className="h-10 rounded-[3px] bg-accent px-4 text-[14px] font-semibold text-on-accent disabled:opacity-40">Başvuru metnini hazırla</button>
        <span className="text-[12.5px] text-ink-3">* zorunlu. Prototipte gönderim kanalı yoktur; hazırlanan metni saklayıp yayın sonrası kanaldan iletirsiniz.</span>
      </div>
      {out && (
        <div className="flex flex-col gap-2 border-l-2 border-line pl-4" role="status">
          <span className="label">Hazırlanan başvuru</span>
          <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">{out}</pre>
          <button type="button" onClick={copy} className="w-fit text-[12.5px] font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">{copied ? "Kopyalandı" : "Metni kopyala"}</button>
        </div>
      )}
    </form>
  );
}
