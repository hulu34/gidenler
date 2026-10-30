import { z } from "zod";

/* ──────────────────────────────────────────────────────────────────────────
   GİDENLER SEÇKİSİ / THE GIDENLER EDIT — içerik şeması.
   İçerik content/seckisi/ altında sürüm kontrollü JSON; bileşen koduna gömülmez.
   İki dil aynı dosyada ve AYNI YAPIDA tutulur (blok sayısı ve türleri eşit) — fiyat, tarih, adres ve
   ticari ilişki iki dilde ayrı ayrı yazılmaz, aynı alandan gelir ya da yapı eşitliğiyle denetlenir.
   ────────────────────────────────────────────────────────────────────────── */

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-AA-GG");
const stamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/, "saat dilimli ISO tarih-saat");
export const Text = z.object({ tr: z.string().trim().min(1), en: z.string().trim().min(1) }).strict();

/** Yazı gövdesi bloğu: ara başlık, paragraf ya da madde listesi. */
const Block = z.union([
  z.object({ h: z.string().trim().min(1) }).strict(),
  z.object({ p: z.string().trim().min(1) }).strict(),
  z.object({ list: z.array(z.string().trim().min(1)).min(1) }).strict(),
]);
export type Block = z.infer<typeof Block>;

export const STATUSES = ["taslak", "kontrol", "yayinda", "arsiv"] as const;
/* "mutfak" = Mutfaktan / From the Kitchen (tadım menüsü, mutfak yaklaşımı). Şefin katıldığı gerçek bir şef masası
   deneyimi ileride ayrı bir türle ve doğrulanmış duyuruyla eklenir; burada vaat edilmez. */
export const KINDS = ["hikaye", "puan", "kesif", "mutfak", "semt"] as const;

const Source = z.object({
  title: Text,
  publisher: Text,
  url: z.url({ protocol: /^https?$/ }),
  checkedAt: day,
  /** Kaynağın türü: işletmenin kendi yayını mı, Gidenler'in profili mi, üçüncü taraf mı. */
  kind: z.enum(["isletme", "gidenler", "basin", "duzenleyici"]),
}).strict();

/** Kapak: fotoğrafın kullanım hakkı yazının kaynak doğrulamasından AYRI değerlendirilir. */
const Cover = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("yok"),
    /** Neden kapak fotoğrafı yok — teslim listesine de bu metin gider. */
    gap: Text,
  }).strict(),
  z.object({
    state: z.literal("var"),
    src: z.string().regex(/^\/seckisi\/gorsel\//, "yalnız kendi sunucumuzdaki izinli görseller"),
    alt: Text,
    credit: z.string().trim().min(1),
    /** "izinli-basin" | "isletme-izni" | "lisans" — serbest metin değil. */
    rights: z.enum(["izinli-basin", "isletme-izni", "lisans"]),
    /** İznin kaydı: e-posta tarihi, lisans adı/URL'si. */
    rightsRef: z.string().trim().min(3),
    /** Görselin kaynak sayfası (lisans sayfası, basın kiti, izin e-postasının kaydı). */
    sourceUrl: z.url({ protocol: /^https$/ }),
    /** Lisanslı görselde lisans metni. */
    licenseUrl: z.url({ protocol: /^https$/ }).optional(),
    /** Kısa bağlam notu (ör. "Cihangir'de bir merdivenli sokak, 2011"). */
    note: Text.optional(),
    /** Görsel anlatılan restoranın kendisi mi. */
    depicts: z.string().trim().min(1),
  }).strict(),
]);

const Ranking = z.object({
  /** "İstanbul · restoran" gibi şehir/kategori kapsamı */
  scope: Text,
  period: z.object({ from: day, to: day }).strict(),
  /** Sıralamanın kaynağı: yalnız Gidenler'in yayımlanmış puan geçmişi. */
  source: z.literal("gidenler-rating-history"),
  algorithmVersion: z.string().min(1),
}).strict();

/** Başkalarının yayımladıkları: basın/rehber yazıları ve videolar. Bağımsızlık bilinmiyorsa "belirsiz"; beyan yoksa bağımsız sayılmaz. */
const Press = z.object({
  outlet: z.string().trim().min(1),
  title: z.string().trim().min(1),
  author: z.string().trim().min(1).optional(),
  url: z.url({ protocol: /^https$/ }),
  date: day,
  type: z.enum(["haber", "kose", "liste", "blog", "rehber", "ticari-blog", "roportaj"]),
  independence: z.enum(["bagimsizlik-beyani", "beyan-yok", "sponsorlu", "davetli", "belirsiz"]),
  /** Ticari ilişki/işbirliği beyanı ne diyor (yayın ile restoran arasında). */
  disclosure: Text,
  /** Tam metin okunabildi mi; abonelik duvarı varsa "kismi". */
  access: z.enum(["tam", "kismi"]),
  /** Kısa, özgün özet (kaynağın metni kopyalanmaz). */
  note: Text,
}).strict();
const Video = z.object({
  youtubeId: z.string().regex(/^[\w-]{11}$/),
  channel: z.string().trim().min(1),
  handle: z.string().regex(/^@/),
  title: z.string().trim().min(1),
  date: day,
  /** Restoranın görüldüğü bölümün başlangıcı (saniye). */
  start: z.number().int().min(0).default(0),
  type: z.enum(["roportaj", "ziyaret", "cok-mekanli"]),
  disclosure: Text,
  note: Text,
  /** Restoranı gerçekten gösterdiği oynatılarak doğrulandı. */
  verifiedAt: day,
}).strict();

/** Yazı içi görsel: kapakla aynı hak kuralları. */
const Photo = z.object({
  src: z.string().regex(/^\/seckisi\/gorsel\//),
  alt: Text,
  caption: Text,
  credit: z.string().trim().min(1),
  rights: z.enum(["izinli-basin", "isletme-izni", "lisans"]),
  rightsRef: z.string().trim().min(3),
  sourceUrl: z.url({ protocol: /^https$/ }),
}).strict();

export const Article = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).refine((s) => s !== "en", "\"en\" ayrılmış yol"),
  kind: z.enum(KINDS),
  status: z.enum(STATUSES),
  /** Ana sayfadaki "Haftanın Hikâyesi" yeri. */
  featured: z.boolean().default(false),
  title: Text,
  /** Semt rehberinde semt adı (kapakta). */
  area: Text.optional(),
  /** Kartta türün yerine gösterilen biçim etiketi (ör. "Tadım menüsü"). */
  label: Text.optional(),
  /** Kısa açıklama (dek). */
  dek: Text,
  /** Seçilme gerekçesi. */
  why: Text,
  /** Yazının başında gösterilen açıklayıcı not (ör. "bu bir şef masası deneyimi değildir"). */
  notice: Text.optional(),
  body: z.object({ tr: z.array(Block).min(1), en: z.array(Block).min(1) }).strict(),
  /** "Gitmeden bilin" — iki dilde aynı sayıda madde. */
  know: z.object({ tr: z.array(z.string().trim().min(1)).min(1), en: z.array(z.string().trim().min(1)).min(1) }).strict(),
  /** Bağlı gerçek restoran profilleri (content/profiles/<slug>.json). */
  venues: z.array(z.object({ slug: z.string().min(1), role: Text.optional() }).strict()).min(1),
  sources: z.array(Source).min(1),
  cover: Cover,
  /** Sorumlu editoryal kimlik: gerçek olmayan yazar uydurulmaz; masa adı ve yöntem yazılır. */
  editorial: z.object({
    desk: Text,
    method: Text,
    /** Yazı için mekân ziyareti yapıldı mı. Yapılmadıysa sayfada açıkça yazar. */
    visited: z.boolean(),
  }).strict(),
  preparedAt: day,
  /** Yalnız yayımlanınca doldurulur; yeni görünmek için değiştirilmez. */
  publishedAt: day.nullable(),
  /** Yalnız içerik gerçekten değişince. */
  updatedAt: day.nullable(),
  /** Restoran yeni açılmış mı (Gidenler'in yeni ele alması değil). Varsayılan hayır. */
  newOpening: z.boolean().default(false),
  /** Ticari işbirliği — varsa sayfada görünür etiketle. */
  /** Ticari ilişki. "yok" yalnız doğrulandığında (kim, ne zaman); boş alan doğrulanmış yokluk sayılmaz. */
  commercial: z.discriminatedUnion("state", [
    z.object({ state: z.literal("dogrulanmadi") }).strict(),
    z.object({ state: z.literal("yok"), verifiedBy: z.string().trim().min(2), verifiedAt: day }).strict(),
    z.object({ state: z.literal("var"), label: Text, detail: Text }).strict(),
  ]),
  /** Kurucu/ekiple sahiplik veya yakınlık ilişkisi — varsa görünür. */
  ownership: Text.nullable(),
  ranking: Ranking.optional(),
  media: z.object({ press: z.array(Press), videos: z.array(Video) }).strict().optional(),
  gallery: z.array(Photo).max(6).optional(),
}).strict().superRefine((a, ctx) => {
  const shape = (bs: Block[]) => bs.map((b) => ("h" in b ? "h" : "p" in b ? "p" : `list${b.list.length}`)).join(",");
  if (shape(a.body.tr) !== shape(a.body.en)) ctx.addIssue({ code: "custom", path: ["body"], message: "TR ve EN gövde yapısı farklı" });
  if (a.know.tr.length !== a.know.en.length) ctx.addIssue({ code: "custom", path: ["know"], message: "TR ve EN 'gitmeden bilin' madde sayısı farklı" });
  if (a.status === "yayinda" && !a.publishedAt) ctx.addIssue({ code: "custom", path: ["publishedAt"], message: "yayındaki yazının yayın tarihi yok" });
  if (a.status !== "yayinda" && a.status !== "arsiv" && a.publishedAt) ctx.addIssue({ code: "custom", path: ["publishedAt"], message: "yayımlanmamış yazıda yayın tarihi var" });
  if (a.updatedAt && (!a.publishedAt || a.updatedAt <= a.publishedAt)) ctx.addIssue({ code: "custom", path: ["updatedAt"], message: "güncelleme tarihi yayından sonra olmalı" });
  if (a.kind === "puan" && !a.ranking) ctx.addIssue({ code: "custom", path: ["ranking"], message: "puan yazısı sıralama kaynağı olmadan açılamaz" });
  if (a.kind === "semt" && !a.area) ctx.addIssue({ code: "custom", path: ["area"], message: "semt rehberinde semt adı yok" });
  if (a.cover.state === "var" && a.cover.rights === "lisans" && !a.cover.licenseUrl) ctx.addIssue({ code: "custom", path: ["cover"], message: "lisanslı görselde lisans bağlantısı yok" });
  if (a.status === "yayinda" && a.commercial.state === "dogrulanmadi") ctx.addIssue({ code: "custom", path: ["commercial"], message: "ticari ilişki doğrulanmadan yayımlanamaz" });
  if (a.ownership && a.commercial.state !== "var") ctx.addIssue({ code: "custom", path: ["commercial"], message: "sahiplik ilişkisi olan yazıda ticari ilişki görünür olmalı" });
  /* Sahiplik ilişkisi yazının sonunda, son paragrafta tek cümleyle açıklanır (her iki dilde). */
  const lastP = (bs: Block[]) => { const l = bs[bs.length - 1]; return l && "p" in l ? l.p : ""; };
  if (a.ownership && !(lastP(a.body.tr).includes("Gidenler") && lastP(a.body.en).includes("Gidenler"))) ctx.addIssue({ code: "custom", path: ["body"], message: "sahiplik ilişkisi yazının son paragrafında açıklanmalı" });
  if (a.featured && a.cover.state !== "var") ctx.addIssue({ code: "custom", path: ["featured"], message: "ana hikâye hakkı doğrulanmış kapak fotoğrafı olmadan öne çıkamaz" });
  if (a.featured && a.kind !== "hikaye") ctx.addIssue({ code: "custom", path: ["featured"], message: "yalnız hikâye öne çıkar" });
  /* Rakamlar iki dilde aynı olmalı: TR'de geçen her fiyat/tarih/saat rakamı EN'de de geçer (binlik ayırıcı ve saat biçimi fark etmez). */
  const nums = (s: string) => (s.match(/\d[\d.,:]*\d|\d/g) ?? []).map((n) => n.replace(/[.,:]/g, "")).sort().join("|");
  const all = (l: "tr" | "en") => [a.title[l], a.dek[l], a.why[l], a.notice?.[l] ?? "", ...a.body[l].map((b) => ("h" in b ? b.h : "p" in b ? b.p : b.list.join(" "))), ...a.know[l]].join(" ");
  if (nums(all("tr")) !== nums(all("en"))) ctx.addIssue({ code: "custom", path: ["body"], message: `TR ve EN metindeki rakamlar farklı: TR[${nums(all("tr"))}] EN[${nums(all("en"))}]` });
});
export type Article = z.infer<typeof Article>;

/** Etkinlik: yalnız düzenleyicinin doğrulanmış duyurusuna dayanır. Kontenjan/satış durumu alanı bilerek YOK. */
export const Event = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Duyuruya göre durum; iptal ve tarih değişikliği buradan yönetilir. */
  status: z.enum(["planlandi", "ertelendi", "iptal"]),
  title: Text,
  venueSlug: z.string().min(1),
  branch: Text.optional(),
  startsAt: stamp,
  endsAt: stamp,
  /** Etkinliğin dili (ör. Türkçe) — düzenleyici belirtmediyse yazılmaz. */
  language: Text.optional(),
  price: z.object({ amountTry: z.number().positive(), covers: Text }).strict().nullable(),
  bookingUrl: z.url({ protocol: /^https$/ }),
  announcementUrl: z.url({ protocol: /^https$/ }),
  organizer: z.string().trim().min(1),
  checkedAt: day,
  note: Text.optional(),
  /** Ertelenen etkinliğin eski başlangıcı (gösterim için). */
  previousStartsAt: stamp.optional(),
}).strict().superRefine((e, ctx) => {
  if (Date.parse(e.endsAt) <= Date.parse(e.startsAt)) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "bitiş başlangıçtan sonra olmalı" });
  if (e.status === "ertelendi" && !e.previousStartsAt) ctx.addIssue({ code: "custom", path: ["previousStartsAt"], message: "ertelenen etkinliğin eski tarihi yok" });
});
export type Event = z.infer<typeof Event>;
