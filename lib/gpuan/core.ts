import { addressSimilarity, branchDiff, distanceM, houseNoConflict, nameSimilarity } from "@/lib/match/score";

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
] as const;
export type ColKey = (typeof COLUMNS)[number][0];
export const HEADERS = COLUMNS.map((c) => c[1]);

export const CONFIDENCE = { confirmed: "Onaylı", auto: "Otomatik", pending: "Onay bekliyor", none: "Eşleşme yok", rejected: "Reddedildi" } as const;
export type Confidence = (typeof CONFIDENCE)[keyof typeof CONFIDENCE];
/** Siteye yalnız bu güvenle eşleşmiş satırların puanı aktarılır. */
export const IMPORTABLE_CONFIDENCE: ReadonlySet<string> = new Set([CONFIDENCE.confirmed, CONFIDENCE.auto]);

export const STATUS = {
  fresh: "Güncel", same: "Değişmedi", waiting: "Bekliyor", error: "Hata", blocked: "Engellendi", branch: "Şube uyuşmazlığı",
  noMatch: "Eşleşme yok", deferred: "Ertelendi", removed: "Kaldırıldı", isNew: "Yeni",
} as const;
export type Status = (typeof STATUS)[keyof typeof STATUS];
export const OK_STATUS: ReadonlySet<string> = new Set([STATUS.fresh, STATUS.same]);

export interface Row {
  slug: string; name: string; category: string; cuisine: string; district: string; address: string;
  placeId: string; mapsUrl: string; rating: number | null; reviews: number | null; checkedAt: string;
  source: string; confidence: Confidence; status: Status; error: string; profileUrl: string;
  attemptAt: string; seenName: string; seenAddress: string; prevRating: number | null; prevReviews: number | null;
  record: "Aktif" | "Kaldırıldı";
}

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
    profileUrl: `${SITE}/mekan/${v.slug}/`, attemptAt: "", seenName: "", seenAddress: "", prevRating: null, prevReviews: null, record: "Aktif",
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
    const keep: Row = { ...o, name: fresh.name, category: fresh.category, cuisine: fresh.cuisine, district: fresh.district, address: fresh.address, profileUrl: fresh.profileUrl, record: "Aktif" };
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
export interface Observation { name: string; address: string; rating: number | null; reviews: number | null; lat?: number | null; lng?: number | null; closed?: boolean }
export type SourceResult =
  | { kind: "ok"; seen: Observation }
  | { kind: "blocked"; reason: string }     // CAPTCHA, olağandışı trafik, giriş zorunluluğu — aşılmaz
  | { kind: "not_found"; reason: string }
  | { kind: "error"; reason: string };
export interface RatingSource { id: string; label: string; fetch(target: { placeId: string; name: string; mapsUrl: string }): Promise<SourceResult>; close?(): Promise<void> }

/* ── Doğru mekân / doğru şube kontrolü ── */
export interface Consistency { ok: boolean; reason: string; name: number; distanceM: number | null; address: number | null }
export function checkConsistency(v: Pick<Venue, "name" | "address" | "lat" | "lng">, seen: Observation): Consistency {
  const name = nameSimilarity(v.name, seen.name);
  const dist = seen.lat != null && seen.lng != null && Number.isFinite(seen.lat) && Number.isFinite(seen.lng) ? Math.round(distanceM(v, { lat: seen.lat, lng: seen.lng })) : null;
  const addr = addressSimilarity(v.address, seen.address);
  const houseClash = houseNoConflict(v.address, seen.address);
  const branch = branchDiff(v.name, seen.name);
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
  Object.assign(r, { seenName: s.name.slice(0, 200), seenAddress: s.address.slice(0, 300) });
  const c = v ? checkConsistency(v, s) : { ok: false, reason: "Mekân listede yok" } as Consistency;
  if (!c.ok) return failWith(STATUS.branch, c.reason);
  if (s.closed) return failWith(STATUS.error, "Google'da kalıcı olarak kapalı görünüyor; puan aktarılmadı");
  if (!validRating(s.rating)) return failWith(STATUS.error, "Sayfada geçerli puan yok");
  /* değerlendirme sayısı herkese açık (oturumsuz) sayfada gösterilmeyebilir: uydurulmaz, boş kalır */
  const reviews = validCount(s.reviews) ? s.reviews : null;
  const same = row.rating === s.rating && row.reviews === reviews;
  return {
    ...r, prevRating: same ? row.prevRating : row.rating, prevReviews: same ? row.prevReviews : row.reviews,
    rating: s.rating, reviews, checkedAt: at, source: source.label, status: same ? STATUS.same : STATUS.fresh,
    error: reviews == null ? NO_COUNT : "",
  };
}

/** Satır verilen Türkiye gününde denendi mi (deneme zamanı UTC ISO olarak saklanır). */
export const attemptedOn = (r: Pick<Row, "attemptAt">, day: string) => !!r.attemptAt && !Number.isNaN(Date.parse(r.attemptAt)) && trDay(new Date(r.attemptAt)) === day;
/** Bugün denenecek satırlar: aktif, place ID'li; en eski kontrol önce. Kesinti sonrası aynı gün denenmiş satır atlanır. */
export function dueRows(rows: Row[], today: string, max: number): Row[] {
  return rows.filter((r) => r.record === "Aktif" && r.placeId && r.confidence !== CONFIDENCE.rejected && !attemptedOn(r, today))
    .sort((a, b) => (a.checkedAt || "").localeCompare(b.checkedAt || "") || a.slug.localeCompare(b.slug)).slice(0, max);
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
export function importable(r: Row): { ok: boolean; why?: string } {
  if (r.record !== "Aktif") return { ok: false, why: "kaldırıldı" };
  if (!IMPORTABLE_CONFIDENCE.has(r.confidence)) return { ok: false, why: "eşleşme doğrulanmamış" };
  if (!validPlaceId(r.placeId)) return { ok: false, why: "place ID yok" };
  if (!validRating(r.rating)) return { ok: false, why: "puan yok" };
  if (r.reviews != null && !validCount(r.reviews)) return { ok: false, why: "geçersiz değerlendirme sayısı" };
  if (!r.checkedAt || Number.isNaN(Date.parse(r.checkedAt))) return { ok: false, why: "kontrol tarihi yok" };
  if (Date.parse(r.checkedAt) > Date.now() + 36e5) return { ok: false, why: "kontrol tarihi gelecekte" };
  if (r.status === STATUS.branch) return { ok: false, why: "şube uyuşmazlığı" };
  return { ok: true };
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
