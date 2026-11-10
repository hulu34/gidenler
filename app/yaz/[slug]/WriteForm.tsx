"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PhotoPicker, PhotoResults, usePhotoPicks } from "@/components/write/PhotoPicker";
import { markVisited, setEntityState, useUserData } from "@/lib/store";
import { useAccountStatus } from "@/lib/community/accountState";
import { signInWithGoogle } from "@/lib/community/signin";
import { authErrorMessage } from "@/lib/community/authErrors";
import { deleteDraft, loadDraft, saveDraft, visitMonths } from "@/lib/drafts";
import { captureCampaign, flowCode, track } from "@/lib/kampanya/client";
import { decodeHandoff, encodeHandoff } from "@/lib/inapp";
import { InAppNotice, useInApp } from "@/components/deneyim/InAppNotice";
import { dropSuggestionDraft, takeSuggestionDraft, type SuggestionDraft } from "@/lib/oneri/key";
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
 * YAYINLAMA: gerçek mekânda, Google ile giriş yapmış kullanıcı Neon'a yayınlar (/api/reviews); mekân başına tek
 * deneyim — varsa form onu düzenleme kipinde açar. Girişsizken ve bağlantı koptuğunda metin bu cihazda TASLAK
 * olarak korunur (lib/drafts.ts). Ziyaret doğrulaması yok: hiçbir ekran "doğrulandı" demez.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
type Sent = "saved" | "unsaved" | "published" | "pending" | "updated" | "deleted";
interface Mine { id: string; body: string; visitedOn: string; overall: number; ratings: Record<string, number>; returnIntent: string | null; disclosure: string; status: string }
export function WriteForm({
  entityName, entitySlug, entityId, categoryLabel, district, dimensions, returnQuestion, regulated, isReal = false,
}: {
  isReal?: boolean;
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
  const [overall, setOverall] = useState<number | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);
  /* aynı mekâna başka bir ziyaret: mevcut deneyim düzenlenmez, ayrı deneyim açılır (farklı ay zorunlu) */
  const [prevVisits, setPrevVisits] = useState<Mine[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const photos = usePhotoPicks();
  const [savedId, setSavedId] = useState<string | null>(null);
  const account = useAccountStatus();
  const canPublish = isReal && account === "in";
  const [restored, setRestored] = useState<string | null>(null);
  /* Ay listesi tarayıcıda, bugünün tarihinden kurulur (sayfa önceden derlendiği için sunucuda kurulursa eskir). */
  const [months, setMonths] = useState<Array<[string, string]>>([]);
  /* yazarken otomatik taslak (yalnız bu cihaz) — girişe giderken ya da sayfa kapanırsa kaybolmasın */
  const [autoSaved, setAutoSaved] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [sugDraft, setSugDraft] = useState<SuggestionDraft | null>(null);
  const [showDims, setShowDims] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const inApp = useInApp();

  useEffect(() => {
    const ms = visitMonths();
    setMonths(ms);
    /* uygulama içi tarayıcıdan "tarayıcıda aç" ile gelindiyse: taslak ve kampanya kodu # parçasında (sunucuya gitmez).
       Yerel taslağa yazılır, # adres çubuğundan hemen silinir. */
    const h = decodeHandoff(location.hash);
    if (h) {
      if (h.k) captureCampaign(`?k=${h.k}`, "dogrudan");
      const rels = RELATIONSHIPS.map((x) => x.key) as string[];
      if (h.b || h.o) saveDraft(entitySlug, {
        body: h.b ?? "", month: h.m ?? ms[0][0], ratings: h.r ?? {}, overall: h.o ?? null,
        returnIntent: (["evet", "hayır", "emin değil"].includes(h.ri ?? "") ? h.ri : null) as ReturnIntent | null,
        relationship: (rels.includes(h.rel ?? "") ? h.rel : "none") as CommercialRelationship,
      });
      history.replaceState(null, "", location.pathname + location.search);
    }
    const d = loadDraft(entitySlug);
    if (d) {
      setBody(d.body); setRatings(d.ratings ?? {}); setRet(d.returnIntent ?? null); setRel(d.relationship ?? "none"); setOverall(d.overall ?? null);
      setMonth(ms.some(([k]) => k === d.month) ? d.month : ms[0][0]);
      setRestored(d.savedAt);
      if (d.ratings && Object.keys(d.ratings).length) setShowDims(true);
    } else {
      setMonth(ms[0][0]);
      /* bu mekânı daha önce "Mekân öner" ile bildirip taslak yazdıysa: önerilir, kendiliğinden doldurulmaz */
      setSugDraft(takeSuggestionDraft(entityName, district));
    }
    const c = flowCode(); setCode(c); track("form", c);
  }, [entitySlug, entityName, district]);

  useEffect(() => {
    if (!touched || mine || sent) return;
    const id = setTimeout(() => {
      if (!body.trim() && overall === null) return;
      if (saveDraft(entitySlug, { body, month, ratings, returnIntent: ret, relationship: rel, overall })) setAutoSaved(new Date().toISOString());
    }, 700);
    return () => clearTimeout(id);
  }, [touched, mine, sent, body, month, ratings, ret, rel, overall, entitySlug]);

  /* uygulama içi tarayıcıda (girişsiz): taslak adres çubuğundaki # parçasında da tutulur — Instagram'ın "tarayıcıda aç"
     menüsü ve "Bağlantıyı kopyala" aynı adresi açar; yeni tarayıcıda form kaldığı yerden devam eder. */
  const handoff = inApp && isReal && account === "anon" && (body.trim() || overall !== null)
    ? encodeHandoff({ b: body, m: month, o: overall, r: ratings, ri: ret, rel, k: code }) : "";
  useEffect(() => {
    if (!inApp || !isReal || account !== "anon") return;
    const id = setTimeout(() => history.replaceState(null, "", location.pathname + location.search + handoff), 400);
    return () => clearTimeout(id);
  }, [inApp, isReal, account, handoff]);

  /* Google girişi hata ile döndüyse (ör. süre aşımı): açıklama + taslağın korunduğu bilgisi; yeniden deneme düğmesi aynı. */
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("giris") !== "hata") return;
    setError(`${authErrorMessage(q.get("error"))} Yazdıkların bu cihazda taslak olarak korundu.`);
    q.delete("giris"); q.delete("error");
    history.replaceState(null, "", location.pathname + (q.toString() ? `?${q}` : "") + location.hash);
  }, []);

  /* Girişliyse: bu mekân için kendi deneyimi var mı? Varsa düzenleme kipinde aç (sunucudaki sürüm geçerli). */
  useEffect(() => {
    if (!canPublish) return;
    let alive = true;
    fetch(`${BASE}/api/me/reviews/?slug=${encodeURIComponent(entitySlug)}`, { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null)).then((j: { reviews?: Mine[] } | null) => {
        const r = j?.reviews?.[0];
        if (!alive || !r) return;
        setPrevVisits(j?.reviews ?? []);
        setMine(r); setBody(r.body); setRatings(r.ratings ?? {}); setOverall(r.overall > 0 ? r.overall : null);
        setRet((r.returnIntent as ReturnIntent) ?? null); setRel((r.disclosure as CommercialRelationship) ?? "none");
        const m = r.visitedOn.slice(0, 7); setMonths((ms) => (ms.some(([k]) => k === m) ? ms : [...ms, [m, m]])); setMonth(m); setRestored(null);
      }).catch(() => null);
    return () => { alive = false; };
  }, [canPublish, entitySlug]);

  const payload = () => ({ body, visitMonth: month, overall: regulated ? null : overall, ratings: regulated ? {} : ratings, returnIntent: ret, disclosure: rel });
  const edit = <T,>(set: (v: T) => void) => (v: T) => { set(v); setTouched(true); };
  const keepDraft = () => saveDraft(entitySlug, { body, month, ratings, returnIntent: ret, relationship: rel, overall });

  async function publish() {
    setBusy(true); setError(null);
    track("gonderim", code);
    const url = mine ? `${BASE}/api/reviews/${mine.id}/` : `${BASE}/api/reviews/`;
    const r = await fetch(url, { method: mine ? "PATCH" : "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
      body: JSON.stringify(mine ? payload() : { slug: entitySlug, ...payload(), ...(code ? { kaynak: code } : {}) }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) as { status?: string; message?: string; error?: string; id?: string } | null : null;
    setBusy(false);
    if (!r || !r.ok) track("hata", code);
    if (!r) { keepDraft(); void fetch(`${BASE}/api/ops/event/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: "review:send_failed" }) }).catch(() => {}); setError("Bağlantı sorunu: deneyimin gönderilemedi. Yazdıkların bu cihazda taslak olarak saklandı; yeniden dene."); return; }
    if (r.ok) {
      deleteDraft(entitySlug);
      if (entityId) setEntityState(entityId, "visited", "write");
      setSent(mine ? "updated" : j?.status === "pending" ? "pending" : "published"); window.scrollTo({ top: 0 });
      /* deneyim önce kaydedilir; fotoğraf hatası deneyimi geri almaz, sonuç ekranda tek tek yazılır */
      const rid = mine?.id ?? j?.id;
      if (rid && photos.picks.length) { setSavedId(rid); void photos.uploadAll(rid); }
      return;
    }
    if (r.status === 401) { keepDraft(); setError("Oturumun kapanmış. Yazdıkların taslak olarak saklandı; yeniden giriş yapıp yayınla."); return; }
    if (r.status === 409 && j?.error === "exists") { setError(j.message ?? "Bu ay için bu mekâna zaten bir deneyimin var."); if (!prevVisits.length) location.reload(); return; }
    if (r.status >= 500) { keepDraft(); void fetch(`${BASE}/api/ops/event/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: "review:send_failed" }) }).catch(() => {}); }
    setError(j?.message ?? "Gönderilemedi; yeniden dene.");
  }

  async function remove() {
    if (!mine) return;
    setBusy(true); setError(null);
    const r = await fetch(`${BASE}/api/reviews/${mine.id}/`, { method: "DELETE", credentials: "same-origin" }).catch(() => null);
    setBusy(false);
    if (r?.ok) { deleteDraft(entitySlug); setSent("deleted"); window.scrollTo({ top: 0 }); return; }
    const j = r ? await r.json().catch(() => null) as { message?: string } | null : null;
    setError(j?.message ?? "Silinemedi (bağlantı sorunu); yeniden dene.");
  }

  const rated = Object.keys(ratings).length;
  const canSend = body.trim().length >= 40 && ret !== null && (regulated || overall !== null) && !busy && (!photos.picks.length || photos.rights);
  const userData = useUserData();
  const quick = entityId ? userData.reactions.find((r) => r.entityId === entityId) : undefined;
  const steps: Array<[string, boolean]> = [
    ["Ne yaşadın", body.trim().length >= 40],
    ...(regulated ? [] : [["Genel puan", overall !== null] as [string, boolean]]),
    ["Ne zaman", !!month],
    ["Tekrar", ret !== null],
  ];
  const doneCount = steps.filter((x) => x[1]).length;

  if (sent) {
    const live = sent === "published" || sent === "updated";
    const TITLE: Record<Sent, [string, string, string]> = {
      published: ["Deneyimin yayınlandı", "Teşekkürler; bir sonraki gidecek kişinin kararını kolaylaştırdın.", `${entityName} sayfasında "Gidenler deneyimleri" bölümünde görünüyor. Adın "Ad S." biçiminde gösterilir; ziyaretin doğrulanmamış olarak işaretlidir. Profilinden istediğin zaman düzenleyip silebilirsin.`],
      updated: ["Değişiklikler kaydedildi", "Deneyimin güncellendi.", `${entityName} sayfasındaki deneyimin yenilendi. Önceki sürüm yalnız moderasyon kaydında tutulur.`],
      pending: ["Deneyimin incelemede", "Kısa bir kontrolden sonra yayına girecek.", "Benzer bir metin başka bir mekân için de yazıldığından deneyimin moderasyon incelemesine alındı. Profilinden durumunu görebilirsin."],
      deleted: ["Deneyimin silindi", "Artık kimse göremez.", "Deneyimin sayfadan ve profilinden kaldırıldı. İstersen 24 saat sonra bu mekân için yeniden yazabilirsin."],
      saved: ["Taslağın bu cihazda saklandı", "Yayınlamak için hesap gerekiyor.", `${entityName} için yazdıkların yalnız bu tarayıcıda taslak olarak duruyor; kimse göremez ve Gidenler puanına girmez.`],
      unsaved: ["Taslak saklanamadı", "Tarayıcının yerel kaydı kapalı.", "Yazdıkların saklanamadı (ör. gizli pencere). Metni kopyalayıp başka bir yerde tutabilirsin."],
    };
    const [label, head, text] = TITLE[sent];
    return (
      <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
        <div className="flex flex-col items-start gap-5 pt-16 sm:pt-24">
          <span className="label">{label}</span>
          <h1 className="max-w-[18ch] text-[clamp(2rem,6vw,3rem)] font-extrabold leading-none tracking-[-0.045em]">{head}</h1>
          <p className="prose-exp max-w-[52ch] text-ink-2">{text}</p>
          {savedId && <PhotoResults ctl={photos} reviewId={savedId} />}
          <div className="flex flex-wrap gap-3">
            <Link href={live ? `/mekan/${entitySlug}/#deneyimler` : `/mekan/${entitySlug}/`}>
              <Button variant="primary">{live ? "Deneyimimi sayfada gör" : "Sayfaya dön"}</Button>
            </Link>
            <Link href="/benim/"><Button variant="ghost">Katkılarım</Button></Link>
            {live && <Link href="/nerede-yedin/"><Button variant="ghost">Başka bir yer yaz</Button></Link>}
          </div>
          <p className="mt-6 border-t border-line pt-3 text-[12px] text-ink-3">
            Her deneyim &ldquo;doğrulanmamış ziyaret&rdquo; olarak görünür; ziyaret doğrulama ayrı bir adımdır ve henüz açık değil.
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
          {canPublish ? (mine
            ? <>Bu mekân için {mine.visitedOn.slice(0, 7)} ziyaretine ait deneyimin {mine.status === "pending" ? "incelemede" : mine.status === "hidden" ? "moderasyonla gizlendi" : "yayında"}. Aynı ziyareti burada düzeltebilirsin.{" "}
              <button type="button" data-yeni-ziyaret className="font-semibold text-accent-ink underline decoration-line-2 underline-offset-4 hover:text-ink" onClick={() => {
                setMine(null); setBody(""); setRatings({}); setOverall(null); setRet(null); setRel("none"); setError(null);
                const used = new Set(prevVisits.map((v) => v.visitedOn.slice(0, 7))); const ms = visitMonths(); setMonths(ms); setMonth((ms.find(([k]) => !used.has(k)) ?? ms[0])[0]);
              }}>Başka bir ziyareti ayrı deneyim olarak yaz</button>{" "}
              Gidenler puanında her kişinin yalnız en son ziyareti sayılır.</>
            : prevVisits.length
            ? <>Yeni ziyaretin ayrı bir deneyim olarak yayınlanır. Daha önce yazdığın ziyaretlerden ({prevVisits.map((v) => v.visitedOn.slice(0, 7)).join(", ")}) farklı bir ay seç; puanda yalnız en son ziyaretin sayılır.</>
            : <>Deneyimin Gidenler hesabınla yayınlanır; adın &ldquo;Ad S.&rdquo; biçiminde görünür. Ziyaretin <strong className="font-semibold">doğrulanmamış</strong> olarak işaretlenir.</>)
            : isReal && account === "anon" && inApp
              ? <>Yazmaya başlayabilirsin. Yayınlamak için sayfayı tarayıcında açıp Google ile giriş yapacaksın; yazdıkların <strong className="font-semibold">bağlantıyla birlikte taşınır</strong>.</>
            : isReal && account === "anon"
              ? <>Yayınlamak için Google ile giriş yap. Yazdıkların o sırada <strong className="font-semibold">bu cihazda taslak</strong> olarak korunur.</>
              : <>Yazdıkların <strong className="font-semibold">yalnız bu cihazda taslak</strong> olarak saklanır; kimse göremez, puana girmez.</>}
        </p>
        {isReal && account === "anon" && inApp && (
          <div id="tarayicida-ac" className="scroll-mt-24"><InAppNotice app={inApp} context="form" hash={handoff || (code ? encodeHandoff({ k: code }) : "")} /></div>
        )}
        {restored && (
          <p className="flex flex-wrap items-center gap-x-3 text-[12.5px] text-ink-3">
            <span data-taslak-yuklendi>{canPublish && !mine ? "Giriş yapıldı; yazdıkların yüklendi. Kontrol edip yayınla." : "Kaydettiğin taslak yüklendi."}</span>
            <button type="button" className="underline decoration-line-2 underline-offset-4 hover:text-ink" onClick={() => {
              deleteDraft(entitySlug); setRestored(null); setBody(""); setRatings({}); setRet(null); setRel("none");
            }}>Taslağı sil</button>
          </p>
        )}
        {sugDraft && !restored && !mine && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-accent pl-3 text-[13px] text-ink-2" data-oneri-taslagi>
            <span>Bu mekânı önerirken bu cihazda bir taslak yazmıştın.</span>
            <button type="button" className="font-semibold text-accent-ink underline decoration-line-2 underline-offset-4" onClick={() => { setBody(sugDraft.body); setTouched(true); dropSuggestionDraft(sugDraft); setSugDraft(null); }}>Taslağı yükle</button>
            <button type="button" className="underline decoration-line-2 underline-offset-4" onClick={() => { dropSuggestionDraft(sugDraft); setSugDraft(null); }}>Sil</button>
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

      {isReal && !mine && <p className="mt-4 max-w-[60ch] text-[14px] leading-snug text-ink-2">Bu mekânın puanı yalnız gidenlerin yazdıklarından oluşur. Birkaç cümle bile bir sonraki gidecek kişinin kararına yardım eder.</p>}

      {/* ── A. METİN — ekranın merkezi ── */}
      <section className="mt-8 border-t-2 border-line-strong pt-6">
        <textarea
          value={body}
          onChange={(e) => edit(setBody)(e.target.value)}
          rows={7}
          data-deneyim-metin
          placeholder="Ne zaman gittin, ne sipariş ettin, ne oldu? Yıldız değil, olay anlat. Bir sonraki gidecek kişiye ne söylerdin?"
          aria-label="Deneyim metni"
          className="w-full resize-y border-b-2 border-line-2 bg-transparent pb-3 font-[family-name:var(--font-read)] text-[clamp(1.0625rem,2.4vw,1.375rem)] leading-[1.55] outline-none placeholder:text-ink-3 focus:border-accent"
        />
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-3" aria-label="Yardımcı sorular">
          {["Ne sipariş ettin?", "Ne zaman gittin?", "En iyi neydi?", "Ne kötüydü?", "Tekrar gider misin?"].map((q) => (
            <li key={q}><button type="button" onClick={() => { setTouched(true); setBody((b) => (b.trim() ? `${b.trimEnd()}\n\n` : "") + q + " "); }} className="underline decoration-line-2 underline-offset-4 hover:text-ink hover:decoration-ink">{q}</button></li>
          ))}
        </ul>
        <p className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-[12px] text-ink-3">
          <span className="max-w-[54ch]">
            &quot;Harikaydı!!!&quot; değil, olay anlat. Kişisel veri, hakaret ve doğrulanamayan iddia
            moderasyondan geçmez.
          </span>
          <span className={`tnum ${body.trim().length >= 40 ? "text-pos-ink" : ""}`}>
            {body.trim().length < 40 ? `${body.trim().length}/40 karakter` : `${body.trim().length} karakter`}
            {autoSaved && !mine && <span className="ml-2 text-ink-3" data-otomatik-taslak>· taslak bu cihazda kaydedildi</span>}
          </span>
        </p>
      </section>

      {/* ── B. NE ZAMAN GİTTİN ── */}
      <section className="mt-10">
        <h2 className="label mb-3">Ne zaman gittin?</h2>
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={month}
            onChange={(e) => edit(setMonth)(e.target.value)}
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

      {/* ── B2. GENEL PUAN — zorunlu (düzenlenmiş kategoride yok); 1–10, Gidenler ölçeği ── */}
      {!regulated && (
        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 className="label">Genel puanın</h2>
            <span className="text-[12px] text-ink-3">Zorunlu · 1 (çok kötü) – 10 (olağanüstü)</span>
          </div>
          <div role="radiogroup" aria-label="Genel puan" className="mt-3 grid max-w-[520px] grid-cols-10 gap-1 sm:gap-1.5" data-genel-puan>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={overall === v} aria-label={`Genel puan: ${v}`} onClick={() => edit(setOverall)(v)}
                className={`tnum h-11 w-full min-w-0 border text-[15px] font-bold ${overall === v ? "border-accent bg-accent text-on-accent" : overall && v < overall ? "border-line-2 bg-accent-soft text-ink-2" : "border-line-2 text-ink-3 hover:border-ink hover:text-ink"}`}>
                {v}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex max-w-[520px] justify-between text-[11px] text-ink-3"><span>1 · çok kötü</span><span>{overall ? `Seçimin: ${overall}/10` : "Gidenler puanı 10 üzerinden"}</span><span>10 · olağanüstü</span></div>
        </section>
      )}

      {/* ── C. BOYUT PUANLARI — şemadan gelir ── */}
      {!regulated && (
        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 className="label">Neye kaç verirsin?</h2>
            <span className="text-[12px] text-ink-3">
              İsteğe bağlı · <span className="tnum">{rated}</span>/{dimensions.length} verildi
            </span>
          </div>
          {!showDims && (
            <button type="button" onClick={() => setShowDims(true)} aria-expanded={false} data-ayrinti-ac
              className="mt-3 inline-flex h-10 items-center rounded-[8px] border border-line-2 px-3 text-[13.5px] font-semibold hover:border-ink">
              Ayrıntılı puan ver ({dimensions.map((d) => d.label.toLocaleLowerCase("tr")).slice(0, 3).join(", ")}…) +
            </button>
          )}
          {showDims && <ul className="mt-4 flex flex-col gap-5">
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
                      onClick={() => { setTouched(true); setRatings((r) => ({ ...r, [d.key]: v })); }}
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
          </ul>}
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
              onClick={() => edit(setRet)(v)}
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
                onClick={() => edit(setRel)(r.key)}
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

      {canPublish && <PhotoPicker ctl={photos} entityName={entityName} reviewId={mine?.id} />}
      {isReal && account === "anon" && photos.enabled && <p id="fotograf" className="mt-10 border-t border-line pt-4 text-[13px] text-ink-2">Fotoğrafı giriş yaptıktan sonra ekleyebilirsin; yazdıkların korunur.</p>}

      {/* ── gönder ── */}
      <div className="sticky bottom-0 mt-12 flex flex-col gap-2 border-t-2 border-line-strong bg-paper/95 py-4 backdrop-blur-sm">
        {error && <p role="alert" className="text-[13px] font-semibold text-neg-ink">{error}</p>}
        {photos.picks.length > 0 && !photos.rights && <p className="text-[12.5px] text-ink-2">Yayınlamadan önce fotoğraflar için hak beyanını seç ya da fotoğrafları kaldır.</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {canPublish ? (
            <Button variant="primary" disabled={!canSend} onClick={publish}>{busy ? "Gönderiliyor…" : mine ? "Değişiklikleri kaydet" : "Deneyimi yayınla"}</Button>
          ) : isReal && account === "anon" && inApp ? (
            <button type="button" data-uygulama-ici-alt onClick={() => document.getElementById("tarayicida-ac")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="inline-flex min-h-11 items-center rounded-[10px] bg-ink px-4 text-[14px] font-bold text-paper">Yayınlamak için tarayıcıda aç ↑</button>
          ) : isReal && account === "anon" ? (
            <Button variant="primary" disabled={!canSend} onClick={async () => {
              const ok = keepDraft();
              if (!ok) { setError("Tarayıcının yerel kaydı kapalı; giriş dönüşünde taslak korunamaz. Metni kopyala, sonra giriş yap."); return; }
              setBusy(true); track("giris", code);
              if (!(await signInWithGoogle(`/yaz/${entitySlug}/`))) { setBusy(false); setError("Giriş başlatılamadı; taslağın bu cihazda saklandı."); }
            }}>{busy ? "Yönlendiriliyor…" : "Google ile giriş yap ve yayınla"}</Button>
          ) : (
            <Button variant="primary" disabled={!canSend} onClick={() => {
              const ok = keepDraft();
              if (ok && entityId) markVisited(entityId);
              setSent(ok ? "saved" : "unsaved");
              window.scrollTo({ top: 0 });
            }}>Taslak olarak sakla</Button>
          )}
          <p className="text-[12px] text-ink-3">
            {!canSend && !busy
              ? `En az bir paragraf yaz${regulated ? "" : ", genel puanı seç"} ve tekrar gitme sorusunu yanıtla.`
              : canPublish ? "Yayınladıktan sonra profilinden düzenleyip silebilirsin." : isReal && account === "anon" ? "Girişten sonra bu sayfaya dönersin; taslağın seni bekler." : "Taslak yalnız bu tarayıcıda durur."}
          </p>
        </div>
        {mine && (
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            {!confirmDelete ? (
              <button type="button" onClick={() => setConfirmDelete(true)} className="font-semibold text-neg-ink underline decoration-line-2 underline-offset-4">Deneyimi sil</button>
            ) : (
              <>
                <span className="text-ink-2">Deneyimin sayfadan kaldırılsın mı?</span>
                <button type="button" disabled={busy} onClick={remove} className="h-9 rounded-[3px] bg-neg px-3 font-semibold text-paper">Evet, sil</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="h-9 rounded-[3px] border border-line-2 px-3 font-semibold">Vazgeç</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
