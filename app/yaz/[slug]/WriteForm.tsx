"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { markVisited, useUserData } from "@/lib/store";
import { deleteDraft, loadDraft, saveDraft, visitMonths } from "@/lib/drafts";
import { Button } from "@/components/ui/Button";
import type { CommercialRelationship, RatingDimensionDef, ReturnIntent } from "@/lib/types";

const RELATIONSHIPS: Array<{ key: CommercialRelationship; label: string; hint?: string }> = [
  { key: "none", label: "Kendi ödediğim normal ziyaret" },
  { key: "invited", label: "İşletmenin daveti", hint: "Hesabı işletme karşıladı" },
  { key: "gifted", label: "Ürün veya hizmet sağlandı" },
  { key: "sponsored", label: "Sponsorlu iş birliği", hint: "Bu içerik için ödeme aldım" },
  { key: "owner_related", label: "İşletmeyle bağım var" },
];

/**
 * DENEYİM YAZMA — arz tarafı burada oluşur.
 * Tasarım kuralı: METİN merkezde, puanlar yardımcı yapısal veri,
 * doğrulama güven, şeffaflık dürüstlük. 25 soruluk form DEĞİL.
 * DÜRÜSTLÜK: yayınlama ve ziyaret doğrulama açılana kadar form yalnız bu cihazda TASLAK saklar;
 * hiçbir ekran "yayınlandı" ya da "doğrulandı" demez (bkz. lib/drafts.ts).
 */
export function WriteForm({
  entityName, entitySlug, entityId, categoryLabel, district, dimensions, returnQuestion, regulated,
}: {
  entityName: string;
  entityId?: string;
  entitySlug: string;
  categoryLabel: string;
  district?: string;
  dimensions: RatingDimensionDef[];
  returnQuestion: string;
  regulated: boolean;
}) {
  const [body, setBody] = useState("");
  const [month, setMonth] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [ret, setRet] = useState<ReturnIntent | null>(null);
  const [rel, setRel] = useState<CommercialRelationship>("none");
  const [sent, setSent] = useState<"saved" | "unsaved" | null>(null);
  const [restored, setRestored] = useState<string | null>(null);
  /* Ay listesi tarayıcıda, bugünün tarihinden kurulur (sayfa önceden derlendiği için sunucuda kurulursa eskir). */
  const [months, setMonths] = useState<Array<[string, string]>>([]);

  useEffect(() => {
    const ms = visitMonths();
    setMonths(ms);
    const d = loadDraft(entitySlug);
    if (d) {
      setBody(d.body); setRatings(d.ratings ?? {}); setRet(d.returnIntent ?? null); setRel(d.relationship ?? "none");
      setMonth(ms.some(([k]) => k === d.month) ? d.month : ms[0][0]);
      setRestored(d.savedAt);
    } else setMonth(ms[0][0]);
  }, [entitySlug]);

  const rated = Object.keys(ratings).length;
  const canSend = body.trim().length >= 40 && ret !== null;
  const userData = useUserData();
  const quick = entityId ? userData.reactions.find((r) => r.entityId === entityId) : undefined;
  const steps: Array<[string, boolean]> = [
    ["Ne yaşadın", body.trim().length >= 40],
    ["Boyutlar", rated >= Math.min(3, dimensions.length)],
    ["Ne zaman", !!month],
    ["Tekrar", ret !== null],
    ["Şeffaflık", true],
  ];
  const doneCount = steps.filter((x) => x[1]).length;

  if (sent) {
    return (
      <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
        <div className="flex flex-col items-start gap-5 pt-16 sm:pt-24">
          <span className="label">{sent === "saved" ? "Taslağın bu cihazda saklandı" : "Taslak saklanamadı"}</span>
          <h1 className="max-w-[18ch] text-[clamp(2rem,6vw,3rem)] font-extrabold leading-none tracking-[-0.045em]">
            Deneyim yayınlama çok yakında açılıyor.
          </h1>
          <p className="prose-exp max-w-[52ch] text-ink-2">
            {sent === "saved"
              ? `${entityName} için yazdıkların yalnız bu tarayıcıda taslak olarak duruyor; henüz kimse göremez ve Gidenler puanına girmez. Yayınlama açıldığında Google ile giriş yapıp bu taslağı tek dokunuşla yayımlayabileceksin.`
              : "Tarayıcın yerel kaydı kapalı görünüyor (ör. gizli pencere); yazdıkların saklanamadı. Metni kopyalayıp başka bir yerde tutabilirsin."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={`/mekan/${entitySlug}/`}>
              <Button variant="primary">Sayfaya dön</Button>
            </Link>
            <Link href="/benim/"><Button variant="ghost">Benim Gidenler&apos;im</Button></Link>
          </div>
          <p className="mt-6 border-t border-line pt-3 text-[12px] text-ink-3">
            Yayınlanan her deneyim &ldquo;doğrulanmamış ziyaret&rdquo; olarak başlar; ziyaret doğrulama ayrı bir adımdır ve henüz açık değil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-28 sm:px-7">
      <header className="flex flex-col gap-3 pt-8 sm:pt-12">
        <nav className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-3">
          <Link href={`/mekan/${entitySlug}/`} className="hover:text-ink">{entityName}</Link>
          <span aria-hidden>/</span>
          <span className="text-accent-ink">Deneyim yaz</span>
        </nav>
        <h1 className="max-w-[15ch] text-[clamp(1.9rem,6vw,3rem)] font-extrabold leading-[1] tracking-[-0.045em]">
          Ne yaşadın?
        </h1>
        <p className="text-[13px] text-ink-2">
          {entityName} · {categoryLabel}{district ? ` · ${district}` : ""}
        </p>
        <p role="note" className="max-w-[62ch] border-l-2 border-accent pl-3 text-[13px] leading-relaxed text-ink-2">
          Deneyim yayınlama çok yakında açılıyor. Şimdilik yazdıkların <strong className="font-semibold">yalnız bu cihazda taslak</strong> olarak
          saklanır; kimse göremez, puana girmez.
        </p>
        {restored && (
          <p className="flex flex-wrap items-center gap-x-3 text-[12.5px] text-ink-3">
            <span>Kaydettiğin taslak yüklendi.</span>
            <button type="button" className="underline decoration-line-2 underline-offset-4 hover:text-ink" onClick={() => {
              deleteDraft(entitySlug); setRestored(null); setBody(""); setRatings({}); setRet(null); setRel("none");
            }}>Taslağı sil</button>
          </p>
        )}
      </header>

      {/* ── ilerleme — mobilde yön duygusu ── */}
      <ol className="mt-6 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-[11px] font-semibold uppercase tracking-[0.12em]" aria-label="Adımlar">
        {steps.map(([label, ok], i) => (
          <li key={label} className={ok ? "text-pos-ink" : "text-ink-3"}>{ok ? "✓" : `${i + 1}.`} {label}</li>
        ))}
        <li className="ml-auto tnum text-ink-3">{doneCount}/{steps.length}</li>
      </ol>
      {quick && (
        <p className="mt-3 border-l-2 border-accent pl-3 text-[13px] text-ink-2">
          Hızlı tepkin: <span className="font-semibold">{quick.mood}</span>{quick.returnIntent === "evet" ? ", tekrar giderim" : quick.returnIntent === "hayır" ? ", tekrar gitmem" : ""}{quick.note ? ` — “${quick.note}”` : ""}. Şimdi olayı anlat; tepki deneyime dönüşsün.
        </p>
      )}

      {/* ── A. METİN — ekranın merkezi ── */}
      <section className="mt-8 border-t-2 border-line-strong pt-6">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={9}
          placeholder="Ne zaman gittin, ne sipariş ettin, ne oldu? Yıldız değil, olay anlat. Bir sonraki gidecek kişiye ne söylerdin?"
          aria-label="Deneyim metni"
          className="w-full resize-y border-b-2 border-line-2 bg-transparent pb-3 font-[family-name:var(--font-read)] text-[clamp(1.0625rem,2.4vw,1.375rem)] leading-[1.55] outline-none placeholder:text-ink-3 focus:border-accent"
        />
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-3" aria-label="Yardımcı sorular">
          {["Ne sipariş ettin?", "Ne zaman gittin?", "En iyi neydi?", "Ne kötüydü?", "Tekrar gider misin?"].map((q) => (
            <li key={q}><button type="button" onClick={() => setBody((b) => (b.trim() ? `${b.trimEnd()}\n\n` : "") + q + " ")} className="underline decoration-line-2 underline-offset-4 hover:text-ink hover:decoration-ink">{q}</button></li>
          ))}
        </ul>
        <p className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-[12px] text-ink-3">
          <span className="max-w-[54ch]">
            &quot;Harikaydı!!!&quot; değil, olay anlat. Kişisel veri, hakaret ve doğrulanamayan iddia
            moderasyondan geçmez.
          </span>
          <span className={`tnum ${body.trim().length >= 40 ? "text-pos-ink" : ""}`}>
            {body.trim().length} karakter
          </span>
        </p>
      </section>

      {/* ── B. NE ZAMAN GİTTİN ── */}
      <section className="mt-10">
        <h2 className="label mb-3">Ne zaman gittin?</h2>
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Ziyaret ayı"
            className="h-10 border-b-2 border-line-2 bg-transparent px-1 text-[17px] font-semibold outline-none focus:border-accent"
          >
            {months.length === 0 && <option value="">…</option>}
            {months.map(([k, l]) => (<option key={k} value={k}>{l}</option>))}
          </select>
          <p className="max-w-[46ch] text-[12px] text-ink-3">
            Ziyaret tarihi yazma tarihinden farklıdır ve Gidenler&apos;in trend sisteminin
            temelidir. Üç yıl önceki deneyim bugünküyle aynı ağırlıkta sayılmaz.
          </p>
        </div>
      </section>

      {/* ── C. BOYUT PUANLARI — şemadan gelir ── */}
      {!regulated && (
        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 className="label">Neye kaç verirsin?</h2>
            <span className="text-[12px] text-ink-3">
              İsteğe bağlı · <span className="tnum">{rated}</span>/{dimensions.length} verildi
            </span>
          </div>
          <ul className="mt-4 flex flex-col gap-5">
            {dimensions.map((d) => (
              <li key={d.key} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-[15px] font-semibold">
                    {d.label}
                    {d.hint && <span className="ml-2 text-[12px] font-normal text-ink-3">{d.hint}</span>}
                  </span>
                  <span className="tnum text-[19px] font-extrabold tracking-tight">
                    {ratings[d.key] ? ratings[d.key].toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRatings((r) => ({ ...r, [d.key]: v }))}
                      aria-label={`${d.label}: ${v}`}
                      aria-pressed={ratings[d.key] === v}
                      className={`tnum h-9 w-9 border text-[13px] font-semibold transition-colors ${
                        ratings[d.key] === v
                          ? "border-accent bg-accent text-on-accent"
                          : ratings[d.key] && v < ratings[d.key]
                            ? "border-line-2 bg-accent-soft text-ink-2"
                            : "border-line-2 text-ink-3 hover:border-ink hover:text-ink"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── D. TEKRAR GİDER MİSİN ── */}
      <section className="mt-10">
        <h2 className="label mb-3">{returnQuestion}</h2>
        <div className="flex flex-wrap gap-2">
          {(["evet", "hayır", "emin değil"] as ReturnIntent[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setRet(v)}
              aria-pressed={ret === v}
              className={`h-10 border px-4 text-[14px] font-semibold capitalize ${
                ret === v ? "border-accent bg-accent text-on-accent" : "border-line-2 hover:border-ink"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </section>

      {/* ── E. ZİYARET DOĞRULAMA — henüz açık değil; kullanıcı seçimi "doğrulandı" SAYILMAZ ── */}
      <section className="mt-10">
        <h2 className="label">Ziyaret doğrulama</h2>
        <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-ink-2">
          Henüz açık değil. Doğrulama; Gidenler rezervasyonu, işletmenin &ldquo;geldi&rdquo; işareti ya da fiş gibi
          bağımsız kanıtlarla yapılacak. O zamana kadar bütün deneyimler <strong className="font-semibold">doğrulanmamış ziyaret</strong> olarak görünür.
        </p>
      </section>

      {/* ── F. TİCARİ ŞEFFAFLIK ── */}
      <section className="mt-10">
        <h2 className="label mb-1">Bu ziyaretin ticari bağlamı</h2>
        <p className="mb-3 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-2">
          Davetli gitmek yazmana engel değil — saklamak sorun. Beyan edilen deneyimler
          yayımlanır ve etiketlenir; puan hesabında daha düşük ağırlık alır.
        </p>
        <ul className="flex flex-col gap-2">
          {RELATIONSHIPS.map((r) => (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => setRel(r.key)}
                aria-pressed={rel === r.key}
                className={`flex w-full items-baseline gap-3 border-b py-2.5 text-left ${
                  rel === r.key ? "border-accent" : "border-line hover:border-line-2"
                }`}
              >
                <span
                  className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${
                    rel === r.key ? "border-accent bg-accent" : "border-line-2"
                  }`}
                  aria-hidden
                />
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className={`text-[15px] ${rel === r.key ? "font-semibold" : ""}`}>{r.label}</span>
                  {r.hint && <span className="text-[12px] text-ink-3">{r.hint}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* ── gönder ── */}
      <div className="sticky bottom-0 mt-12 flex flex-wrap items-center gap-4 border-t-2 border-line-strong bg-paper/95 py-4 backdrop-blur-sm">
        <Button variant="primary" disabled={!canSend} onClick={() => {
          const ok = saveDraft(entitySlug, { body, month, ratings, returnIntent: ret, relationship: rel });
          if (ok && entityId) markVisited(entityId);
          setSent(ok ? "saved" : "unsaved");
          window.scrollTo({ top: 0 });
        }}>
          Taslak olarak sakla
        </Button>
        <p className="text-[12px] text-ink-3">
          {canSend
            ? "Taslak yalnız bu tarayıcıda durur; yayınlama açılınca buradan yayımlayabileceksin."
            : "En az bir paragraf yaz ve tekrar gitme sorusunu yanıtla."}
        </p>
      </div>
    </div>
  );
}
