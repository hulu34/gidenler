import { sql } from "drizzle-orm";
/* ==========================================================================
   GİDENLER VERİ MODELİ (Faz 0)
   --------------------------------------------------------------------------
   · Tüm tablolar şimdi açılır; arayüzleri fazlara yayılır. Yemek arama, Gidenler Puanı,
     listeler, Top 100 ve üretici ilişkileri sonradan büyük değişiklik gerektirmez.
   · Kimlikler: UUIDv7 (zamana göre sıralı). Kullanıcı tabloları Better Auth sözleşmesine uyar.
   · Saklama kuralı sağlayıcıya göre: Google içeriği HİÇBİR tabloda tutulmaz (yalnız place_id).
   · Ticari ilişki ayrımı: işletmenin Gidenler ile ticari ilişkisi (abonelik, reklam, rezervasyon
     ortaklığı) yalnız `business_*` / `sponsored_*` tablolarında durur; puan hesabı bu tablolara
     erişmez (bkz. lib/score/inputs.ts — izin listesi).
   ========================================================================== */
import {
  pgTable, text, timestamp, boolean, integer, doublePrecision, jsonb, primaryKey, uniqueIndex, index, smallint, date,
} from "drizzle-orm/pg-core";

const ts = (n: string) => timestamp(n, { withTimezone: true, mode: "date" });
const created = () => ts("created_at").notNull().defaultNow();
const updated = () => ts("updated_at").notNull().defaultNow();

/* ───────────────────────────── KİMLİK (Better Auth) ───────────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** Gidenler'e özgü: herkese açık kullanıcı adı (profil adresi). */
  handle: text("handle").unique(),
  /** user | creator | business | editor | admin */
  kind: text("kind").notNull().default("user"),
  createdAt: created(),
  updatedAt: updated(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: ts("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("session_user_idx").on(t.userId)]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  refreshTokenExpiresAt: ts("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("account_user_idx").on(t.userId)]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: created(),
  updatedAt: updated(),
});

/* ───────────────────────────── MEKÂN ───────────────────────────── */

export const places = pgTable("places", {
  id: text("id").primaryKey(),                          // UUIDv7
  /** Uygulamadaki mevcut kimlik ("ent.r.<slug>") — statik veriyle köprü. */
  legacyId: text("legacy_id").unique(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** restaurant | cafe | bar | hotel | event | … — kategori modülünü seçer. */
  vertical: text("vertical").notNull(),
  categoryId: text("category_id").notNull(),
  subcategory: text("subcategory"),
  city: text("city").notNull(),
  district: text("district"),
  neighborhood: text("neighborhood"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  address: text("address"),
  phone: text("phone"),
  website: text("website"),
  instagram: text("instagram"),
  openingHours: text("opening_hours"),
  /** active | closed | pending */
  status: text("status").notNull().default("active"),
  isPilot: boolean("is_pilot").notNull().default(false),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("places_city_district_idx").on(t.city, t.district), index("places_category_idx").on(t.categoryId)]);

export const placeIdentifiers = pgTable("place_identifiers", {
  id: text("id").primaryKey(),
  placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  /** osm | google | foursquare | tripadvisor | michelin | … */
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  matchScore: doublePrecision("match_score"),
  matchMethod: text("match_method"),
  /** auto | pending | confirmed | rejected */
  status: text("status").notNull().default("pending"),
  verifiedBy: text("verified_by"),
  verifiedAt: ts("verified_at"),
  createdAt: created(),
}, (t) => [
  /* Aynı dış kimlik iki mekâna bağlanabilir (ör. şube karışıklığı) — bu durum moderasyona düşer. */
  uniqueIndex("place_identifiers_place_provider_ext_uq").on(t.placeId, t.provider, t.externalId),
  index("place_identifiers_provider_ext_idx").on(t.provider, t.externalId),
]);

export const fieldProvenance = pgTable("field_provenance", {
  id: text("id").primaryKey(),
  placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  field: text("field").notNull(),
  value: text("value"),
  provider: text("provider").notNull(),
  license: text("license"),
  fetchedAt: ts("fetched_at").notNull(),
  expiresAt: ts("expires_at"),
  confidence: doublePrecision("confidence"),
}, (t) => [index("field_provenance_place_idx").on(t.placeId, t.field)]);

/** Restorana özgü alanlar (kategori modülü). Otel, etkinlik… kendi vertical_* tablolarını alır. */
export const verticalRestaurant = pgTable("vertical_restaurant", {
  placeId: text("place_id").primaryKey().references(() => places.id, { onDelete: "cascade" }),
  lunchMin: integer("lunch_min"), lunchMax: integer("lunch_max"),
  dinnerMin: integer("dinner_min"), dinnerMax: integer("dinner_max"),
  /** business | experiences — bütçe bandının kaynağı */
  priceBasis: text("price_basis"),
  /** Olanaklar: teras, otopark, çocuk, evcil, alkol, vegan, engelli erişimi… (kaynaklı) */
  amenities: jsonb("amenities").$type<Record<string, { value: boolean; source: string }>>(),
  /** gidenler | contact */
  reservationMode: text("reservation_mode").notNull().default("contact"),
  reservationConfig: jsonb("reservation_config"),
  updatedAt: updated(),
});

/* ───────────────────────────── YEMEK ───────────────────────────── */

export const dishes = pgTable("dishes", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  cuisine: text("cuisine"),
  parentId: text("parent_id"),
  createdAt: created(),
});

export const menuItems = pgTable("menu_items", {
  id: text("id").primaryKey(),
  placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  dishId: text("dish_id").references(() => dishes.id, { onDelete: "set null" }),
  rawName: text("raw_name").notNull(),
  description: text("description"),
  /** kuruş cinsinden; yalnız resmî kaynakta varsa */
  priceMinor: integer("price_minor"),
  currency: text("currency").default("TRY"),
  section: text("section"),
  /** business | official_site | user */
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  validAt: date("valid_at"),
  createdAt: created(),
}, (t) => [index("menu_items_place_idx").on(t.placeId), index("menu_items_dish_idx").on(t.dishId)]);

export const placeDishes = pgTable("place_dishes", {
  placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  dishId: text("dish_id").notNull().references(() => dishes.id, { onDelete: "cascade" }),
  signature: boolean("signature").notNull().default(false),
  mentionCount: integer("mention_count").notNull().default(0),
  dishScore: doublePrecision("dish_score"),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  updatedAt: updated(),
}, (t) => [primaryKey({ columns: [t.placeId, t.dishId] }), index("place_dishes_dish_idx").on(t.dishId)]);

/* ───────────────────────────── MEDYA · ÜRETİCİ ───────────────────────────── */

export const creators = pgTable("creators", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  /** unclaimed | claimed | verified */
  status: text("status").notNull().default("unclaimed"),
  createdAt: created(),
});

export const creatorAccounts = pgTable("creator_accounts", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id").notNull().references(() => creators.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),               // youtube | instagram | tiktok
  handle: text("handle").notNull(),
  verifiedMethod: text("verified_method"),            // bio_code | oauth
  verifiedAt: ts("verified_at"),
}, (t) => [uniqueIndex("creator_accounts_platform_handle_uq").on(t.platform, t.handle)]);

export const mediaItems = pgTable("media_items", {
  id: text("id").primaryKey(),
  /** photo | video | embed */
  type: text("type").notNull(),
  platform: text("platform").notNull(),               // youtube | instagram | tiktok | commons | upload
  url: text("url").notNull(),
  externalId: text("external_id"),
  /** store | embed | id_only — sağlayıcının saklama kuralı */
  storageClass: text("storage_class").notNull(),
  /** influencer | yemek | atmosfer | ziyaretci | isletme | editor ; foto: yemek | ic | dis | menu | icecek */
  category: text("category"),
  creatorId: text("creator_id").references(() => creators.id, { onDelete: "set null" }),
  credit: text("credit"),
  license: text("license"),
  sponsored: boolean("sponsored").notNull().default(false),
  /** auto | community | creator | business | editor */
  source: text("source").notNull(),
  submittedBy: text("submitted_by").references(() => user.id, { onDelete: "set null" }),
  /** pending | approved | rejected | removed */
  status: text("status").notNull().default("pending"),
  lastCheckedAt: ts("last_checked_at"),
  createdAt: created(),
}, (t) => [uniqueIndex("media_items_url_uq").on(t.url), index("media_items_creator_idx").on(t.creatorId)]);

export const mediaPlaces = pgTable("media_places", {
  mediaId: text("media_id").notNull().references(() => mediaItems.id, { onDelete: "cascade" }),
  placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  /** Videoda mekânın geçtiği saniye (varsa). */
  atSecond: integer("at_second"),
}, (t) => [primaryKey({ columns: [t.mediaId, t.placeId] }), index("media_places_place_idx").on(t.placeId)]);

export const dishMedia = pgTable("dish_media", {
  mediaId: text("media_id").notNull().references(() => mediaItems.id, { onDelete: "cascade" }),
  dishId: text("dish_id").notNull().references(() => dishes.id, { onDelete: "cascade" }),
  placeId: text("place_id").references(() => places.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.mediaId, t.dishId] }), index("dish_media_dish_idx").on(t.dishId)]);

/* ───────────────────────────── DENEYİM · PUAN ───────────────────────────── */

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  visitedOn: date("visited_on").notNull(),
  visitNo: integer("visit_no").notNull().default(1),
  meal: text("meal"),                                   // lunch | dinner | other
  pricePerPerson: integer("price_per_person"),
  overall: doublePrecision("overall").notNull(),
  ratings: jsonb("ratings").$type<Record<string, number>>().notNull(),
  body: text("body").notNull(),
  returnIntent: text("return_intent"),
  /** Yorumcunun İŞLETMEYLE ilişkisi (davet, hediye, sponsorlu, çalışan…) — beyan. Gidenler'in işletmeyle ticari ilişkisi DEĞİL. */
  disclosure: text("disclosure").notNull().default("none"),
  /** published | pending | hidden | removed */
  status: text("status").notNull().default("published"),
  /** Otomatik güven filtresinin kararı (Yelp deseni): recommended | not_recommended */
  trust: text("trust").notNull().default("recommended"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("reviews_place_idx").on(t.placeId, t.status), index("reviews_user_idx").on(t.userId)]);

export const reviewDishes = pgTable("review_dishes", {
  reviewId: text("review_id").notNull().references(() => reviews.id, { onDelete: "cascade" }),
  dishId: text("dish_id").notNull().references(() => dishes.id, { onDelete: "cascade" }),
  rating: smallint("rating"),
}, (t) => [primaryKey({ columns: [t.reviewId, t.dishId] }), index("review_dishes_dish_idx").on(t.dishId)]);

/** Ziyaret doğrulama — çok sinyalli; tek bir sinyal (ör. yalnız GDN kodu) "kesin" sayılmaz. Bkz. lib/visits/verify.ts */
export const visitVerifications = pgTable("visit_verifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  reviewId: text("review_id").references(() => reviews.id, { onDelete: "set null" }),
  /** Toplanan sinyaller: [{ kind: "reservation_code" | "business_seated" | "geo" | "receipt" | …, at, weight }] */
  signals: jsonb("signals").$type<Array<{ kind: string; at: string; weight: number; ref?: string }>>().notNull().default([]),
  /** none | weak | likely | strong */
  level: text("level").notNull().default("none"),
  /** 0–1, sinyallerden hesaplanır */
  confidence: doublePrecision("confidence").notNull().default(0),
  flags: jsonb("flags").$type<string[]>().notNull().default([]),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("visit_verifications_user_place_idx").on(t.userId, t.placeId)]);

export const reviewerExpertise = pgTable("reviewer_expertise", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  scopeType: text("scope_type").notNull(),             // category | cuisine | district | dish
  scopeId: text("scope_id").notNull(),
  level: smallint("level").notNull().default(0),
  weight: doublePrecision("weight").notNull().default(1),
  reviewCount: integer("review_count").notNull().default(0),
  algorithmVersion: text("algorithm_version").notNull(),
  computedAt: ts("computed_at").notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.scopeType, t.scopeId] })]);

/** Her puan hesabı yeni satır; yerinde güncelleme yok. Algoritma sürümü zorunlu. */
export const ratingHistory = pgTable("rating_history", {
  id: text("id").primaryKey(),
  placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  computedAt: ts("computed_at").notNull(),
  algorithmVersion: text("algorithm_version").notNull(),
  score: doublePrecision("score"),
  reviewCount: integer("review_count").notNull(),
  verifiedCount: integer("verified_count").notNull(),
  confidence: text("confidence").notNull(),
  components: jsonb("components"),
}, (t) => [index("rating_history_place_time_idx").on(t.placeId, t.computedAt)]);

/* ───────────────────────────── KEŞİF · LİSTE ───────────────────────────── */

/** Gittim / Gitmek İstiyorum / Favori — kullanıcı başına mekân durumu. */
export const userPlaceStatus = pgTable("user_place_status", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  wantToGo: boolean("want_to_go").notNull().default(false),
  visited: boolean("visited").notNull().default(false),
  favorite: boolean("favorite").notNull().default(false),
  visitCount: integer("visit_count").notNull().default(0),
  lastVisitedOn: date("last_visited_on"),
  verificationId: text("verification_id"),
  updatedAt: updated(),
}, (t) => [primaryKey({ columns: [t.userId, t.placeId] }), index("user_place_status_place_idx").on(t.placeId)]);

/** Deneme eşiği — "Kaç puanın üstüne çıkarsa denemek istersin?" Kullanıcı + mekân başına tek takip.
    Kişisel tercih; restoran değerlendirmesi DEĞİL: puan, sıralama, deneyim ve ziyaret sayılarına girmez,
    Kaydet / Gitmek istiyorum / Gittim'den (user_place_status) bağımsızdır.
    state: armed (aşınca bildirir) · met (kurulduğunda zaten üstündeydi; puan eşiğe/altına inince armed olur)
           · fired (bildirim üretildi; yeni bildirim için kullanıcı eşiği değiştirir ya da takibi yeniden başlatır).
    version her kurulum/değişiklikte artar; bildirim anahtarı (watch, version) olduğu için tekrar işleme çoğaltmaz. */
export const scoreWatches = pgTable("score_watches", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  /** eşik × 10 (ör. 8,3 → 83); 10–99 */
  thresholdTenths: smallint("threshold_tenths").notNull(),
  active: boolean("active").notNull().default(true),
  state: text("state").notNull().default("armed"),
  version: integer("version").notNull().default(1),
  firedAt: ts("fired_at"),
  firedScore: doublePrecision("fired_score"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("score_watches_user_place_uq").on(t.userId, t.placeId), index("score_watches_place_idx").on(t.placeId, t.active, t.state)]);

/** Site içi bildirimler (yalnız hesap içi; e-posta/SMS/push yok). id = tekilleştirme anahtarı (ör. "esik:<watch>:v<version>"). */
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  placeId: text("place_id").references(() => places.id, { onDelete: "cascade" }),
  payload: jsonb("payload").notNull(),
  createdAt: created(),
  readAt: ts("read_at"),
}, (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)]);

export const lists = pgTable("lists", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  /** user | editorial */
  kind: text("kind").notNull().default("user"),
  /** private | link | public */
  visibility: text("visibility").notNull().default("private"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("lists_owner_idx").on(t.ownerId)]);

export const listItems = pgTable("list_items", {
  id: text("id").primaryKey(),
  listId: text("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  placeId: text("place_id").references(() => places.id, { onDelete: "cascade" }),
  dishId: text("dish_id").references(() => dishes.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  note: text("note"),
  createdAt: created(),
}, (t) => [index("list_items_list_idx").on(t.listId), index("list_items_place_idx").on(t.placeId)]);

/** Top 100 ve ödüller. `published=false` iken hiçbir yerde gerçek sıralama gibi gösterilmez. */
export const rankings = pgTable("rankings", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  scope: jsonb("scope").$type<{ city?: string; category?: string; year?: number; occasion?: string }>().notNull(),
  algorithmVersion: text("algorithm_version").notNull(),
  /** Yayın eşiği: en az N mekân, mekân başına en az M güvenilir değerlendirme. */
  minEligible: jsonb("min_eligible").$type<{ places: number; reviewsPerPlace: number }>().notNull(),
  published: boolean("published").notNull().default(false),
  publishedAt: ts("published_at"),
  createdAt: created(),
});

export const rankingEntries = pgTable("ranking_entries", {
  rankingId: text("ranking_id").notNull().references(() => rankings.id, { onDelete: "cascade" }),
  placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(),
  scoreSnapshot: doublePrecision("score_snapshot"),
}, (t) => [primaryKey({ columns: [t.rankingId, t.placeId] })]);

export const follows = pgTable("follows", {
  followerId: text("follower_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  followeeId: text("followee_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: created(),
}, (t) => [primaryKey({ columns: [t.followerId, t.followeeId] }), index("follows_followee_idx").on(t.followeeId)]);

/* ───────────────────────────── TİCARİ (puandan yalıtılmış) ───────────────────────────── */

/** İşletmenin Gidenler ile ticari ilişkisi. Puan hesabı bu tabloyu OKUMAZ. */
export const businessAccounts = pgTable("business_accounts", {
  placeId: text("place_id").primaryKey().references(() => places.id, { onDelete: "cascade" }),
  ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
  claimedAt: ts("claimed_at"),
  /** none | panel */
  subscription: text("subscription").notNull().default("none"),
  reservationPartner: boolean("reservation_partner").notNull().default(false),
  updatedAt: updated(),
});

/** Sponsorlu yerleşimler — her gösterimde "Sponsorlu" etiketi zorunlu; organik sıralamaya karışmaz. */
export const sponsoredPlacements = pgTable("sponsored_placements", {
  id: text("id").primaryKey(),
  placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  surface: text("surface").notNull(),                  // place_page_alt | search_top | list
  startsAt: ts("starts_at").notNull(),
  endsAt: ts("ends_at").notNull(),
  createdAt: created(),
});

/* ───────────────────────────── İŞLETİM ───────────────────────────── */

export const moderationQueue = pgTable("moderation_queue", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),                        // identifier_match | media | review_report | takedown
  refTable: text("ref_table").notNull(),
  refId: text("ref_id").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("open"),     // open | approved | rejected
  decidedBy: text("decided_by"),
  decidedAt: ts("decided_at"),
  createdAt: created(),
}, (t) => [index("moderation_queue_status_idx").on(t.status, t.kind)]);

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  refTable: text("ref_table"),
  refId: text("ref_id"),
  detail: jsonb("detail"),
  at: ts("at").notNull().defaultNow(),
});

/* ── FOTOĞRAF ARŞİVİ ────────────────────────────────────────────────────────
   media_items kaydının dosya ve hak ayrıntısı. Yükleme, deneyimden ve puandan AYRIDIR: bu tablolar puan hesabına girmez,
   ziyaret doğrulaması değildir. Google içeriği buraya yazılmaz. */
export const photoAssets = pgTable("photo_assets", {
  mediaId: text("media_id").primaryKey().references(() => mediaItems.id, { onDelete: "cascade" }),
  placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  reviewId: text("review_id").references(() => reviews.id, { onDelete: "set null" }),
  uploaderId: text("uploader_id").references(() => user.id, { onDelete: "set null" }),
  sha256: text("sha256").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  bytes: integer("bytes").notNull(),
  /** db | s3 */
  storageProvider: text("storage_provider").notNull(),
  /** [{ w, h, key, bytes }] */
  variants: jsonb("variants").$type<Array<{ w: number; h: number; key: string; bytes: number }>>().notNull(),
  /** own | permission | license */
  rightsType: text("rights_type").notNull(),
  rightsStatement: text("rights_statement").notNull(),
  sourceUrl: text("source_url"),
  rejectReason: text("reject_reason"),
  approvedAt: ts("approved_at"),
  approvedBy: text("approved_by"),
  coverCandidate: boolean("cover_candidate").notNull().default(false),
  isCover: boolean("is_cover").notNull().default(false),
  /** Kırpma odağı (CSS object-position) */
  focus: text("focus"),
  createdAt: created(),
}, (t) => [uniqueIndex("photo_assets_place_sha_uq").on(t.placeId, t.sha256), index("photo_assets_review_idx").on(t.reviewId), index("photo_assets_uploader_idx").on(t.uploaderId), index("photo_assets_place_idx").on(t.placeId), uniqueIndex("photo_assets_one_cover_uq").on(t.placeId).where(sql`${t.isCover}`)]);

/** Personel yetkisi: fotoğraf moderasyonu. user.kind puan girdisini belirler, bu tablo yalnız yönetim yetkisini. */
export const staffRoles = pgTable("staff_roles", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  /** moderator | admin */
  role: text("role").notNull(),
  grantedBy: text("granted_by").notNull(),
  grantedAt: created(),
});

/** Yalnız Preview/yerel depolama: Production'da kullanılmaz. */
export const mediaBlobs = pgTable("media_blobs", {
  key: text("key").primaryKey(),
  /** base64 */
  data: text("data").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: created(),
});

/** Silinecek depolama nesneleri: tekrar denenir, sessizce kaybolmaz. Anahtardan başka kişisel veri tutmaz. */
export const mediaCleanup = pgTable("media_cleanup", {
  key: text("key").primaryKey(),
  mediaId: text("media_id"),
  reason: text("reason").notNull(),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  nextAttemptAt: ts("next_attempt_at").notNull().defaultNow(),
  doneAt: ts("done_at"),
  createdAt: created(),
}, (t) => [index("media_cleanup_open_idx").on(t.doneAt, t.nextAttemptAt)]);

/** Günlük hata sayaçları. Yalnız sayı: kullanıcı, adres, sorgu metni tutulmaz. */
export const opsCounters = pgTable("ops_counters", {
  day: text("day").notNull(),
  key: text("key").notNull(),
  n: integer("n").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.day, t.key] })]);
