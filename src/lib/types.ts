/* ==========================================================================
   GİDENLER — DOMAIN MODEL (v2)
   --------------------------------------------------------------------------
   Gidenler bir "review sitesi" değil, bir Experience Network'tür.
   Katmanlar:

     Experience Graph   — kim, nereye, ne zaman gitti, ne yaşadı
     Reputation Graph   — kim güvenilir (popülerlik DEĞİL)
     Expertise Graph    — kim NE KONUDA güvenilir
     Creator Network    — dış otoritesi olan üreticiler
     External Intel     — Google / Tripadvisor / Yandex / Şikayetvar
     Trend Intel        — zaman içinde ne değişti
     Consensus Intel    — görüş birliği mi, bölünme mi
     Trust & Verification — ziyaret doğrulaması, ticari ilişki, şeffaflık

   KİLİTLİ ÜRÜN KURALLARI (mimari bunları korumalı):
     · Gidenler puanı dış kaynakların ortalaması DEĞİLDİR.
     · Puan bir girdi değil, çıktıdır.
     · Abonelik reputation yükseltemez.
     · Sponsorlu deneyim organik gibi gösterilemez.
     · Takipçi sayısı tek başına Gidenler otoritesi üretmez.
     · Regüle kategorilerde platform puan üretmez, hüküm kurmaz.
   ========================================================================== */

export type ID = string;
export type ISODate = string;

/* ══════════════════════════════ KATEGORİ & ŞEMA ══════════════════════════ */

export type ComplianceMode = "standard" | "regulated" | "restricted";

export interface CompliancePolicy {
  mode: ComplianceMode;
  showScores: boolean;
  showAISummary: boolean;
  allowAdvertising: boolean;
  allowBusinessPromotion: boolean;
  freeOwnerResponse: boolean;
  basis?: string;
}

export interface RatingDimensionDef {
  key: string;
  label: string;
  hint?: string;
}

export interface RatingSchema {
  id: ID;
  dimensions: RatingDimensionDef[];
  returnQuestion: string;
  returnLabel: string;
}

export interface Category {
  id: ID;
  slug: string;
  label: string;
  noun: string;
  ratingSchemaId: ID;
  compliance: CompliancePolicy;
  externalProviders: ExternalProvider[];
  /** Uzmanlık grafiği için alt alanlar: "Japon mutfağı", "Fine dining"… */
  facets?: string[];
}

/* ══════════════════════════════ VARLIK & KONUM ═══════════════════════════ */

export interface GeoPoint { lat: number; lng: number }

export interface Location {
  city: string;
  district?: string;
  neighborhood?: string;
  geo?: GeoPoint;
}

export interface Entity {
  id: ID;
  slug: string;
  name: string;
  categoryId: ID;
  isDemo: boolean;
  location?: Location;
  address?: string;
  hours?: string;
  priceLevel?: 1 | 2 | 3 | 4;
  /** Kategori facet'leri: bu mekân hangi alt alanlara giriyor. */
  facets?: string[];
  tags?: string[];
  openedAt?: ISODate;
  business?: BusinessLink;
  experienceTotal?: number;
}

export interface BusinessLink {
  claimed: boolean;
  claimedAt?: ISODate;
  /** Abonelik yalnızca araç satın alır — asla puan ya da sıralama. */
  subscription?: "none" | "panel";
}

/* ══════════════════════════ KİMLİK · İTİBAR · UZMANLIK ═══════════════════ */

export type SocialProvider = "instagram" | "x" | "youtube" | "tiktok";

/**
 * Dış platform kimliği. Takipçi sayısı bir SİNYALDİR, güven değil.
 * `verifiedByGidenler` = biz doğruladık; `providerVerified` = platformun mavi tiki.
 */
export interface SocialIdentity {
  provider: SocialProvider;
  handle: string;
  profileUrl: string;
  followerCount?: number;
  verifiedByGidenler: boolean;
  providerVerified: boolean;
  lastCheckedAt: ISODate;
  status: "ok" | "stale" | "unlinked";
  isDemo: boolean;
}

export type ReputationLevel =
  | "yeni"
  | "katkıda bulunan"
  | "güvenilir"
  | "yerel uzman"
  | "uzman"
  | "çok yüksek uzmanlık";

export type ReputationSignalKey =
  | "contribution"
  | "verified_visits"
  | "experience_quality"
  | "helpful_ratio"
  | "category_expertise"
  | "account_age"
  | "behavior"
  | "external_authority"
  | "disclosure_behavior"
  | "moderation_history";

export interface ReputationSignal {
  key: ReputationSignalKey;
  label: string;
  /** 0–100. Ham puan her yerde gösterilmez; seviye gösterilir. */
  value: number;
  weight: number;
}

/**
 * Genel güven. Dışarıdaki popülerlikle AYNI ŞEY DEĞİLDİR.
 * Kesin formül backend'e aittir; frontend seviyeyi ve sinyalleri gösterir.
 */
export interface Reputation {
  score: number;
  level: ReputationLevel;
  confidence: ConfidenceLevel;
  signals: ReputationSignal[];
}

export type ExpertiseScope = "category" | "facet" | "location" | "facet_location";
export type ExpertiseLevel = "gelişiyor" | "yüksek" | "çok yüksek";

/**
 * Konu bazlı otorite. Bir kullanıcı Japon mutfağında uzman,
 * otelde acemi olabilir. Reputation genel, expertise özeldir.
 */
export interface ExpertiseArea {
  key: string;
  label: string;
  scope: ExpertiseScope;
  score: number;
  level: ExpertiseLevel;
  experienceCount: number;
}

export type UserKind = "user" | "creator";

export interface User {
  id: ID;
  handle: string;
  displayName?: string;
  kind: UserKind;
  bio?: string;
  joinedAt: ISODate;
  homeLocation?: Location;
  reputation: Reputation;
  expertise: ExpertiseArea[];
  /** Yalnızca creator'larda dolu olması beklenir ama zorunlu değil. */
  social: SocialIdentity[];
  /** Trend tahmin isabeti — varsa küçük bir güven sinyali olarak gösterilir. */
  predictions?: PredictionReputation;
  stats: {
    experiences: number;
    verifiedExperiences: number;
    helpfulVotes: number;
    entitiesVisited: number;
    listsCreated: number;
  };
  isDemo: boolean;
}

/* ══════════════════════════ ZİYARET · KANIT · ŞEFFAFLIK ══════════════════ */

export type VerificationMethod =
  | "konum" | "fiş" | "rezervasyon" | "bilet" | "partner" | "sonra" | "yok";

export interface Evidence {
  id: ID;
  type: "fotoğraf" | "belge";
  /** Kanıt yayımlanmaz; yalnızca rozet üretir. */
  isPublic: false;
  addedAt: ISODate;
}

export interface Verification {
  verified: boolean;
  method: VerificationMethod;
  verifiedAt?: ISODate;
  evidence?: Evidence[];
}

/**
 * VISIT ≠ EXPERIENCE.
 * Aynı kullanıcı aynı mekâna birden çok kez gidebilir; her ziyaret ayrı
 * bir kayıttır ve trend sistemi ziyaret zamanına dayanır.
 */
export interface Visit {
  id: ID;
  userId: ID;
  entityId: ID;
  visitedAt: ISODate;
  verification: Verification;
}

/** Deneyimin ticari bağlamı — influencer ekonomisi veri modeline gömülü. */
export type CommercialRelationship =
  | "none" | "invited" | "gifted" | "sponsored" | "employee" | "owner_related" | "unknown";

export interface Disclosure {
  relationship: CommercialRelationship;
  /** Kullanıcıya gösterilecek sakin ifade. */
  label?: string;
  declaredByAuthor: boolean;
}

/* ══════════════════════════════ DENEYİM ══════════════════════════════════ */

export type ExperienceState =
  | "published" | "under_review" | "reported" | "limited" | "removed" | "appealed";

export type ReturnIntent = "evet" | "hayır" | "emin değil";

export interface ExperienceRatings { [dimensionKey: string]: number }

export interface BusinessResponse {
  id: ID;
  experienceId: ID;
  authorLabel: string;
  verifiedBusiness: boolean;
  body: string;
  respondedAt: ISODate;
  state: ExperienceState;
}

export interface Experience {
  id: ID;
  entityId: ID;
  authorId: ID;
  visitId: ID;
  body: string;
  /** Ziyaret zamanı — yazma zamanı değil. Ürünün kalbi. */
  visitedAt: ISODate;
  verification: Verification;
  ratings: ExperienceRatings;
  overall: number;
  returnIntent: ReturnIntent;
  disclosure: Disclosure;
  helpfulVotes: number;
  notHelpfulVotes: number;
  createdAt: ISODate;
  state: ExperienceState;
  response?: BusinessResponse;
}

/** Görüntü modeli: deneyim + yazarı, tek sözleşmede. */
export interface ExperienceWithAuthor extends Experience {
  author: User;
}

/* ══════════════════════════════ LİSTELER ═════════════════════════════════ */

export interface CuratedList {
  id: ID;
  slug: string;
  title: string;
  subtitle?: string;
  authorId: ID;
  entityIds: ID[];
  /** Sıralama gerekçesi — liste bir görüştür, algoritma değil. */
  note?: string;
  updatedAt: ISODate;
  isDemo: boolean;
}

/* ══════════════════════════ DIŞ KAYNAK ZEKÂSI ════════════════════════════ */

export type ExternalProvider =
  | "google" | "tripadvisor" | "yandex" | "sikayetvar" | "booking" | "imdb";

export type ExternalSignalKind = "score" | "complaint";

/**
 * Anlık görüntü — zaman damgalı. İleride "Gidenler düşüşü dış
 * platformlardan önce gördü" çıkarımı bu geçmişten üretilecek.
 */
export interface ExternalSnapshot {
  provider: ExternalProvider;
  capturedAt: ISODate;
  score?: number;
  reviewCount?: number;
  complaintCount?: number;
}

export interface ExternalSource {
  id: ID;
  entityId: ID;
  provider: ExternalProvider;
  label: string;
  kind: ExternalSignalKind;
  /** Kendi doğal ölçeğinde kalır — 10'luk sisteme normalize EDİLMEZ. */
  score?: number;
  scoreScale?: number;
  reviewCount?: number;
  complaintCount?: number;
  resolvedCount?: number;
  url?: string;
  attribution: string;
  storagePolicy?: string;
  lastUpdated: ISODate;
  history?: ExternalSnapshot[];
  isDemo: boolean;
  status: "ok" | "stale" | "unavailable";
  licensingNote?: string;
}

/* ══════════════════════ TREND · CONSENSUS · CONFIDENCE ═══════════════════ */

export type TrendPeriod = "7d" | "30d" | "90d" | "6m" | "1y" | "all";

export interface TimelinePoint {
  period: string;
  score: number;
  experienceCount: number;
}

export interface DimensionTrend {
  key: string;
  delta: number;
  direction: "up" | "down" | "flat";
  /** Yetersiz veride trend iddiası yapılmaz. */
  sufficient: boolean;
}

export interface ThemeSignal {
  key: string;
  label: string;
  count: number;
  negativeCount: number;
  direction: "up" | "down" | "flat";
}

export type ConfidenceLevel = "low" | "medium" | "high";

/* ─────────────────── EXPERIENCE MARKET / TREND LAYER ─────────────────────
   Bir mekân bugünkü puanı değildir; bir zaman serisidir.
   Buradaki kavramlar finans arayüzü taklidi DEĞİL, deneyim verisinin
   zaman boyutunun ürün diline çevrilmiş hâlidir.
   KİLİTLİ: Beklenti katmanı Gidenler puanını DEĞİŞTİRMEZ. Para yoktur.
   ------------------------------------------------------------------------ */

export type Momentum = "strong_up" | "up" | "stable" | "down" | "strong_down";

export interface PeriodChange {
  period: TrendPeriod;
  label: string;
  /** Puan cinsinden değişim (ör. +0,4). */
  delta: number;
  /** Yüzde cinsinden değişim (ör. +4,8). */
  deltaPct: number;
  direction: "up" | "down" | "flat";
  /** Dönem içinde yeterli veri var mı? */
  sufficient: boolean;
}

/** Deneyim hacmi — "işlem hacmi" değil; o dönemde yazılan deneyim sayısı. */
export interface ExperienceVolume {
  period: TrendPeriod;
  label: string;
  count: number;
  changePct: number;
  direction: "up" | "down" | "flat";
}

/**
 * Birçok varlığın toplu deneyim zekâsından üretilen endeks.
 * V2'de demo; mimari ileride gerçek hesaplamayı taşıyacak.
 */
export interface ExperienceIndex {
  id: ID;
  slug: string;
  label: string;
  scope: string;
  /** 0–100 ölçeğinde endeks değeri. */
  value: number;
  deltaPct: number;
  direction: "up" | "down" | "flat";
  memberCount: number;
  updatedAt: ISODate;
  isDemo: boolean;
}

export type ExpectationChoice = "up" | "same" | "down";

/**
 * TOPLULUK BEKLENTİSİ — deneysel zekâ katmanı.
 * Deneyim yazarları puanı OLUŞTURUR; beklenti katılımcıları puanın
 * gelecekteki YÖNÜ hakkında görüş bildirir. İkisi ayrı sistemdir ve
 * beklenti sonuçları Gidenler puanını değiştirmez. Para, bahis, oran yoktur.
 */
export interface CommunityExpectation {
  entityId: ID;
  horizonDays: number;
  currentScore: number;
  communityExpected: number;
  expertExpected: number | null;
  distribution: { up: number; same: number; down: number };
  participantCount: number;
  expertParticipantCount: number;
  isDemo: boolean;
}

/** Kullanıcının tahmin isabeti — kumar değil, bir güven sinyali. */
export interface PredictionReputation {
  totalPredictions: number;
  correctDirection: number;
  accuracy: number;
  streak: number;
  categoryAccuracy: Array<{ label: string; accuracy: number; count: number }>;
}

/**
 * Ortalama aynı olsa bile dağılım farklı olabilir:
 * herkes 8 vermişse "görüş birliği", yarısı 10 yarısı 6 vermişse "bölünmüş".
 */
export type ConsensusLevel = "birlik" | "karışık" | "bölünmüş";

export interface Consensus {
  level: ConsensusLevel;
  /** 0–1. Yüksekse görüşler dağınık. */
  polarization: number;
  /** 1–10 aralığında histogram (10 kova). */
  distribution: number[];
  note: string;
}

export type PerspectiveSegment = "community" | "verified" | "expert";

/** "Kim ne düşünüyor?" — ana skoru öldürmeyen ikinci katman. */
export interface Perspective {
  segment: PerspectiveSegment;
  label: string;
  score: number | null;
  experienceCount: number;
  hint?: string;
}

export interface AISummary {
  entityId: ID;
  basedOnCount: number;
  windowDays: number;
  generatedAt: ISODate;
  lines: string[];
  sourceExperienceIds: ID[];
}

/* ══════════════════════════ TOPIC INTELLIGENCE ═══════════════════════════ */

/**
 * Topic sayfasının TEK sözleşmesi. UI ham deneyimlerden iş mantığı
 * hesaplamaz; backend bu aggregate'i hazır döner.
 */
export interface TopicIntelligence {
  entityId: ID;
  overallScore: number | null;
  scoreTrend: { period: TrendPeriod; delta: number; direction: "up" | "down" | "flat" };
  /** Zaman serisi katmanı. */
  momentum: Momentum;
  periodChanges: PeriodChange[];
  volume: ExperienceVolume;
  expectation: CommunityExpectation | null;
  ratingDimensions: Array<{ key: string; label: string; value: number; trend: DimensionTrend }>;
  returnRate: number;
  experienceCount: number;
  verifiedRatio: number;
  confidence: ConfidenceLevel;
  consensus: Consensus | null;
  perspectives: Perspective[];
  externalSignals: ExternalSource[];
  positiveThemes: ThemeSignal[];
  negativeThemes: ThemeSignal[];
  timeline: TimelinePoint[];
  aiSummary: AISummary | null;
}

export interface TopicView {
  entity: Entity;
  category: Category;
  schema: RatingSchema;
  intelligence: TopicIntelligence;
  expertExperiences: ExperienceWithAuthor[];
  experiences: ExperienceWithAuthor[];
  nearby: Array<{ entity: Entity; category: Category; score: number | null }>;
}

/* ══════════════════════════ CREATOR PROFİLİ ══════════════════════════════ */

export interface CreatorProfileView {
  user: User;
  lists: Array<CuratedList & { entities: Array<{ entity: Entity; score: number | null }> }>;
  experiences: Array<ExperienceWithAuthor & { entity: Entity; category: Category }>;
  topRated: Array<{ entity: Entity; score: number; category: Category }>;
  wouldReturn: Array<{ entity: Entity; category: Category }>;
  /** Uzmanlığın hangi kategorilerde toplandığı. */
  categoryBreakdown: Array<{ label: string; count: number }>;
}

/* ══════════════════════════ İŞLETME PANELİ ═══════════════════════════════ */

export interface BusinessDashboardView {
  entity: Entity;
  category: Category;
  schema: RatingSchema;
  intelligence: TopicIntelligence;
  unanswered: ExperienceWithAuthor[];
  answered: ExperienceWithAuthor[];
  expertSummary: {
    expertCount: number;
    expertScore: number | null;
    communityScore: number | null;
    mostPraised?: string;
    mostCriticized?: string;
    experts: User[];
  };
  last30d: { newExperiences: number; verifiedShare: number; scoreDelta: number };
}

/* ══════════════════════════════ MODERASYON ═══════════════════════════════ */

export interface Report {
  id: ID;
  targetId: ID;
  targetType: "experience" | "entity" | "business_response" | "user";
  reason: string;
  reportedAt: ISODate;
  reporterRole: "kullanıcı" | "işletme" | "kişi" | "otomatik";
}

export interface ModerationDecision {
  id: ID;
  reportId: ID;
  decidedAt: ISODate;
  outcome: "korundu" | "sınırlandı" | "kaldırıldı";
  rationale: string;
}

export interface Appeal {
  id: ID;
  decisionId: ID;
  filedAt: ISODate;
  status: "beklemede" | "kabul" | "ret";
}

export interface AuditLogEntry {
  id: ID;
  at: ISODate;
  actor: "moderatör" | "otomatik" | "sistem";
  action: string;
  targetId: ID;
}

/* ══════════════════════════════ ARAMA ════════════════════════════════════ */

export type SearchResultKind = "entity" | "creator" | "list";

export interface SearchResults {
  entities: Array<{ entity: Entity; category: Category; score: number | null; experienceCount: number; externalTop?: string }>;
  creators: User[];
  lists: Array<CuratedList & { author: User }>;
}

/* ══════════════════════════════════════════════════════════════════════════
   V3 — DECISION INTELLIGENCE
   --------------------------------------------------------------------------
   Experience Graph + Reputation Graph + Expertise Graph + TASTE GRAPH + Time
   = Decision Intelligence.

   KİLİTLİ: Personal Match ≠ Gidenler Score. Puan topluluğun deneyimlerinden
   çıkar; uyum kullanıcı ile mekân arasındaki ilişkidir. İkisi toplanmaz.
   Buradaki hesaplar prototip içindir; production ML varmış gibi davranılmaz.
   ══════════════════════════════════════════════════════════════════════════ */

/* ───────────────────────────── TASTE GRAPH ─────────────────────────────── */

export type TasteLevel = "çok yüksek" | "yüksek" | "orta" | "düşük";

/** Kullanıcı için bir boyutun ÖNEMİ (0–100). Puan değil, öncelik. */
export interface TasteDimension {
  key: string;          // rating dimension key: taste | value | service | atmosphere | quiet | speed …
  label: string;
  weight: number;       // 0–100
}

export interface TastePreference {
  key: string;
  label: string;
  level: TasteLevel;
}

export interface TasteProfile {
  userId: ID;
  dimensions: TasteDimension[];
  cuisinePreferences: TastePreference[];
  categoryPreferences: TastePreference[];
  locationPreferences: string[];
  priceSensitivity: TasteLevel;
  /** "Buna tahammülü düşük" — creator profillerinde görünür. */
  lowTolerance: string[];
  visibility: "private" | "public";
  confidence: ConfidenceLevel;
  basedOnExperiences: number;
  updatedAt: ISODate;
  isDemo: boolean;
}

/** 3 benzer kullanıcı ile 500 benzer kullanıcı aynı güven değildir. */
export interface TasteSimilarity {
  score: number;        // 0–1
  sampleSize: number;
  confidence: ConfidenceLevel;
}

/* ─────────────────────────── PERSONAL MATCH ────────────────────────────── */

export type DecisionContextKey = "default" | "date" | "friends" | "business" | "family" | "solo" | "quick";

export interface DecisionContext {
  key: DecisionContextKey;
  label: string;
  /** Geçici öncelik değişimi; kalıcı profili değiştirmez. */
  overrides?: Partial<Record<string, number>>;
}

export interface MatchFactor {
  key: string;
  label: string;
  /** -1 … +1 — uyumu ne yönde etkiledi. */
  effect: number;
  evidence: string;     // "Lezzet 8,9 · senin en önemli kriterin"
}

export interface PersonalMatch {
  entityId: ID;
  userId: ID;
  context: DecisionContextKey;
  /** 0–100 */
  score: number;
  factors: MatchFactor[];
  similarity: TasteSimilarity;
  confidence: ConfidenceLevel;
  isDemo: boolean;
}

/** "Sana benzeyenler" perspektifi — topluluğun içinden kişisel kohort. */
export interface SimilarUsersPerspective {
  entityId: ID;
  score: number | null;
  sampleSize: number;
  returnRate: number;
  confidence: ConfidenceLevel;
  isDemo: boolean;
}

/* ───────────────────────────── DECISION ────────────────────────────────── */

export type DecisionVerdict =
  | "Kesinlikle gidilir" | "Gidilir" | "Sana bağlı" | "Biraz bekle" | "Şimdilik pas geç";

export interface DecisionReason {
  text: string;
  /** Kaynak göstergesi: "61 deneyimde bekleme konusu" */
  source?: string;
  kind: "taste" | "community" | "trend" | "expert" | "similar" | "verified";
}

export interface DecisionWarning {
  text: string;
  source?: string;
  severity: "low" | "medium" | "high";
}

export interface Decision {
  entityId: ID;
  context: DecisionContextKey;
  verdict: DecisionVerdict;
  personalMatch: number | null;
  reasons: DecisionReason[];
  warnings: DecisionWarning[];
  bestFor: string[];
  avoidIf: string[];
  confidence: ConfidenceLevel;
  timeContext?: string;
  isDemo: boolean;
}

/** "Şimdi gitmek için iyi zaman mı?" — trendin tüketici diline çevrilmiş hâli. */
export interface TimingVerdict {
  entityId: ID;
  answer: "Evet" | "Fark etmez" | "Biraz bekle";
  window: string;                       // "Son 30 gün"
  signals: Array<{ label: string; direction: "up" | "down" | "flat" }>;
  explanation: string;
  isDemo: boolean;
}

/* ─────────────────────────── EVENTS · NE OLDU ──────────────────────────── */

export type EntityEventType =
  | "chef_change" | "ownership_change" | "renovation" | "menu_change" | "price_change"
  | "service_change" | "relocation" | "opening" | "closure" | "award" | "incident" | "unknown";

export interface EntityEvent {
  id: ID;
  entityId: ID;
  type: EntityEventType;
  title: string;
  description: string;
  occurredAt: ISODate;
  /** Olayın gerçekleştiğine dair güven — nedensellik iddiası DEĞİL. */
  confidence: ConfidenceLevel;
  /** Olayı izleyen sinyal değişimleri (korelasyon; nedensellik kurulmaz). */
  relatedSignals: Array<{ period: string; label: string; direction: "up" | "down" | "flat" }>;
  sourceType: "işletme beyanı" | "deneyimlerden çıkarım" | "kamuya açık kaynak" | "bilinmiyor";
  isDemo: boolean;
}

/* ─────────────────────────── ASK GİDENLER ──────────────────────────────── */

export interface AskQuery {
  text: string;
  district?: string;
  facet?: string;
  quiet?: boolean;
  budget?: 1 | 2 | 3 | 4;
  party?: number;
  context: DecisionContextKey;
  priorities: string[];
}

export interface AskResultItem {
  entityId: ID;
  match: number;
  reasons: DecisionReason[];
  warning?: DecisionWarning;
}

export interface AskResult {
  query: AskQuery;
  understood: string[];      // "Kadıköy", "sessiz", "4 kişi"
  items: AskResultItem[];
  sources: string[];         // "34 doğrulanmış deneyim · son 90 gün"
  isDemo: boolean;
}

/* ───────────────────────────── COMPARE ─────────────────────────────────── */

export interface ComparisonRow {
  key: string;
  label: string;
  values: Array<number | string | null>;
  /** Daha yüksek daha iyi mi? (fiyat için false) */
  higherIsBetter: boolean;
  format: "score" | "pct" | "text" | "delta";
}

export interface Comparison {
  entityIds: ID[];
  winnerId: ID;
  headline: string;
  reasons: DecisionReason[];
  warnings: DecisionWarning[];
  byContext: Array<{ label: string; entityId: ID }>;
  rows: ComparisonRow[];
  isDemo: boolean;
}

/* ───────────────────────────── PASSPORT ────────────────────────────────── */

export interface PassportPeriod {
  key: string;             // "2026" | "2026-08" | "yaz-2026" | "kadikoy"
  label: string;           // "2026 Gidenler'im"
  entityCount: number;
  districtCount: number;
  cuisineCount: number;
  topFacets: Array<{ label: string; count: number }>;
  topDistrict: string;
  returnRate: number;
  verifiedVisits: number;
}

export interface Passport {
  userId: ID;
  handle: string;
  shareable: boolean;      // opt-in
  periods: PassportPeriod[];
  isDemo: boolean;
}

/* ───────────────────────── BUSINESS INTELLIGENCE ───────────────────────── */

export interface BusinessRootCause {
  dimensionKey: string;
  label: string;
  delta: number;
  theme?: string;
  themeChangePct?: number;
  note: string;
}

export interface BusinessRecommendation {
  title: string;
  body: string;
  impactArea: string;
  source: string;          // "Son 60 günde 47 servis eleştirisi"
  isDemo: boolean;
}

export interface BusinessBenchmark {
  label: string;
  you: number;
  peers: number;
  format: "score" | "pct";
  peerGroup: string;
}

export interface BusinessAlert {
  id: ID;
  title: string;
  detail: string;
  severity: "info" | "watch" | "action";
  at: ISODate;
}

/* ══════════════════════════════════════════════════════════════════════════
   V4 — DECISION → VISIT → EXPERIENCE
   --------------------------------------------------------------------------
   Karar → Git → Yaşa → Yaz → Gidenler daha iyi bilsin → daha iyi karar.
   Kullanıcı-mekân ilişkisi, hızlı tepki, grup kararı, harita, bildirim.
   Prototipte kalıcılık localStorage; sözleşmeler backend'e taşınacak şekilde.
   ══════════════════════════════════════════════════════════════════════════ */

/* ───────────────────── KULLANICI · MEKÂN İLİŞKİSİ ──────────────────────── */

/** Kaydet ≠ Gitmek istiyorum ≠ Gittim ≠ Deneyim yazdım. Ayrı niyetler. */
export type UserEntityState = "none" | "saved" | "want_to_go" | "visited" | "experienced";

export interface UserEntityRelationship {
  entityId: ID;
  state: UserEntityState;
  /** İlişki hangi yüzeyden kuruldu: topic | ask | compare | now | map | list */
  via?: string;
  listIds: ID[];
  updatedAt: ISODate;
  visitedAt?: ISODate;
}

/** "Gittim" — tek başına deneyim değildir; zayıf ama gerçek bir sinyal. */
export interface VisitSignal {
  id: ID;
  entityId: ID;
  userId: ID;
  visitedAt: ISODate;
  source: "self_report" | "location" | "receipt" | "reservation";
}

/** Hafif tepki — yazılı deneyimle aynı şey değildir; veri modelinde ayrı. */
export type ReactionMood = "çok iyi" | "iyi" | "ortalama" | "kötü";

export interface QuickReaction {
  id: ID;
  entityId: ID;
  userId: ID;
  mood: ReactionMood;
  returnIntent: ReturnIntent;
  note?: string;
  createdAt: ISODate;
  /** Detaylı deneyime dönüştü mü? */
  upgradedToExperienceId?: ID;
}

/** Katkı merdiveni — ağırlık backend'de; mimari sırayı destekler. */
export type ContributionKind = "VisitSignal" | "QuickReaction" | "Experience" | "VerifiedExperience" | "ExpertExperience";

export interface PersonalList {
  id: ID;
  title: string;
  entityIds: ID[];
  createdAt: ISODate;
  isDefault?: boolean;
}

/* ─────────────────────────── TASTE · KAYNAK ────────────────────────────── */

export type TasteSource = "explicit" | "inferred";

/** Kullanıcının kendi düzenlemeleri — çıkarımın üstüne yazar, kalıcı profili bozmaz. */
export interface TasteEdits {
  dimensions: Record<string, number>;
  cuisines: Record<string, TasteLevel>;
  dislikes: string[];   // "kalabalık", "gürültü"
  updatedAt?: ISODate;
}

/* ───────────────────────── BİRLİKTE NEREYE? ────────────────────────────── */

export interface GroupMember {
  id: ID;
  name: string;
  isYou?: boolean;
  tasteUserId: ID;
  budget?: 1 | 2 | 3 | 4;
  needsVegetarian?: boolean;
  district?: string;
  note?: string;
}

export interface GroupPreference {
  label: string;      // "3 kişi Japon mutfağı seviyor"
  count: number;
  total: number;
}

export type GroupVoteChoice = "olur" | "farketmez" | "istemiyorum";

export interface GroupVote {
  memberId: ID;
  entityId: ID;
  choice: GroupVoteChoice;
}

export interface GroupCandidate {
  entityId: ID;
  groupScore: number;             // 0–100
  memberMatches: Array<{ memberId: ID; score: number }>;
  reasons: DecisionReason[];
  warnings: DecisionWarning[];
}

export interface GroupDecision {
  groupId: ID;
  candidates: GroupCandidate[];
  preferences: GroupPreference[];
  chosenEntityId?: ID;
  isDemo: boolean;
}

export interface Group {
  id: ID;
  title: string;
  question: string;
  context: DecisionContextKey;
  when?: string;
  district?: string;
  members: GroupMember[];
  createdAt: ISODate;
  isDemo: boolean;
}

/* ─────────────────────────── HARİTADA GİDENLER ─────────────────────────── */

export type MapFilter = "sana_gore" | "en_iyi" | "yukselen" | "uzman" | "fp" | "sessiz" | "date" | "aile";

export interface MapResult {
  entityId: ID;
  lat: number;
  lng: number;
  score: number | null;
  direction: "up" | "down" | "flat";
  match: number | null;
  insight: string;
  rank: number;
}

/* ───────────────────────────── BİLDİRİM ────────────────────────────────── */

export type NotificationKind = "want_to_go_rising" | "saved_complaints_up" | "visited_write_experience" | "went_yet";

export interface NotificationEvent {
  id: ID;
  kind: NotificationKind;
  entityId: ID;
  title: string;
  body: string;
  at: ISODate;
  basedOn: UserEntityState;
}

/* ───────────────────────────── PROVENANCE ──────────────────────────────── */

export interface Provenance {
  sourceCount: number;
  verifiedCount: number;
  timeWindow: string;
  confidence: ConfidenceLevel;
  lastUpdated: ISODate;
  derivedFrom: string[];
}
