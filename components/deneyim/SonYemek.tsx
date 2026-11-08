"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { captureCampaign, track } from "@/lib/kampanya/client";

/* "İSTANBUL'DA EN SON NEREDE YEMEK YEDİN?" — deneyim paylaşımının giriş kapısı.
   Gerçek restoran dizini (/api/ara, sunucu tarafı arama) → seçim → /yaz/<slug>/ (mevcut deneyim formu ve API'si).
   İkinci bir yorum sistemi ya da mekân veritabanı YOK. Bulunamazsa: Mekân öner (yönetici kuyruğu).
   Ölçüm: yalnız toplu adım sayacı (lib/kampanya); arama metni ve seçilen mekân gönderilmez. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
interface Hit { slug: string; name: string; category: string; district: string | null; area: string | null; address: string | null; closed?: boolean; tier?: string }

export function SonYemekArama({ variant, autoFocus = false }: { variant: "home" | "landing"; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [going, setGoing] = useState<string | null>(null);
  const cache = useRef(new Map<string, Hit[]>());
  const ctl = useRef<AbortController | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const listId = useId();

  /* kaynak: kampanya bağlantısı (?k=) ya da ana sayfa bölümü; bölüm ekrana girince "ziyaret" sayılır */
  useEffect(() => {
    if (variant === "landing") { captureCampaign(location.search, "dogrudan"); track("ziyaret"); return; }
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting) && !seen.current) { seen.current = true; captureCampaign(location.search, "site"); track("ziyaret"); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [variant]);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setHits(null); setLoading(false); return; }
    const key = t.toLocaleLowerCase("tr");
    const c = cache.current.get(key);
    if (c) { setHits(c); setActive(-1); return; }
    setLoading(true);
    const id = setTimeout(async () => {
      ctl.current?.abort();
      const a = new AbortController(); ctl.current = a;
      try {
        const r = await fetch(`${BASE}/api/ara/?q=${encodeURIComponent(t)}&limit=8`, { signal: a.signal });
        const j = (await r.json()) as { items?: Hit[] };
        const items = (j.items ?? []).filter((h) => h.tier !== "adjacent");
        cache.current.set(key, items); setHits(items); setActive(-1);
        track("arama");
        if (!items.length) track("bulunamadi");
      } catch { /* iptal ya da bağlantı: önceki sonuç kalır */ }
      finally { if (!a.signal.aborted) setLoading(false); }
    }, 140);
    return () => clearTimeout(id);
  }, [q]);

  const pick = (h: Hit) => {
    if (going) return;
    setGoing(h.slug);
    track("secim");
    router.push(`/yaz/${h.slug}/`);
  };
  const suggestHref = `/nerede-yedin/oner/${q.trim() ? `?ad=${encodeURIComponent(q.trim().slice(0, 80))}` : ""}`;
  /* aynı adlı birden çok kayıt (şube) → semt/mahalle/adres satırı belirginleşir */
  const dupNames = new Set((hits ?? []).map((h) => h.name.toLocaleLowerCase("tr")).filter((n, i, a) => a.indexOf(n) !== i));
  const open = hits !== null;

  return (
    <div ref={box} className="w-full min-w-0" data-son-yemek={variant}>
      <div role="combobox" aria-expanded={open} aria-owns={listId} aria-haspopup="listbox"
        className="flex h-14 items-center gap-2 rounded-[14px] border-2 border-ink bg-paper pl-4 pr-2 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.55)] focus-within:shadow-[0_0_0_4px_var(--accent-soft)]">
        <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-ink-3"><path fill="none" stroke="currentColor" strokeWidth="2" d="M8.5 3a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM13 13l4.5 4.5" /></svg>
        <label htmlFor={`${listId}-q`} className="sr-only">Restoranın adı</label>
        <input id={`${listId}-q`} value={q} autoFocus={autoFocus} autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" maxLength={80}
          aria-autocomplete="list" aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          data-son-yemek-girdi placeholder="Restoranın adını yaz — ör. Çiya, Kanaat, Hünkar"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (!hits?.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            else if (e.key === "Enter") { e.preventDefault(); pick(hits[Math.max(0, active)]); }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[17px] font-semibold outline-none placeholder:font-normal placeholder:text-ink-3" />
        {loading && <span aria-hidden className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line-2 border-t-ink" />}
        {q && <button type="button" aria-label="Temizle" onClick={() => { setQ(""); setHits(null); }} className="h-9 w-9 shrink-0 rounded-full text-[18px] text-ink-3 hover:text-ink">×</button>}
      </div>

      {open && hits.length > 0 && (
        <p className="mt-2 flex items-center justify-between gap-3 px-1 text-[12.5px] text-ink-2">
          <span>{hits.length} sonuç · gittiğin yeri seç</span>
          <Link href={suggestHref} data-son-yemek-oner-ust className="font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">Listede yok mu? Mekân öner</Link>
        </p>
      )}
      <div aria-live="polite" className="sr-only">{open ? (hits.length ? `${hits.length} restoran bulundu` : "Restoran bulunamadı") : ""}</div>
      {open && (
        <div className="mt-2 overflow-hidden rounded-[14px] border border-line-strong bg-paper" data-son-yemek-sonuc>
          {hits.length > 0 && (
            <ul id={listId} role="listbox" aria-label="Eşleşen restoranlar" className="divide-y divide-line">
              {hits.map((h, i) => {
                const where = [h.area, h.district].filter(Boolean).join(", ");
                const dup = dupNames.has(h.name.toLocaleLowerCase("tr"));
                return (
                  <li key={h.slug} id={`${listId}-${i}`} role="option" aria-selected={active === i}>
                    <button type="button" onClick={() => pick(h)} onMouseEnter={() => setActive(i)} data-son-yemek-sec={h.slug}
                      className={`flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left ${active === i ? "bg-accent-soft" : "hover:bg-accent-soft"}`}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15.5px] font-bold">{h.name}</span>
                        <span className="block truncate text-[12.5px] text-ink-2">
                          {h.category}{where ? ` · ${where}` : ""}
                          {dup && h.address ? <span className="text-ink-3"> · {h.address}</span> : null}
                          {h.closed ? <span className="ml-1 font-semibold text-neg-ink">· kalıcı olarak kapandı</span> : null}
                        </span>
                      </span>
                      <span className="shrink-0 text-[12.5px] font-bold text-accent-ink">{going === h.slug ? "Açılıyor…" : "Deneyim yaz →"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 text-[13px] ${hits.length ? "border-t border-line bg-sunk" : ""}`} data-son-yemek-yok={hits.length ? undefined : ""}>
            <span className="text-ink-2">{hits.length ? "Aradığın yer listede yok mu?" : <>“{q.trim()}” Gidenler&apos;de bulunamadı. Yazımı kontrol et ya da bize bildir.</>}</span>
            <Link href={suggestHref} data-son-yemek-oner className="inline-flex h-9 items-center rounded-[8px] border border-ink px-3 font-semibold hover:bg-ink hover:text-paper">Mekân öner</Link>
          </div>
        </div>
      )}
    </div>
  );
}

const STEPS_UI: Array<[string, string]> = [
  ["Bul", "Gittiğin restoranı adıyla ara."],
  ["Değerlendir", "Genel puanını ver, ne yaşadığını birkaç cümleyle anlat."],
  ["Paylaş", "Deneyimin adınla yayımlanır; bir sonraki gidecek kişi doğru yeri seçer."],
];

/** Ana sayfa bölümü. */
export function SonYemekBolum() {
  return (
    <section id="nerede-yedin" aria-labelledby="nerede-yedin-baslik" className="scroll-mt-24 border-y-2 border-ink py-8 sm:py-10" data-ana-son-yemek>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">
            <i aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />Deneyimini paylaş
          </p>
          <h2 id="nerede-yedin-baslik" className="mt-2 text-[clamp(1.9rem,4.4vw,3.1rem)] font-extrabold leading-[0.98] tracking-[-0.05em]">
            İstanbul&apos;da <span className="font-[family-name:var(--font-brand)] font-normal italic tracking-[-0.02em] text-accent-ink">en son</span> nerede yemek yedin?
          </h2>
          <p className="mt-3 max-w-[46ch] font-[family-name:var(--font-read)] text-[clamp(1.02rem,1.7vw,1.2rem)] leading-[1.42] text-ink-2">
            Gittiğin yeri bul. Deneyimini paylaş. Başkalarının doğru mekânı seçmesine yardımcı ol.
          </p>
          <ol className="mt-5 hidden gap-4 sm:grid sm:grid-cols-3" aria-label="Nasıl çalışır">
            {STEPS_UI.map(([t, d], i) => (
              <li key={t} className="border-t border-line-strong pt-2">
                <span className="tnum text-[11px] font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <span className="block text-[14.5px] font-bold">{t}</span>
                <span className="block text-[12.5px] leading-snug text-ink-2">{d}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="min-w-0 lg:pt-7">
          <SonYemekArama variant="home" />
          <p className="mt-3 text-[12px] leading-snug text-ink-3">
            Yeni gitmen gerekmiyor; son 24 ay içinde gittiğin her yer için yazabilirsin. Gidenler puanı yalnız gerçek deneyimlerden oluşur, Google puanından ayrıdır.
          </p>
        </div>
      </div>
    </section>
  );
}
