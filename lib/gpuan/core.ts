import { addressSimilarity, branchDiff, distanceM, houseNoConflict, nameSimilarity } from "@/lib/match/score";

const TRF: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
/** Türkçe harfleri sadeleştirip boşluk ve noktalamayı atar ("Ataşehir" → "atasehir"). */
const fold = (x: string) => x.toLocaleLowerCase("tr").split("").map((c) => TRF[c] ?? c).join("").replace(/[^a-z0-9]+/g, "");

/* ──────────────────────────────────────────────────────────────────────────
   GOOGLE PUAN TABLOSU — çekirdek kurallar (saf; ağ, dosya ve veritabanı yok).
   Akış: venues.json → Excel satırları → kaynak adaptörü (değiştirilebilir) → Excel → doğrulama → veritabanı.
   · Kaynak adaptörü yalnız "bu place ID'nin sayfasında ne görünüyor" sorusunu yanıtlar (RatingSource).
     Görüntüleme katmanı (site) kaynağı bilmez; yalnız veritabanındaki doğrulanmış satırları okur.
   · Başarısız denemede puan SİLİNMEZ ve SIFIRLANMAZ; önceki doğrulanmış değer kalır, satır hata olarak işaretlenir.
   · Google puanı (5 üzerinden) Gidenler puanından (10 üzerinden) tamamen ayrıdır; hiçbir hesapta karışmaz.
   ────────────────────────────────────────────────────────────────────────── */

export const COLUMNS = [
  ["slug", "Gidenler ID", 34], ["name", "Mekân adı", 30], ["category", "Kategori", 11], ["cuisine", "Mutfak türü", 24],
  ["district", "İlçe", 13], ["address", "Adres", 44], ["placeId", "Google Place ID", 30], ["mapsUrl", "Google Maps URL", 40],
  ["rating", "Google puanı (5 üzerinden)", 12], ["reviews", "Google değerlendirme sayısı", 13], ["checkedAt", "Son kontrol tarihi", 18],
  ["source", "Veri kaynağı", 26], ["confidence", "Eşleşme güveni", 15], ["status", "Güncelleme durumu", 18], ["error", "Hata açıklaması", 44],
  ["profileUrl", "Gidenler profil bağlantısı", 44],
  ["attemptAt", "Son deneme tarihi", 18], ["seenName", "Google'da görünen ad", 28], ["seenAddress", "Google'da görünen adres", 40],
  ["prevRating", "Önceki puan", 10], ["prevReviews", "Önceki değerlendirme sayısı", 12], ["record", "Kayıt durumu", 12],
  ["seenCategory", "Google'daki tür", 22],
  ["view", "Google görünümü", 12], ["distance", "Konum farkı (m)", 10], ["nameSim", "Ad benzerliği", 10],
  ["decision", "Yönetici kararı", 16], ["finalState", "Nihai durum", 28], ["finalReason", "Gerekçe", 60],
] as const;
export type ColKey = (typeof COLUMNS)[number][0];
export const HEADERS = COLUMNS.map((c) => c[1]);
/** Sonradan eklenen sütunlar: eski dosyada yoksa boş okunur (dosya reddedilmez). */
export const OPTIONAL_HEADERS: ReadonlySet<string> = new Set(["Google'daki tür", "Google görünümü", "Konum farkı (m)", "Ad benzerliği", "Yönetici kararı", "Nihai durum", "Gerekçe"]);
/** Excel'e yalnız bilgi için yazılan, okunurken yok sayılan sütunlar (her yazımda yeniden hesaplanır). */
export const DERIVED: ReadonlySet<string> = new Set(["decision", "finalState", "finalReason"]);

export const CONFIDENCE = { confirmed: "Onaylı", auto: "Otomatik", pending: "Onay bekliyor", none: "Eşleşme yok", rejected: "Reddedildi" } as const;
export type Confidence = (typeof CONFIDENCE)[keyof typeof CONFIDENCE];
/** Siteye yalnız bu güvenle eşleşmiş satırların puanı aktarılır. */
export const IMPORTABLE_CONFIDENCE: ReadonlySet<string> = new Set([CONFIDENCE.confirmed, CONFIDENCE.auto]);

export const STATUS = {
  fresh: "Güncel", same: "Değişmedi", waiting: "Bekliyor", error: "Hata", blocked: "Engellendi", branch: "Şube uyuşmazlığı",
  noMatch: "Eşleşme yok", deferred: "Ertelendi", removed: "Kaldırıldı", isNew: "Yeni", typeMismatch: "Tür uyuşmazlığı",
  typeSuspect: "Tür şüphesi", typeUnknown: "Tür doğrulanamadı", closed: "Kalıcı kapalı",
} as const;
export type Status = (typeof STATUS)[keyof typeof STATUS];
export const OK_STATUS: ReadonlySet<string> = new Set([STATUS.fresh, STATUS.same]);

export interface Row {
  slug: string; name: string; category: string; cuisine: string; district: string; address: string;
  placeId: string; mapsUrl: string; rating: number | null; reviews: number | null; checkedAt: string;
  source: string; confidence: Confidence; status: Status; error: string; profileUrl: string;
  attemptAt: string; seenName: string; seenAddress: string; prevRating: number | null; prevReviews: number | null;
  record: "Aktif" | "Kaldırıldı";
  seenCategory: string;
  /** "Tam" | "Sınırlı" — Google'ın sayfayı sınırlı görünümde vermesi (değerlendirme sayısı o zaman okunmaz) */
  view: string; distance: number | null; nameSim: number | null;
  /** türetilmiş, bilgi amaçlı: yönetici kararı ve nihai durum (okunurken yok sayılır) */
  decision: string; finalState: string; finalReason: string;
}

/** Yönetici kararı (veritabanında, denetim kaydıyla). Excel'deki "Yönetici kararı" sütunu yalnız gösterimdir; aktarım kararı veritabanından okur. */
export interface Decision { slug: string; placeId: string; decision: "onay" | "ret"; note: string; actor: string; at: string }

export interface Venue { slug: string; name: string; categoryId: string; kind?: string | null; cuisine?: string[] | null; district?: string | null; address?: string | null; lat: number; lng: number }
export interface GoogleId { externalId: string; status: string }

const CATEGORY: Record<string, string> = { "cat.restaurant": "Restoran", "cat.cafe": "Kafe", "cat.bar": "Bar" };
export const SITE = "https://www.gidenler.com";
export const mapsUrlFor = (name: string, placeId: string) =>
  placeId ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(placeId)}` : "";
const PLACE_ID = /^[A-Za-z0-9_-]{16,300}$/;
export const validPlaceId = (s: string) => PLACE_ID.test(s);

/** Mevcut doğrulama kayıtlarından tek place ID seçimi: onaylı > otomatik > onay bekliyor. Reddedilmiş hiçbir zaman kullanılmaz.
    Aynı mekânda iki farklı onaylı kimlik varsa (şube karışıklığı) hiçbiri seçilmez. */
export function pickGoogleId(ids: GoogleId[]): { placeId: string; confidence: Confidence } {
  for (const [st, conf] of [["confirmed", CONFIDENCE.confirmed], ["auto", CONFIDENCE.auto], ["pending", CONFIDENCE.pending]] as const) {
    const xs = [...new Set(ids.filter((i) => i.status === st && validPlaceId(i.externalId)).map((i) => i.externalId))];
    if (xs.length === 1) return { placeId: xs[0], confidence: conf };
    if (xs.length > 1) return { placeId: "", confidence: CONFIDENCE.pending };
  }
  return { placeId: "", confidence: ids.some((i) => i.status === "rejected") ? CONFIDENCE.rejected : CONFIDENCE.none };
}

export function baseRow(v: Venue, g: { placeId: string; confidence: Confidence }): Row {
  return {
    slug: v.slug, name: v.name, category: CATEGORY[v.categoryId] ?? v.categoryId, cuisine: [v.kind, ...(v.cuisine ?? [])].filter(Boolean).join(" · "),
    district: v.district ?? "", address: v.address ?? "", placeId: g.placeId, mapsUrl: mapsUrlFor(v.name, g.placeId),
    rating: null, reviews: null, checkedAt: "", source: "", confidence: g.confidence,
    status: g.placeId ? STATUS.waiting : STATUS.noMatch, error: g.placeId ? "" : g.confidence === CONFIDENCE.rejected ? "Google eşleşmesi reddedilmiş" : "Doğrulanmış Google eşleşmesi yok",
    profileUrl: `${SITE}/mekan/${v.slug}/`, attemptAt: "", seenName: "", seenAddress: "", prevRating: null, prevReviews: null, record: "Aktif", seenCategory: "",
    view: "", distance: null, nameSim: null, decision: "", finalState: "", finalReason: "",
  };
}

/* ── Liste karşılaştırma: yeni mekân satır olur, silinen işaretlenir (silinmez), değişen bilgi güncellenir ── */
export interface ReconcileResult { rows: Row[]; added: string[]; removed: string[]; changed: string[] }
export function reconcile(prev: Row[], venues: Venue[], ids: Map<string, GoogleId[]>): ReconcileResult {
  const old = new Map(prev.map((r) => [r.slug, r]));
  const now = new Set(venues.map((v) => v.slug));
  const added: string[] = [], removed: string[] = [], changed: string[] = [];
  const rows: Row[] = venues.map((v) => {
    const g = ids.has(v.slug) ? pickGoogleId(ids.get(v.slug)!) : null;
    const o = old.get(v.slug);
    if (!o) { added.push(v.slug); const r = baseRow(v, g ?? { placeId: "", confidence: CONFIDENCE.none }); if (r.placeId) r.status = STATUS.isNew; return r; }
    const fresh = baseRow(v, g ?? { placeId: o.placeId, confidence: o.confidence });
    const migrated = o.status === STATUS.error && /kalıcı olarak kapalı/i.test(o.error) ? { status: STATUS.closed } : {};
    const keep: Row = { ...fresh, ...o, ...migrated, name: fresh.name, category: fresh.category, cuisine: fresh.cuisine, district: fresh.district, address: fresh.address, profileUrl: fresh.profileUrl, record: "Aktif" };
    if (o.name !== fresh.name || o.address !== fresh.address) changed.push(v.slug);
    if (fresh.placeId !== o.placeId || fresh.confidence !== o.confidence) {
      /* place ID değiştiyse eski puan başka bir yere ait olabilir: puan aktarılmaz, yeniden kontrol beklenir */
      Object.assign(keep, { placeId: fresh.placeId, confidence: fresh.confidence, mapsUrl: fresh.mapsUrl });
      if (fresh.placeId !== o.placeId) Object.assign(keep, { rating: null, reviews: null, checkedAt: "", prevRating: o.rating, prevReviews: o.reviews, status: fresh.status, error: fresh.placeId ? "Place ID değişti; yeniden kontrol bekliyor" : fresh.error });
    }
    if (keep.name !== o.name || keep.address !== o.address) keep.mapsUrl = mapsUrlFor(keep.name, keep.placeId);
    return keep;
  });
  for (const o of prev) if (!now.has(o.slug)) { removed.push(o.slug); rows.push({ ...o, record: "Kaldırıldı", status: STATUS.removed, error: "Mekân Gidenler listesinde artık yok" }); }
  return { rows, added, removed, changed };
}

/* ── Kaynak adaptörü sözleşmesi ── */
export interface Observation { name: string; address: string; rating: number | null; reviews: number | null; lat?: number | null; lng?: number | null; closed?: boolean; category?: string; /** Google sayfayı sınırlı görünümde verdi */ limited?: boolean }
export type SourceResult =
  | { kind: "ok"; seen: Observation }
  | { kind: "blocked"; reason: string }     // CAPTCHA, olağandışı trafik, giriş zorunluluğu — aşılmaz
  | { kind: "not_found"; reason: string }
  | { kind: "error"; reason: string };
export interface RatingSource { id: string; label: string; fetch(target: { placeId: string; name: string; mapsUrl: string }): Promise<SourceResult>; close?(): Promise<void> }

/* ── Doğru mekân / doğru şube kontrolü ── */
export interface Consistency { ok: boolean; reason: string; name: number; distanceM: number | null; address: number | null }
export function checkConsistency(v: Pick<Venue, "name" | "address" | "lat" | "lng"> & { district?: string | null }, seen: Observation): Consistency {
  const name = nameSimilarity(v.name, seen.name);
  const dist = seen.lat != null && seen.lng != null && Number.isFinite(seen.lat) && Number.isFinite(seen.lng) ? Math.round(distanceM(v, { lat: seen.lat, lng: seen.lng })) : null;
  const addr = addressSimilarity(v.address, seen.address);
  const houseClash = houseNoConflict(v.address, seen.address);
  /* mekânın kendi ilçesinin adı ("Alaçatı Balıkçısı Ataşehir") şube eki sayılmaz */
  const own = new Set([v.district, ...(v.address ?? "").split(/[,/]/)].map((x) => fold(x ?? "")).filter(Boolean));
  const branch = branchDiff(v.name, seen.name).filter((w) => !own.has(fold(w)));
  const r = (ok: boolean, reason: string): Consistency => ({ ok, reason, name: +name.toFixed(2), distanceM: dist, address: addr == null ? null : +addr.toFixed(2) });
  if (!seen.name) return r(false, "Sayfada mekân adı okunamadı");
  /* 1 · konum biliniyorsa asıl şube kanıtı konumdur */
  if (dist != null) {
    if (dist > 400) return r(false, `Konum ${dist} m uzakta (başka şube olabilir)`);
    if (dist > 150 && (branch.length || name < 0.7)) return r(false, `Konum ${dist} m uzakta ve ad farklı${branch.length ? ` (${branch.join(", ")})` : ""}`);
    if (name < 0.4 && (addr == null || addr < 0.5)) return r(false, `Ad tutmuyor (benzerlik ${name.toFixed(2)})`);
    return r(true, "");
  }
  /* 2 · konum yoksa adres: sokak/cadde örtüşmesi ve kapı numarası çelişmemeli */
  const addrOk = addr != null && addr >= 0.5 && !houseClash;
  if (houseClash) return r(false, "Kapı numarası farklı (başka şube olabilir)");
  if (addrOk && name >= 0.4) return r(true, "");
  if (!addrOk && branch.length) return r(false, `Adres doğrulanamadı ve ad farklı şubeyi gösteriyor: ${branch.join(", ")}`);
  if (!addrOk && name < 0.9) return r(false, "Konum yok; adres ve ad birlikte doğrulanamadı");
  if (name < 0.55) return r(false, `Ad tutmuyor (benzerlik ${name.toFixed(2)})`);
  return r(true, "");
}

/* ── Tür kontrolü: Google'da yeme-içme dışı bir yer (otel, cami, mağaza…) olarak kayıtlıysa eşleşme şüphelidir ── */
const FOOD = /restaurant|restoran|lokanta|caf[eé]|kafe|coffee|kahve|bar\b|pub|bistro|bakery|f[ıi]r[ıi]n|pastry|pastane|dessert|tatl[ıi]|kebab|kebap|meyhane|tavern|diner|food|grill|steak|pizza|burger|sushi|patisserie|tea house|çay|breakfast|kahvalt|wine|winery|brewery|ice cream|dondurma|baklava|börek|pide|döner|doner|köfte|kofte|seafood|balık|fish|buffet|büfe|eatery|canteen|cafeteria/i;
const NON_FOOD = /hotel|otel|hostel|motel|guest ?house|pansiyon|apartment|lodging|bed (&|and) breakfast|mosque|cami|church|kilise|museum|müze|\bpark\b|school|okul|university|üniversite|hospital|hastane|office|ofis|real estate|emlak|car (dealer|rental|repair)|gas station|pharmacy|eczane|\bbank\b|supermarket|market\b|grocery|clothing|giyim|shopping mall|avm|gym|spor salonu|beauty|kuaför|barber|community center|municipal|belediye binası|administration/i;
export function typeMismatch(category: string | undefined | null): string | null {
  const c = (category ?? "").trim();
  if (!c || FOOD.test(c)) return null;
  return NON_FOOD.test(c) ? `Google'da "${c.slice(0, 60)}" olarak kayıtlı; yeme-içme yeri değil` : null;
}
/* Konaklama adı: Google'daki ad otel/pansiyon/kamp gösteriyor ama Gidenler'deki ad göstermiyorsa (ör. "… Butik Otel Cafe & Restaurant")
   puan büyük olasılıkla tesisin tamamına aittir. Yeme-içme dışı ya da karışık tür (düğün salonu, kasap, aşevi) da elle onaya kalır. */
const LODGING = /\b(hotel|otel|hostel|motel|pansiyon|suites?|resort|kamp|camp|apart)\b/i;
const SUSPECT_CAT = /wedding|banquet|event venue|düğün|soup kitchen|aşevi|butcher|kasap|catering|social club|lodging|camp/i;
const fw = (x: string) => x.toLocaleLowerCase("tr");
export type TypeVerdict = { status: typeof STATUS.typeMismatch | typeof STATUS.typeSuspect | typeof STATUS.typeUnknown; why: string } | null;
export function typeCheck(seen: Pick<Observation, "name" | "category">, venueName: string): TypeVerdict {
  const tm = typeMismatch(seen.category);
  if (tm) return { status: STATUS.typeMismatch, why: tm };
  const lodge = fw(seen.name ?? "").match(LODGING);
  if (lodge && !LODGING.test(fw(venueName))) return { status: STATUS.typeSuspect, why: `Google'daki ad bir konaklama tesisini gösteriyor ("${lodge[0]}"); puan tesisin tamamına ait olabilir` };
  const c = (seen.category ?? "").trim();
  if (c && !FOOD.test(c) && SUSPECT_CAT.test(c)) return { status: STATUS.typeSuspect, why: `Google'daki tür "${c.slice(0, 50)}"; yeme-içme yeri olduğu elle doğrulanmalı` };
  if (!c) return { status: STATUS.typeUnknown, why: "Google'daki işletme türü okunamadı; türün boş gelmesi eşleşmenin doğru olduğu anlamına gelmez, elle doğrulanmalı" };
  return null;
}

/* ── Bir denemenin satıra uygulanması ── */
export const NO_COUNT = "Değerlendirme sayısı herkese açık sayfada görünmüyor; puan sıralamaya girmez";
export function validRating(x: unknown): x is number { return typeof x === "number" && Number.isFinite(x) && x >= 1 && x <= 5; }
export function validCount(x: unknown): x is number { return typeof x === "number" && Number.isInteger(x) && x >= 0 && x < 10_000_000; }

export function applyResult(row: Row, v: Venue | undefined, res: SourceResult, at: string, source: RatingSource): Row {
  const r: Row = { ...row, attemptAt: at };
  const failWith = (status: Status, error: string) => ({ ...r, status, error }); // puan, sayı ve son kontrol tarihi OLDUĞU GİBİ kalır
  if (res.kind === "blocked") return failWith(STATUS.blocked, `Erişim engeli: ${res.reason}`);
  if (res.kind === "not_found") return failWith(STATUS.error, res.reason);
  if (res.kind === "error") return failWith(STATUS.error, res.reason);
  const s = res.seen;
  const c = v ? checkConsistency(v, s) : { ok: false, reason: "Mekân listede yok", name: 0, distanceM: null, address: null } as Consistency;
  Object.assign(r, { seenName: s.name.slice(0, 200), seenAddress: s.address.slice(0, 300), seenCategory: (s.category ?? "").slice(0, 80),
    view: s.limited ? "Sınırlı" : "Tam", distance: c.distanceM, nameSim: c.name });
  if (!c.ok) return failWith(STATUS.branch, c.reason);
  if (s.closed) return failWith(STATUS.closed, "Google'da kalıcı olarak kapalı görünüyor; puan aktarılmadı");
  const tv = typeCheck(s, v?.name ?? row.name);
  if (tv?.status === STATUS.typeMismatch) return failWith(STATUS.typeMismatch, tv.why);
  if (!validRating(s.rating)) return failWith(STATUS.error, "Sayfada geçerli puan yok");
  /* Değerlendirme sayısı yalnız TAM görünümde okunur. Sınırlı görünümde Google sayıyı göstermez; sayfadaki başka bir sayı
     (ör. "(6)") sayı sanılabilir — 6.764 değerlendirmeli mekânın 6 okunması gibi. Uydurulmaz, boş kalır. */
  const reviews = !s.limited && validCount(s.reviews) ? s.reviews : null;
  const same = row.rating === s.rating && row.reviews === reviews;
  const read: Row = {
    ...r, prevRating: same ? row.prevRating : row.rating, prevReviews: same ? row.prevReviews : row.reviews,
    rating: s.rating, reviews, checkedAt: at, source: source.label, status: same ? STATUS.same : STATUS.fresh,
    error: reviews == null ? NO_COUNT : "",
  };
  /* tür şüphesi / türü okunamayan: puan kaydedilir ama yönetici onayı olmadan siteye aktarılmaz */
  return tv ? { ...read, status: tv.status, error: tv.why } : read;
}

/** Ağsız yeniden sınıflandırma: kayıtlı gözlem (Google'da görünen ad/tür, görünüm) bugünkü kurallarla yeniden değerlendirilir.
    Görünümü bilinmeyen eski okumalar SINIRLI sayılır (GitHub sunucularından yapılan bütün okumalar sınırlı görünümdeydi);
    o okumalardaki değerlendirme sayısı güvenilmez olduğu için boşaltılır. Puan uydurulmaz, yalnız durum ve gerekçe değişir. */
export function reclassify(r: Row, v?: Venue): Row {
  if (r.record !== "Aktif" || !r.placeId) return r;
  const x: Row = { ...r };
  if (x.status === STATUS.error && /kalıcı olarak kapalı/i.test(x.error)) x.status = STATUS.closed;
  if (x.status === STATUS.fresh || x.status === STATUS.same || x.status === STATUS.typeSuspect || x.status === STATUS.typeUnknown) {
    if (x.view !== "Tam") { x.view = "Sınırlı"; if (x.reviews != null) { x.prevReviews = x.reviews; x.reviews = null; } }
    const tv = typeCheck({ name: x.seenName, category: x.seenCategory }, v?.name ?? x.name);
    if (tv?.status === STATUS.typeMismatch) { x.status = STATUS.typeMismatch; x.error = tv.why; }
    else if (tv) { x.status = tv.status; x.error = tv.why; }
    else { x.status = x.status === STATUS.typeSuspect || x.status === STATUS.typeUnknown ? STATUS.fresh : x.status; x.error = x.reviews == null ? NO_COUNT : ""; }
  }
  return x;
}

/** Satır verilen Türkiye gününde denendi mi (deneme zamanı UTC ISO olarak saklanır). */
export const attemptedOn = (r: Pick<Row, "attemptAt">, day: string) => !!r.attemptAt && !Number.isNaN(Date.parse(r.attemptAt)) && trDay(new Date(r.attemptAt)) === day;
/** Bugün denenecek satırlar: aktif, place ID'li; en eski kontrol önce. Kesinti sonrası aynı gün denenmiş satır atlanır. */
export function dueRows(rows: Row[], today: string, max: number, force = false): Row[] {
  return rows.filter((r) => r.record === "Aktif" && r.placeId && r.confidence !== CONFIDENCE.rejected && (force || !attemptedOn(r, today)))
    /* en uzun süredir denenmeyen önce (hiç denenmemiş en başta): sürekli hata veren satır diğerlerinin sırasını kapmaz */
    .sort((a, b) => (a.attemptAt || "").localeCompare(b.attemptAt || "") || a.slug.localeCompare(b.slug)).slice(0, max);
}

export interface Summary { total: number; active: number; removed: number; withPlaceId: number; byConfidence: Record<string, number>; byStatus: Record<string, number>; withRating: number; importable: number; byCategory: Record<string, number> }
export function summarize(rows: Row[]): Summary {
  const count = (f: (r: Row) => string) => rows.reduce<Record<string, number>>((m, r) => ((m[f(r)] = (m[f(r)] ?? 0) + 1), m), {});
  const active = rows.filter((r) => r.record === "Aktif");
  return {
    total: rows.length, active: active.length, removed: rows.length - active.length, withPlaceId: active.filter((r) => r.placeId).length,
    byConfidence: count((r) => r.confidence), byStatus: count((r) => r.status), byCategory: count((r) => r.category),
    withRating: active.filter((r) => validRating(r.rating)).length,
    importable: active.filter((r) => importable(r).ok).length,
  };
}

/* ── Aktarım doğrulaması (Excel → veritabanı) ── */
/** Yönetici onayı yalnız aynı place ID için geçerlidir (eşleşme değişirse karar düşer). */
export const decisionFor = (r: Pick<Row, "placeId">, d: Decision | null | undefined) => (d && d.placeId === r.placeId ? d : null);
const NEEDS_REVIEW: ReadonlySet<string> = new Set([STATUS.typeSuspect, STATUS.typeUnknown, STATUS.branch, STATUS.typeMismatch]);
export function importable(r: Row, dec?: Decision | null): { ok: boolean; why?: string } {
  const d = decisionFor(r, dec);
  if (r.record !== "Aktif") return { ok: false, why: "kaldırıldı" };
  if (d?.decision === "ret") return { ok: false, why: "yönetici reddetti" };
  if (!validPlaceId(r.placeId)) return { ok: false, why: "place ID yok" };
  if (!validRating(r.rating)) return { ok: false, why: "puan yok" };
  if (r.reviews != null && !validCount(r.reviews)) return { ok: false, why: "geçersiz değerlendirme sayısı" };
  if (!r.checkedAt || Number.isNaN(Date.parse(r.checkedAt))) return { ok: false, why: "kontrol tarihi yok" };
  if (Date.parse(r.checkedAt) > Date.now() + 36e5) return { ok: false, why: "kontrol tarihi gelecekte" };
  if (r.status === STATUS.closed) return { ok: false, why: "kalıcı kapalı" };
  const approved = d?.decision === "onay";
  if (!IMPORTABLE_CONFIDENCE.has(r.confidence) && !(approved && r.confidence === CONFIDENCE.pending)) return { ok: false, why: "eşleşme doğrulanmamış" };
  if (NEEDS_REVIEW.has(r.status) && !approved) {
    return { ok: false, why: r.status === STATUS.branch ? "şube uyuşmazlığı" : r.status === STATUS.typeMismatch ? "tür uyuşmazlığı" : r.status === STATUS.typeSuspect ? "tür şüphesi" : "tür doğrulanamadı" };
  }
  return { ok: true };
}

/** Sitede önceden gösterilen puan bu satır yüzünden GİZLENMELİ mi? Yalnız olumsuz KANIT (yanlış tür/şube, kapalı, ret) gizler;
    ağ hatası, engel ya da okunamayan sayfa gizlemez (son doğrulanmış puan kalır). */
export function hideReason(r: Row, dec?: Decision | null): string | null {
  const d = decisionFor(r, dec);
  if (d?.decision === "ret") return "yönetici reddetti";
  if (r.status === STATUS.closed) return "Google'da kalıcı kapalı";
  if (NEEDS_REVIEW.has(r.status) && d?.decision !== "onay") return importable(r, dec).why ?? r.status;
  if (!IMPORTABLE_CONFIDENCE.has(r.confidence) && d?.decision !== "onay") return "eşleşme doğrulanmamış";
  return null;
}

/* ── Her mekân için tek cevap: kimlik doğru mu, puan güvenilir mi, sitede gösteriliyor mu? ── */
export const FINAL = {
  shown: "Puan doğrulandı (sitede)",
  awaitingMatch: "Puan okundu · eşleşme onayı bekliyor",
  branch: "Yanlış şube şüphesi",
  location: "Adres / konum uyuşmazlığı",
  wrongType: "Yanlış işletme türü",
  typeReview: "Tür elle doğrulanmalı",
  closed: "Kalıcı kapalı",
  noPlaceId: "Google Place ID yok",
  readError: "Veri okuma hatası",
  notTried: "Henüz denenmedi",
  rejected: "Yönetici reddetti",
  other: "Diğer",
} as const;
export function finalState(r: Row, dec?: Decision | null): { state: string; reason: string } {
  const d = decisionFor(r, dec);
  const imp = importable(r, dec);
  if (r.record !== "Aktif") return { state: FINAL.other, reason: "Mekân Gidenler listesinden kaldırılmış" };
  if (d?.decision === "ret") return { state: FINAL.rejected, reason: d.note || "Yönetici eşleşmeyi reddetti" };
  if (!r.placeId) return { state: FINAL.noPlaceId, reason: r.confidence === CONFIDENCE.rejected ? "Önceki Google eşleşmesi reddedilmiş; yeni eşleşme gerekli" : "Doğrulanmış ya da bekleyen Google eşleşmesi yok" };
  if (r.status === STATUS.closed) return { state: FINAL.closed, reason: "Google kaydı kalıcı kapalı; puan aktarılmaz" };
  if (imp.ok) return { state: FINAL.shown, reason: `${d?.decision === "onay" ? `Yönetici onayı (${d.note}); ` : ""}${r.reviews == null ? "değerlendirme sayısı görünmüyor, sıralamaya girmez" : `${r.reviews} değerlendirme`}` };
  if (r.status === STATUS.branch) {
    const loc = /konum|kapı|adres/i.test(r.error) && !/şube eki|ad farklı şubeyi/i.test(r.error);
    return { state: loc ? FINAL.location : FINAL.branch, reason: r.error };
  }
  if (r.status === STATUS.typeMismatch || r.status === STATUS.typeSuspect) return { state: r.status === STATUS.typeMismatch ? FINAL.wrongType : FINAL.typeReview, reason: r.error };
  if (r.status === STATUS.typeUnknown) return { state: FINAL.typeReview, reason: r.error };
  if (validRating(r.rating) && r.confidence === CONFIDENCE.pending) return { state: FINAL.awaitingMatch, reason: "Google puanı okundu; place ID eşleşmesi yönetici onayı bekliyor" };
  if (r.status === STATUS.error || r.status === STATUS.blocked || r.status === STATUS.deferred) return { state: FINAL.readError, reason: r.error || r.status };
  if (r.status === STATUS.waiting || r.status === STATUS.isNew || !r.attemptAt) return { state: FINAL.notTried, reason: "Sonraki günlük çalışmada denenecek" };
  return { state: FINAL.other, reason: imp.why ?? r.error ?? "" };
}
/** Yazmadan önce türetilmiş sütunları doldurur. */
export function withDerived(rows: Row[], decisions: Map<string, Decision>): Row[] {
  return rows.map((r) => { const d = decisionFor(r, decisions.get(r.slug)); const f = finalState(r, d); return { ...r, decision: d ? `${d.decision === "onay" ? "Onay" : "Ret"} · ${d.at.slice(0, 10)}` : "", finalState: f.state, finalReason: f.reason }; });
}

export interface FileCheck { ok: boolean; errors: string[]; warnings: string[] }
/** Dosya bütünüyle kabul ya da ret: eksik, bozuk ya da şüpheli dosya çalışan veriye dokunmaz. */
export function checkFile(rows: Row[], venues: Venue[], current: Map<string, { rating: number; reviews: number | null }>): FileCheck {
  const errors: string[] = [], warnings: string[] = [];
  const slugs = new Set<string>(); const known = new Set(venues.map((v) => v.slug));
  for (const r of rows) { if (slugs.has(r.slug)) errors.push(`Tekrarlanan Gidenler ID: ${r.slug}`); slugs.add(r.slug); }
  const missing = venues.filter((v) => !slugs.has(v.slug)).length;
  if (missing > Math.max(5, venues.length * 0.02)) errors.push(`Dosyada ${missing} mekân eksik (${venues.length} bekleniyordu)`);
  else if (missing) warnings.push(`${missing} mekân dosyada yok; onların mevcut puanı korunur`);
  const unknown = rows.filter((r) => r.record === "Aktif" && !known.has(r.slug)).length;
  if (unknown) warnings.push(`${unknown} satır güncel listede yok; aktarılmaz`);
  for (const r of rows) {
    if (r.rating != null && !validRating(r.rating)) errors.push(`${r.slug}: geçersiz puan ${r.rating}`);
    if (r.reviews != null && !validCount(r.reviews)) errors.push(`${r.slug}: geçersiz değerlendirme sayısı ${r.reviews}`);
    if (r.placeId && !validPlaceId(r.placeId)) errors.push(`${r.slug}: geçersiz place ID`);
  }
  /* toplu ayrıştırma hatası koruması: aktarılacak satırların beşte birinden çoğu 0,5'ten fazla oynamışsa dosya şüphelidir */
  const ok = rows.filter((r) => known.has(r.slug) && importable(r).ok);
  const jumps = ok.filter((r) => { const c = current.get(r.slug); return c && Math.abs(c.rating - r.rating!) > 0.5; }).length;
  if (ok.length >= 20 && jumps > ok.length * 0.2) errors.push(`${jumps}/${ok.length} puan 0,5'ten fazla değişmiş; toplu okuma hatası şüphesi`);
  const drops = ok.filter((r) => { const c = current.get(r.slug); return c && c.reviews != null && r.reviews != null && c.reviews > 50 && r.reviews < c.reviews * 0.5; }).length;
  if (ok.length >= 20 && drops > ok.length * 0.1) errors.push(`${drops} mekânda değerlendirme sayısı yarıdan aza düşmüş; dosya şüpheli`);
  return { ok: errors.length === 0, errors: errors.slice(0, 50), warnings };
}

/** Türkiye saatiyle bugünün tarihi (YYYY-AA-GG). */
export const trDay = (d = new Date()) => new Date(d.getTime() + 3 * 36e5).toISOString().slice(0, 10);
