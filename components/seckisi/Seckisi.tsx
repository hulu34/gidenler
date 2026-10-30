import Link from "next/link";
import { realVenueRecords } from "@/data/real";
import { KIND_LABEL, SECTION_LABEL, labelOf, fmtDay, fmtStamp, hrefOf, type Article, type Block, type Event, type Lang, type SectionKey } from "@/lib/seckisi";
import { UI, t } from "./ui";
import { SeckiVideos } from "./SeckiVideos";

/* ──────────────────────────────────────────────────────────────────────────
   GİDENLER SEÇKİSİ — dergi görünümü. Sunucu bileşenleri; istemciye JS gitmez.
   Kapak fotoğrafı yalnız hakkı kayıtlı görselle; yoksa tipografik kapak (sahte fotoğraf yok).
   ────────────────────────────────────────────────────────────────────────── */

const venueOf = (slug: string) => realVenueRecords.find((r) => r.slug === slug);
const venueLine = (a: Article) => a.venues.map((v) => venueOf(v.slug)).filter(Boolean).map((r) => `${r!.name} · ${r!.district}`);

const COVER_TONE: Record<Article["kind"], string> = {
  hikaye: "bg-ink text-paper",
  mutfak: "bg-accent text-on-accent",
  kesif: "bg-paper text-ink border border-edit-line",
  semt: "bg-sheet text-ink border border-edit-line",
  puan: "bg-paper text-ink border border-edit-line",
};

export function LangSwitch({ lang, slug }: { lang: Lang; slug?: string }) {
  const other: Lang = lang === "tr" ? "en" : "tr";
  return (
    <Link href={hrefOf(other, slug)} hrefLang={other} lang={other} aria-label={t(UI.otherLangLabel, lang)}
      className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap border border-line-strong px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] hover:bg-ink hover:text-paper">
      <span aria-hidden className="text-ink-3">{lang.toUpperCase()} /</span>{t(UI.otherLang, lang)}
    </Link>
  );
}

export function ReviewBanner({ lang }: { lang: Lang }) {
  return (
    <div role="note" className="border-b border-warn/40 bg-warn-soft px-5 py-2 text-center text-[12px] font-semibold text-warn sm:px-7">
      {t(UI.reviewBanner, lang)}
    </div>
  );
}

/** Tipografik kapak ya da hakkı kayıtlı fotoğraf. */
export function Cover({ a, lang, size = "md" }: { a: Article; lang: Lang; size?: "lg" | "md" | "sm" }) {
  const h = size === "lg" ? "min-h-[200px] sm:min-h-[460px]" : size === "md" ? "min-h-[220px] sm:min-h-[300px]" : "min-h-[150px]";
  if (a.cover.state === "var") {
    return (
      <figure className={`relative overflow-hidden ${h}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={a.cover.src} alt={a.cover.alt[lang]} className="absolute inset-0 h-full w-full object-cover" />
      </figure>
    );
  }
  const v = venueOf(a.venues[0].slug);
  const name = a.kind === "semt" ? (a.area?.[lang] ?? "") : (v?.name ?? "");
  return (
    <div aria-hidden className={`relative flex flex-col justify-between overflow-hidden p-5 sm:p-7 ${h} ${COVER_TONE[a.kind]}`}>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.22em] opacity-80">{labelOf(a, lang)}</span>
      <span className={`font-[family-name:var(--font-brand)] leading-[0.92] tracking-[-0.02em] ${size === "lg" ? "text-[clamp(3rem,9vw,6.5rem)]" : size === "md" ? "text-[clamp(2.25rem,5vw,3.5rem)]" : "text-[2rem]"}`}>
        {name}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">
        {a.kind === "semt" ? a.venues.length + (lang === "tr" ? " adres" : " addresses") : v?.district}
      </span>
    </div>
  );
}

function Meta({ a, lang }: { a: Article; lang: Lang }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3">
      <span>{labelOf(a, lang)}</span>
      {a.status === "kontrol" && <span className="border border-warn/50 bg-warn-soft px-1.5 py-px text-[9.5px] text-warn">{t(UI.reviewBadge, lang)}</span>}
      {a.commercial.state === "var" && !a.ownership && <span className="border border-line-strong px-1.5 py-px text-[9.5px] text-ink">{a.commercial.label[lang]}</span>}
    </p>
  );
}

/** Sahiplik/kurucu ilişkisi: karttan yazıya geçmeden görünür. */
const RIGHTS_LABEL: Record<"izinli-basin" | "isletme-izni", Record<Lang, string>> = {
  "isletme-izni": { tr: "işletme izniyle", en: "used with the restaurant's permission" },
  "izinli-basin": { tr: "basın görseli, izinle", en: "press image, with permission" },
};

/** Yazı içi fotoğraflar: kapakla aynı hak kuralları, her karede künye. */
function Gallery({ a, lang }: { a: Article; lang: Lang }) {
  if (!a.gallery?.length) return null;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {a.gallery.map((g) => (
        <figure key={g.src} data-photo={g.src} className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={g.src} alt={g.alt[lang]} loading="lazy" decoding="async" className="aspect-[3/4] w-full object-cover" />
          <figcaption className="text-[13px] leading-snug text-ink-2">
            {g.caption[lang]}
            <span className="mt-0.5 block text-[11.5px] text-ink-3">
              {t(UI.photo, lang)}: {g.credit} · {g.rights === "lisans" ? g.rightsRef : RIGHTS_LABEL[g.rights][lang]} ·{" "}
              <a href={g.sourceUrl} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2">{t(UI.photoSource, lang)}</a>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

const PRESS_TYPE: Record<string, Record<Lang, string>> = {
  haber: { tr: "Haber", en: "News" }, kose: { tr: "Köşe yazısı", en: "Column" }, liste: { tr: "Liste", en: "List" },
  blog: { tr: "Blog", en: "Blog" }, rehber: { tr: "Rehber yazısı", en: "Guide" }, "ticari-blog": { tr: "Şirket blogu", en: "Company blog" },
  roportaj: { tr: "Röportaj", en: "Interview" },
};
const VIDEO_TYPE: Record<string, Record<Lang, string>> = {
  roportaj: { tr: "Kurucularla röportaj", en: "Interview with the founders" }, ziyaret: { tr: "Ziyaret videosu", en: "Visit video" }, "cok-mekanli": { tr: "Birkaç mekânlı tur", en: "Multi-venue tour" },
};

/** "Hakkında yayımlananlar": basın/rehber kartları ve videolar. */
function Media({ a, lang }: { a: Article; lang: Lang }) {
  if (!a.media || (!a.media.press.length && !a.media.videos.length)) return null;
  const name = venueOf(a.venues[0].slug)?.name ?? "";
  return (
    <section aria-labelledby="h-medya" className="flex flex-col gap-5 border-t-2 border-line-strong pt-4">
      <h2 id="h-medya" className="text-[11px] font-bold uppercase tracking-[0.18em]">{lang === "tr" ? "Başkalarının gözünden" : "Through other eyes"}</h2>
      <p className="text-[12px] text-ink-3">{lang === "tr" ? "Bağlantılar özgün yayınlara gider; özetler bizimdir, metin ve fotoğraflar kopyalanmadı. Videolar içerik sahiplerine aittir. Bu yayınlar Gidenler puanına, sıralamaya ve deneyim sayısına girmez." : "Links go to the original publications; the summaries are ours and no text or photos were copied. Videos belong to their creators. None of this counts toward the Gidenler score, rankings or experience count."}</p>
      {a.media.press.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 id="h-basin" className="font-[family-name:var(--font-brand)] text-[30px] leading-none">{lang === "tr" ? `Basında ${name}` : `${name} in the press`}</h3>
          <ul className="grid gap-px border border-edit-line bg-edit-line sm:grid-cols-2">
            {a.media.press.map((p) => (
              <li key={p.url} data-press={p.url} className="flex flex-col gap-1.5 bg-paper p-4 sm:p-5">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">{PRESS_TYPE[p.type][lang]} · <time dateTime={p.date}>{fmtDay(p.date, lang)}</time></p>
                <p className="text-[16px] font-extrabold leading-snug">{p.outlet}{p.author ? <span className="font-semibold text-ink-3"> · {p.author}</span> : null}</p>
                <a href={p.url} rel="noopener noreferrer" target="_blank" className="font-[family-name:var(--font-read)] text-[16px] leading-snug underline decoration-line-2 underline-offset-2 hover:decoration-ink" translate="no">{p.title} ↗</a>
                <p className="text-[13px] leading-snug text-ink-2">{p.note[lang]}</p>
                <p className="mt-auto pt-1 text-[11.5px] leading-snug text-ink-3">{p.disclosure[lang]}{p.access === "kismi" ? (lang === "tr" ? " · Tam metin abonelikle; özet yalnız açık giriş bölümüne dayanıyor." : " · Full text is behind a paywall; the summary relies only on the open introduction.") : ""}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {a.media.videos.length > 0 && (
        <h3 id="h-video" className="font-[family-name:var(--font-brand)] text-[30px] leading-none">{lang === "tr" ? `Videolarda ${name}` : `${name} on video`}</h3>
      )}
      {a.media.videos.length > 0 && (
        <SeckiVideos lang={lang} videos={a.media.videos.map((v) => ({
          youtubeId: v.youtubeId, channel: v.channel, handle: v.handle, title: v.title, start: v.start,
          date: fmtDay(v.date, lang), label: VIDEO_TYPE[v.type][lang], disclosure: v.disclosure[lang], note: v.note[lang],
        }))} />
      )}
    </section>
  );
}

function SectionHead({ k, n, lang }: { k: SectionKey; n: number; lang: Lang }) {
  /* Ana hikâyeden sonra gelen diğer hikâyeler "Restoran Hikâyeleri" başlığıyla. */
  const label = k === "hikaye" ? (lang === "tr" ? "Restoran Hikâyeleri" : "Restaurant Stories") : SECTION_LABEL[k][lang];
  return (
    <div className="kunye mb-6 border-t-2">
      <h2 id={`bolum-${k}`} className="!text-[11px]">{label}</h2>
      <span className="tnum font-[family-name:var(--font-brand)] text-[22px] leading-none text-ink-3">{String(n).padStart(2, "0")}</span>
    </div>
  );
}

/** Ana hikâye (ilk ekran). */
function Lead({ a, lang }: { a: Article; lang: Lang }) {
  return (
    <article className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-10">
      {/* Mobilde önce başlık ve özet, sonra kapak: ana hikâye ilk ekranda okunur. */}
      <Link href={hrefOf(lang, a.slug)} tabIndex={-1} className="order-2 block md:order-1"><Cover a={a} lang={lang} size="lg" /></Link>
      <div className="order-1 flex flex-col justify-end gap-4 md:order-2">
        <Meta a={a} lang={lang} />
        <h3 className="text-[clamp(2rem,4.6vw,3.25rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">
          <Link href={hrefOf(lang, a.slug)} className="hover:underline hover:decoration-2 hover:underline-offset-4">{a.title[lang]}</Link>
        </h3>
        <p className="font-[family-name:var(--font-read)] text-[19px] leading-[1.45] text-ink-2">{a.dek[lang]}</p>
        <p className="border-l-2 border-accent pl-3 text-[14px] leading-relaxed text-ink-2">
          <span className="mr-1 font-bold text-ink">{t(UI.why, lang)}.</span>{a.why[lang]}
        </p>
        <p className="text-[12px] font-semibold text-ink-3">{venueLine(a).join(" · ")}</p>
        <Link href={hrefOf(lang, a.slug)} className="self-start border-b-2 border-accent pb-0.5 text-[13px] font-bold uppercase tracking-[0.12em]">{t(UI.read, lang)} →</Link>
      </div>
    </article>
  );
}

function Card({ a, lang, wide = false }: { a: Article; lang: Lang; wide?: boolean }) {
  return (
    <article className={wide ? "grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-10" : "flex flex-col gap-4"}>
      <Link href={hrefOf(lang, a.slug)} tabIndex={-1} className="block"><Cover a={a} lang={lang} size={wide ? "md" : "sm"} /></Link>
      <div className="flex flex-col gap-3">
        <Meta a={a} lang={lang} />
        <h3 className={`${wide ? "text-[clamp(1.6rem,3.4vw,2.4rem)]" : "text-[22px]"} font-extrabold leading-[1.04] tracking-[-0.03em]`}>
          <Link href={hrefOf(lang, a.slug)} className="hover:underline hover:decoration-2 hover:underline-offset-4">{a.title[lang]}</Link>
        </h3>
        <p className="font-[family-name:var(--font-read)] text-[16.5px] leading-[1.45] text-ink-2">{a.dek[lang]}</p>
        {a.kind === "semt" ? (
          <ul className="mt-1 flex flex-col divide-y divide-edit-line border-y border-edit-line">
            {a.venues.map((v) => (
              <li key={v.slug} className="flex items-baseline justify-between gap-4 py-2 text-[14px]">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">{v.role?.[lang]}</span>
                <span className="font-semibold">{venueOf(v.slug)?.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] font-semibold text-ink-3">{venueLine(a).join(" · ")}</p>
        )}
      </div>
    </article>
  );
}

export function EventCard({ e, lang }: { e: Event; lang: Lang }) {
  const v = venueOf(e.venueSlug);
  return (
    <article className="flex flex-col gap-3 border border-edit-line bg-paper p-5">
      {e.status === "ertelendi" && (
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-warn">
          {t(UI.events.postponed, lang)} · {t(UI.events.was, lang)} {e.previousStartsAt ? fmtStamp(e.previousStartsAt, lang) : ""}
        </p>
      )}
      <h3 className="text-[20px] font-extrabold leading-tight tracking-[-0.02em]">{e.title[lang]}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
        <dt className="text-ink-3">{t(UI.events.when, lang)}</dt><dd className="tnum">{fmtStamp(e.startsAt, lang)}</dd>
        <dt className="text-ink-3">{t(UI.events.where, lang)}</dt>
        <dd><Link href={`/mekan/${e.venueSlug}/`} className="font-semibold underline decoration-line-2 underline-offset-2">{v?.name ?? e.venueSlug}</Link>{e.branch ? ` · ${e.branch[lang]}` : ""}</dd>
        {e.language && (<><dt className="text-ink-3">{t(UI.events.language, lang)}</dt><dd>{e.language[lang]}</dd></>)}
        <dt className="text-ink-3">{t(UI.events.price, lang)}</dt>
        <dd className="tnum">{e.price ? `${new Intl.NumberFormat("tr-TR").format(e.price.amountTry)} ₺ · ${e.price.covers[lang]}` : t(UI.events.free, lang)}</dd>
      </dl>
      {e.note && <p className="text-[13px] text-ink-2">{e.note[lang]}</p>}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-bold">
        <a href={e.bookingUrl} rel="noopener noreferrer" target="_blank" className="border-b-2 border-accent">{t(UI.events.book, lang)} ↗</a>
        <a href={e.announcementUrl} rel="noopener noreferrer" target="_blank" className="text-ink-3 underline underline-offset-2">{t(UI.events.announcement, lang)} · {e.organizer}</a>
      </div>
      <p className="text-[11.5px] text-ink-3">{t(UI.events.external, lang)}</p>
    </article>
  );
}

export function SeckiHome({ lang, list, groups, review }: {
  lang: Lang; review: boolean;
  list: Article[];
  groups: Array<{ key: SectionKey; articles: Article[]; events: Event[] }>;
}) {
  const lead = groups.find((g) => g.key === "hikaye")?.articles[0] ?? null;
  /* "Bu sayıda": sayfadaki bölüm sırasıyla. */
  const index = groups.flatMap((g) => g.articles).filter((a) => a !== lead);
  return (
    <div lang={lang}>
      {review && <ReviewBanner lang={lang} />}
      <section className="border-b border-edit-line bg-edit-ground">
        <div className="mx-auto max-w-[1180px] px-5 pb-10 pt-6 sm:px-7 sm:pb-14 sm:pt-10">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-3">{lang === "tr" ? "İstanbul · Seçki" : "Istanbul · The Edit"}</p>
            <LangSwitch lang={lang} />
          </div>
          <h1 className="mt-4 font-[family-name:var(--font-brand)] sm:mt-6 text-[clamp(3.1rem,10vw,7.5rem)] leading-[0.86] tracking-[-0.03em]">
            {t(UI.brand, lang)}
          </h1>
          <p className="mt-4 text-[clamp(1.35rem,3vw,2rem)] font-extrabold leading-tight tracking-[-0.03em]">{t(UI.tagline, lang)}</p>
          <p className="mt-3 max-w-[52ch] font-[family-name:var(--font-read)] text-[18px] leading-[1.45] text-ink-2">{t(UI.intro, lang)}</p>

          {lead && <div className="mt-8 border-t-2 sm:mt-10 border-line-strong pt-6"><p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em]">{SECTION_LABEL.hikaye[lang]}</p><Lead a={lead} lang={lang} /></div>}

          {index.length > 0 && (
            <nav aria-label={t(UI.inThisEdition, lang)} className="mt-10 border-t border-edit-line pt-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-3">{t(UI.inThisEdition, lang)}</p>
              <ol className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
                {index.map((a, i) => (
                  <li key={a.slug} className="flex gap-3">
                    <span className="tnum font-[family-name:var(--font-brand)] text-[20px] leading-none text-ink-3">{i + 2}</span>
                    <Link href={hrefOf(lang, a.slug)} className="text-[14px] font-semibold leading-snug hover:underline">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-ink-3">{labelOf(a, lang)}</span>
                      {a.title[lang]}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>
      </section>

      <div className="mx-auto flex max-w-[1180px] flex-col gap-16 px-5 pb-10 pt-14 sm:px-7">
        {groups.filter((g) => g.key !== "hikaye" || g.articles.length > 1).map((g, i) => (
          <section key={g.key} aria-labelledby={`bolum-${g.key}`}>
            <SectionHead k={g.key} n={i + 1} lang={lang} />
            {g.key === "deneyimler" ? (
              <div className="grid gap-6 md:grid-cols-2">{g.events.map((e) => <EventCard key={e.id} e={e} lang={lang} />)}</div>
            ) : g.key === "kesif" ? (
              <div className="grid gap-10 md:grid-cols-3 md:gap-7">{g.articles.map((a) => <Card key={a.slug} a={a} lang={lang} />)}</div>
            ) : (
              <div className="flex flex-col gap-12">{(g.key === "hikaye" ? g.articles.slice(1) : g.articles).map((a) => <Card key={a.slug} a={a} lang={lang} wide />)}</div>
            )}
          </section>
        ))}

        <aside className="grid gap-6 border-t-2 border-line-strong pt-6 text-[13px] leading-relaxed text-ink-2 md:grid-cols-2">
          <p>{lang === "tr"
            ? "Seçki, Gidenler puanından ayrıdır: bir yazıya girmek puanı etkilemez, puan da yazı seçiminin gerekçesi olarak sunulmaz. Ticari işbirliği varsa yazıda görünür etiketle belirtilir."
            : "The Edit is separate from the Gidenler score: being featured does not affect a score, and scores are not presented as the reason for an editorial pick. Any commercial partnership is clearly labelled on the piece."}</p>
          <p>{t(UI.langMethod, lang)}</p>
        </aside>
      </div>
    </div>
  );
}

function Body({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-5 font-[family-name:var(--font-read)] text-[19px] leading-[1.6] text-ink">
      {blocks.map((b, i) => "h" in b ? (
        <h2 key={i} className="mt-4 font-[family-name:var(--font-ui)] text-[22px] font-extrabold leading-tight tracking-[-0.02em]">{b.h}</h2>
      ) : "p" in b ? (
        <p key={i}>{b.p}</p>
      ) : (
        <ol key={i} className="flex flex-col divide-y divide-edit-line border-y border-edit-line text-[17px]">
          {b.list.map((x, j) => (
            <li key={j} className="flex gap-4 py-2.5"><span className="tnum w-6 shrink-0 font-[family-name:var(--font-brand)] text-[20px] leading-none text-ink-3">{j + 1}</span><span>{x}</span></li>
          ))}
        </ol>
      ))}
    </div>
  );
}

export function SeckiArticle({ a, lang, review, more }: { a: Article; lang: Lang; review: boolean; more: Article[] }) {
  return (
    <div lang={lang}>
      {review && a.status === "kontrol" && <ReviewBanner lang={lang} />}
      <article className="mx-auto max-w-[1180px] px-5 pb-10 pt-8 sm:px-7 sm:pt-12">
        <div className="flex items-center justify-between gap-4">
          <nav aria-label="breadcrumb" className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">
            <Link href={hrefOf(lang)} className="hover:text-ink">{t(UI.brand, lang)}</Link>
            <span aria-hidden> / </span>{a.kind === "hikaye" && !a.featured ? (lang === "tr" ? "Restoran Hikâyeleri" : "Restaurant Stories") : SECTION_LABEL[a.kind][lang]}
          </nav>
          <LangSwitch lang={lang} slug={a.slug} />
        </div>

        {a.status === "arsiv" && <p role="note" className="mt-6 border border-line-2 bg-sheet px-4 py-3 text-[13px]">{t(UI.archived, lang)}</p>}

        <header className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-end md:gap-10">
          <div className="flex flex-col gap-4">
            <Meta a={a} lang={lang} />
            <h1 className="text-[clamp(2.2rem,5.6vw,4rem)] font-extrabold leading-[0.96] tracking-[-0.045em]">{a.title[lang]}</h1>
            <p className="font-[family-name:var(--font-read)] text-[clamp(1.15rem,2.2vw,1.4rem)] leading-[1.42] text-ink-2">{a.dek[lang]}</p>
            <p className="text-[12.5px] text-ink-3">
              {a.editorial.desk[lang]} · {a.publishedAt
                ? <>{t(UI.published, lang)} <time dateTime={a.publishedAt}>{fmtDay(a.publishedAt, lang)}</time>{a.updatedAt && <> · {t(UI.updated, lang)} <time dateTime={a.updatedAt}>{fmtDay(a.updatedAt, lang)}</time></>}</>
                : <>{t(UI.notPublished, lang)} · {t(UI.prepared, lang)} <time dateTime={a.preparedAt}>{fmtDay(a.preparedAt, lang)}</time></>}
            </p>
            {a.newOpening
              ? <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent-ink">{t(UI.newOpening, lang)}</p>
              : a.kind === "kesif" && <p className="text-[12px] font-semibold text-ink-3">{t(UI.newFind, lang)}</p>}
          </div>
          <figure>
            <Cover a={a} lang={lang} size="md" />
            <figcaption className="mt-2 text-[11.5px] leading-snug text-ink-3">
              {a.cover.state === "var" ? (
                <><span className="font-bold">{t(UI.photo, lang)}:</span> {a.cover.credit} ·{" "}
                  {a.cover.rights === "lisans"
                    ? <a href={a.cover.licenseUrl ?? a.cover.sourceUrl} rel="noopener noreferrer license" target="_blank" className="underline underline-offset-2">{a.cover.rightsRef}</a>
                    : RIGHTS_LABEL[a.cover.rights][lang]} ·{" "}
                  <a href={a.cover.sourceUrl} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2">{t(UI.photoSource, lang)}</a>{a.cover.note ? ` · ${a.cover.note[lang]}` : ""}</>
              ) : <><span className="font-bold">{t(UI.coverCredit, lang)}:</span> {a.cover.gap[lang]}</>}
            </figcaption>
          </figure>
        </header>

        <div className="mt-12 grid gap-12 md:grid-cols-[minmax(0,1fr)_320px] md:gap-14">
          <div className="flex min-w-0 flex-col gap-8">
            {a.notice && <p role="note" className="border-2 border-line-strong bg-paper px-4 py-3 text-[14px] font-semibold leading-relaxed">{a.notice[lang]}</p>}
            <section aria-label={t(UI.why, lang)} className="bg-edit-ground px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]">{t(UI.why, lang)}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{a.why[lang]}</p>
            </section>
            <Body blocks={a.body[lang]} />
            <Gallery a={a} lang={lang} />
            <Media a={a} lang={lang} />
            <section aria-labelledby="h-bilin" className="border-t-2 border-line-strong pt-4">
              <h2 id="h-bilin" className="text-[11px] font-bold uppercase tracking-[0.18em]">{t(UI.know, lang)}</h2>
              <ul className="mt-3 flex flex-col gap-2.5 text-[15px] leading-relaxed">
                {a.know[lang].map((k, i) => <li key={i} className="flex gap-3"><span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 bg-accent" />{k}</li>)}
              </ul>
            </section>
          </div>

          <aside className="flex flex-col gap-8">
            <section aria-labelledby="h-gidenlerde" className="border-2 border-line-strong p-4">
              <h2 id="h-gidenlerde" className="text-[11px] font-bold uppercase tracking-[0.18em]">{t(UI.onGidenler, lang)}</h2>
              <ul className="mt-3 flex flex-col gap-4">
                {a.venues.map((v) => {
                  const r = venueOf(v.slug);
                  return (
                    <li key={v.slug} className="flex flex-col gap-1.5">
                      {v.role && <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">{v.role[lang]}</span>}
                      <Link href={`/mekan/${v.slug}/`} className="text-[17px] font-extrabold leading-tight hover:underline">{r?.name ?? v.slug}</Link>
                      <span className="text-[12px] text-ink-3">{r?.district}</span>
                      <span className="flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] font-semibold">
                        <Link href={`/mekan/${v.slug}/`} className="underline decoration-line-2 underline-offset-2 hover:decoration-ink">{t(UI.profile, lang)}</Link>
                        <Link href={`/mekan/${v.slug}/#menu`} className="underline decoration-line-2 underline-offset-2 hover:decoration-ink">{t(UI.menu, lang)}</Link>
                        <Link href={`/mekan/${v.slug}/#deneyimler`} className="underline decoration-line-2 underline-offset-2 hover:decoration-ink">{t(UI.experiences, lang)}</Link>
                        <Link href={`/mekan/${v.slug}/#esik`} className="underline decoration-line-2 underline-offset-2 hover:decoration-ink">{t(UI.saveThreshold, lang)}</Link>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {lang === "en" && <p className="mt-4 border-t border-line pt-3 text-[12px] leading-snug text-ink-3">{UI.profileLangNote.en}</p>}
            </section>

            <section aria-labelledby="h-kunye" className="border-t-2 border-line-strong pt-3 text-[12.5px] leading-relaxed text-ink-2">
              <h2 id="h-kunye" className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink">{t(UI.editorial, lang)}</h2>
              <p className="mt-2">{a.editorial.desk[lang]} · {a.editorial.visited ? t(UI.visitYes, lang) : t(UI.visitNo, lang)}</p>
              <p className="mt-1 text-ink-3">{a.editorial.method[lang]}</p>
              <p className="mt-1">
                {a.commercial.state === "var" ? <><span className="font-bold">{a.commercial.label[lang]}:</span> {a.commercial.detail[lang]}</>
                  : a.commercial.state === "yok" ? t(UI.commercialNone, lang).replace("{by}", a.commercial.verifiedBy).replace("{date}", fmtDay(a.commercial.verifiedAt, lang))
                  : t(UI.commercialUnverified, lang)}
              </p>
              <h3 id="h-kaynak" className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink">{t(UI.sources, lang)}</h3>
              <ol className="mt-1.5 flex flex-col gap-2 text-[12.5px] leading-snug">
                {a.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} rel="noopener noreferrer" target="_blank" className="font-semibold text-ink underline decoration-line-2 underline-offset-2 hover:decoration-ink">{s.title[lang]}</a>
                    <span className="block text-[11.5px] text-ink-3">{s.publisher[lang]} · {t(UI.checked, lang)} {fmtDay(s.checkedAt, lang)}</span>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>

        {more.length > 0 && (
          <nav aria-label={t(UI.more, lang)} className="mt-16 border-t-2 border-line-strong pt-5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]">{t(UI.more, lang)}</p>
              <Link href={hrefOf(lang)} className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-3 hover:text-ink">{t(UI.back, lang)} →</Link>
            </div>
            <div className="mt-6 grid gap-10 md:grid-cols-3 md:gap-7">{more.map((m) => <Card key={m.slug} a={m} lang={lang} />)}</div>
          </nav>
        )}
      </article>
    </div>
  );
}
