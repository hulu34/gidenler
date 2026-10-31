/* GİDENLER SEÇKİSİ — içerik ve görünürlük testleri (veritabanı ve ağ gerektirmez).
   npx tsx scripts/seckisitest.ts */
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { ALL_ARTICLES, articles, articleBySlug, articlesForVenue, readableArticles, listable, reviewVisible, sections, upcomingEvents, seckiNavVisible } from "../lib/seckisi";
import { Article, Event, type Block } from "../lib/seckisi/schema";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, info = "") => { cond ? pass++ : fail++; console.log(`${cond ? "✓" : "✗"} ${name}${info ? " · " + info : ""}`); };
const root = new URL("../", import.meta.url);

/* 1) Dizin: klasördeki her yazı içerik dizininde listelenmiş */
const files = readdirSync(new URL("content/seckisi/yazilar/", root)).filter((f) => f.endsWith(".json"));
const index = readFileSync(new URL("content/seckisi/index.ts", root), "utf8");
ok("klasördeki her yazı dizinde", files.every((f) => index.includes(`./yazilar/${f}`)), `${files.length} dosya`);
const bad0 = (patch: Record<string, unknown>) => !Article.safeParse({ ...structuredClone(ALL_ARTICLES.find((a) => a.kind === "kesif")!), ...patch }).success;
ok("dosya adı = slug", files.every((f) => ALL_ARTICLES.some((a) => `${a.slug}.json` === f)));

/* 2) Her bağlı restoran gerçek profil */
for (const a of ALL_ARTICLES) for (const v of a.venues)
  ok(`${a.slug}: restoran profili var (${v.slug})`, existsSync(new URL(`content/profiles/${v.slug}.json`, root)));

/* 3) İlk paket: yalnız editör onayıyla yayımlanan Japon Erdal yayında; geri kalanı kontrol bekliyor */
const pkg = ALL_ARTICLES.filter((a) => a.status !== "taslak");
ok("ilk pakette 7 içerik", pkg.length === 7, pkg.map((a) => a.kind).join(","));
const je0 = pkg.find((a) => a.slug === "japon-erdal-dort-pide-bir-efsane");
ok("yalnız Japon Erdal yayında; diğerleri kontrol bekliyor", pkg.every((a) => a === je0 ? a.status === "yayinda" && a.publishedAt === "2026-10-30" : a.status === "kontrol" && a.publishedAt === null));
ok("türler: 2 hikâye, 3 keşif, 1 mutfaktan, 1 semt", ["hikaye:2", "kesif:3", "mutfak:1", "semt:1"].every((k) => { const [kind, n] = k.split(":"); return pkg.filter((a) => a.kind === kind).length === Number(n); }));
ok("ziyaret iddiası yok (hepsi visited=false)", pkg.every((a) => a.editorial.visited === false));
ok("yeni açılan restoran iddiası yok", pkg.every((a) => a.newOpening === false));
const je = pkg.find((a) => a.venues.some((v) => v.slug === "japon-erdal-beyoglu"));
const last = (bs: Block[]) => { const l = bs[bs.length - 1]; return l && "p" in l ? l.p : ""; };
ok("Japon Erdal: sahiplik ilişkisi yazının sonunda tek cümle; başta, kartta ve etikette yok", !!je && !je.notice && last(je.body.tr).startsWith("Not: Japon Erdal") && last(je.body.en).startsWith("Note: Japon Erdal") && !!je.ownership && je.commercial.state === "var");
ok("Japon Erdal: ilişki gövdede yalnız bir kez geçiyor", !!je && je.body.tr.filter((b) => "p" in b && b.p.includes("sahiplik")).length === 1 && !je.why.tr.includes("Kurucu"));
ok("Japon Erdal ana hikâye; kapak hakkı işletme izniyle kayıtlı", !!je && je.featured && je.cover.state === "var" && je.cover.rights === "isletme-izni" && je.cover.credit === "Japon Erdal arşivi");
ok("tek öne çıkan hikâye", pkg.filter((a) => a.featured).length === 1);
ok("öne çıkan hikâye kapaksız olamaz", bad0({ kind: "hikaye", featured: true }));
ok("yazı içi fotoğraflar hak kayıtlı ve kendi sunucumuzda", pkg.every((a) => (a.gallery ?? []).every((g) => g.src.startsWith("/seckisi/gorsel/") && g.rightsRef.length > 3 && existsSync(new URL(`public${g.src}`, root)))));
ok("kapak dosyaları mevcut", pkg.every((a) => a.cover.state === "yok" || existsSync(new URL(`public${a.cover.src}`, root))));
ok("Japon Erdal videoları oynatılarak doğrulanmış", !!je?.media && je.media.videos.length > 0 && je.media.videos.every((v) => !!v.verifiedAt));
ok("sahiplik ilişkisi ticari ilişki gösterilmeden reddedilir", bad0({ ownership: { tr: "x", en: "y" } }));
ok("her yazıda kaynak ve işletme kaynağı", pkg.every((a) => a.sources.some((s) => s.kind === "isletme")));
ok("kapak hakkı doğrulanmayanlarda eksik notu var", pkg.every((a) => a.cover.state === "var" || a.cover.gap.tr.length > 10));
ok("puan bölümü yazısı yok (sıralama verisi yok)", pkg.every((a) => a.kind !== "puan"));
ok("ticari ilişki doğrulanmadan \"yok\" denmiyor", pkg.every((a) => a.commercial.state !== "yok"));
ok("ticari ilişki doğrulanmadan yayımlanamaz", bad0({ status: "yayinda", publishedAt: "2026-11-01" }));
ok("tadım menüsü \"Mutfaktan\" altında ve etiketi açık", pkg.some((a) => a.kind === "mutfak" && a.label?.tr === "Tadım menüsü" && a.label.en === "Tasting menu"));
ok("lisanslı kapakta lisans ve kaynak bağlantısı var", pkg.every((a) => a.cover.state === "yok" || (!!a.cover.sourceUrl && (a.cover.rights !== "lisans" || !!a.cover.licenseUrl))));

/* 4) Görünürlük */
ok("Production'da kontrol bekleyen görünmez", articles(false).length === 1 && articles(false)[0] === je0);
ok("Production'da Seçki bağlantısı var (yayında yazı var)", seckiNavVisible(false) === true);
ok("Preview'da 7 yazı listelenir", articles(true).length === 7);
ok("taslak Preview'da da görünmez", !articles(true).some((a) => a.status === "taslak") && articleBySlug("taslak-denetim-kaydi", true) === null);
ok("taslak okunabilir listede yok", !readableArticles(true).some((a) => a.slug === "taslak-denetim-kaydi"));
ok("reviewVisible: preview", reviewVisible({ VERCEL_ENV: "preview" }) === true);
ok("reviewVisible: production", reviewVisible({ VERCEL_ENV: "production", NODE_ENV: "production" }) === false);
ok("reviewVisible: yerel geliştirme", reviewVisible({ NODE_ENV: "development" }) === true);
ok("reviewVisible: yerel üretim derlemesi", reviewVisible({ NODE_ENV: "production" }) === false);
const base = ALL_ARTICLES.find((a) => a.slug === "serden-mese-atesinin-karsisinda")!;
const pub = { ...base, status: "yayinda" as const, publishedAt: "2026-11-01" };
const arc = { ...base, slug: "arsiv-ornek", status: "arsiv" as const, publishedAt: "2026-11-01" };
ok("yayındaki yazı Production'da listelenir", listable(pub, false));
ok("arşiv listede yok ama adresiyle açılır", articles(false, [arc]).length === 0 && articleBySlug("arsiv-ornek", false, [arc]) !== null);

/* 5) Şema kuralları */
const bad = (patch: Record<string, unknown>) => !Article.safeParse({ ...structuredClone(base), ...patch }).success;
ok("TR/EN gövde yapısı farklıysa reddedilir", bad({ body: { tr: base.body.tr, en: base.body.en.slice(0, -1) } }));
ok("TR/EN rakamları farklıysa reddedilir", bad({ dek: { tr: base.dek.tr, en: base.dek.en.replace("2011", "2012") } }));
ok("yayındaki yazı tarihsiz olamaz", bad({ status: "yayinda", publishedAt: null }));
ok("taslakta yayın tarihi olamaz", bad({ status: "taslak", publishedAt: "2026-10-30" }));
ok("güncelleme tarihi yayından önce olamaz", bad({ status: "yayinda", publishedAt: "2026-11-02", updatedAt: "2026-11-01" }));
ok("puan yazısı sıralama kaynağı olmadan reddedilir", bad({ kind: "puan" }));
ok("kapak görseli hak kaydı olmadan reddedilir", bad({ cover: { state: "var", src: "/seckisi/gorsel/x.jpg", alt: { tr: "a", en: "b" }, credit: "c", depicts: "d" } }));
ok("dış sunucudaki kapak görseli reddedilir", bad({ cover: { state: "var", src: "https://lh3.googleusercontent.com/x", alt: { tr: "a", en: "b" }, credit: "c", rights: "lisans", rightsRef: "abc", sourceUrl: "https://example.org/x", licenseUrl: "https://example.org/l", depicts: "d" } }));
ok("lisanslı kapak lisans bağlantısı olmadan reddedilir", bad({ cover: { state: "var", src: "/seckisi/gorsel/x.jpg", alt: { tr: "a", en: "b" }, credit: "c", rights: "lisans", rightsRef: "CC BY 4.0", sourceUrl: "https://example.org/x", depicts: "d" } }));
ok("\"en\" slug olarak reddedilir", bad({ slug: "en" }));

/* 6) Bölümler: içerik yoksa bölüm yok; sıra sabit */
const secs = sections(articles(true), []);
ok("bölüm sırası", secs.map((s) => s.key).join(",") === "hikaye,kesif,mutfak,semt", secs.map((s) => s.key).join(","));
ok("puan ve deneyim bölümleri boşken görünmez", !secs.some((s) => s.key === "puan" || s.key === "deneyimler"));
ok("profilde yalnız o restoranın yazısı; Production'da kontrol bekleyen yok", articlesForVenue("japon-erdal-beyoglu", false).length === 1 && articlesForVenue("pandeli-fatih", false).length === 0 && articlesForVenue("pandeli-fatih", true).length === 1);
ok("Production'da yalnız ana hikâye bölümü var", sections(articles(false), []).map((x) => x.key).join() === "hikaye");

/* 7) Etkinlikler: süresi geçen ve iptal edilen çıkar, ertelenen yeni tarihiyle kalır (test verisi; yayına girmez) */
const ev = (id: string, status: string, startsAt: string, endsAt: string, extra: Record<string, unknown> = {}) => Event.parse({
  id, status, title: { tr: "Örnek", en: "Sample" }, venueSlug: "pandeli-fatih", startsAt, endsAt, price: null,
  bookingUrl: "https://example.org/bilet", announcementUrl: "https://example.org/duyuru", organizer: "Örnek düzenleyici", checkedAt: "2026-10-30", ...extra,
});
const now = new Date("2026-11-10T12:00:00+03:00");
const list = [
  ev("gecmis", "planlandi", "2026-11-01T19:00:00+03:00", "2026-11-01T22:00:00+03:00"),
  ev("suruyor", "planlandi", "2026-11-10T10:00:00+03:00", "2026-11-10T14:00:00+03:00"),
  ev("iptal", "iptal", "2026-11-20T19:00:00+03:00", "2026-11-20T22:00:00+03:00"),
  ev("ertelendi", "ertelendi", "2026-12-05T19:00:00+03:00", "2026-12-05T22:00:00+03:00", { previousStartsAt: "2026-11-15T19:00:00+03:00" }),
  ev("gelecek", "planlandi", "2026-11-25T19:00:00+03:00", "2026-11-25T22:00:00+03:00"),
];
ok("yaklaşanlar: geçmiş ve iptal çıkar, sıralı", upcomingEvents(now, list).map((e) => e.id).join(",") === "suruyor,gelecek,ertelendi", upcomingEvents(now, list).map((e) => e.id).join(","));
ok("bitiş anında listeden çıkar", upcomingEvents(new Date("2026-11-10T14:00:00+03:00"), list).every((e) => e.id !== "suruyor"));
ok("ertelenen etkinlik eski tarih olmadan reddedilir", !Event.safeParse({ ...list[3], previousStartsAt: undefined }).success);
ok("kontenjan/satış alanı kabul edilmez", !Event.safeParse({ ...list[4], seatsLeft: 2 }).success);
ok("bitiş başlangıçtan önce olamaz", !Event.safeParse({ ...list[4], endsAt: "2026-11-25T18:00:00+03:00" }).success);
ok("bilet bağlantısı https olmalı", !Event.safeParse({ ...list[4], bookingUrl: "http://example.org" }).success);
ok("Preview/Production'da yaklaşan deneyim kaydı yok (doğrulanmış etkinlik yok)", upcomingEvents().length === 0);


console.log(`\nSONUÇ ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
