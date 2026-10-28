import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { getDb } from "@/lib/db/client";
import { places, placeIdentifiers, moderationQueue } from "@/lib/db/schema";
import { reserve } from "@/lib/usage/counter";
import { matchScore, brandKey, branchDiff, houseNoConflict, preDecide, postDecide, type MatchContext } from "@/lib/match/score";

/* ──────────────────────────────────────────────────────────────────────────
   GOOGLE PLACES (New) ADAPTÖRÜ — yalnız sunucu.
   · Saklama: yalnız place_id (place_identifiers). Puan, yorum, fotoğraf hiçbir yerde tutulmaz.
   · Her ücretli çağrıdan ÖNCE sayaç (lib/usage/counter): sınır, Redis yok ya da hata → çağrı yok.
   · Eşleştirme YALNIZ korumalı toplu işte (matchGoogleBatch): Text Search Pro + katı karar katmanı; belirsiz
     olan manuel onay kuyruğuna (onaylanana kadar Google içeriği gösterilmez). Sayfa görüntülemesi eşleştirmez.
   · Gösterim yalnız kullanıcı isteyince: yorumlar (Enterprise + Atmosphere) ve fotoğraflar (Essentials + Photo) ayrı.
   · Anahtar URL'ye yazılmaz; her istekte X-Goog-Api-Key başlığı.
   ────────────────────────────────────────────────────────────────────────── */

const API = "https://places.googleapis.com/v1";
const PHOTO_LIMIT = 2;

export type GoogleStatus =
  | { state: "disabled" }
  | { state: "unmatched"; reason: "no_match" | "pending_review" | "rejected" }
  | { state: "limit"; reason: string }
  | { state: "error" }
  | { state: "ok"; data: GooglePlaceView };

export interface GooglePlaceView {
  rating?: number; count?: number; mapsUri?: string; hours: string[];
  photos: Array<{ src: string; author: string; authorUri?: string }>;
  reviews: Array<{ author: string; authorUri?: string; authorPhoto?: string; rating: number; text: string; when: string; uri?: string }>;
}

/** Ücretli Google çağrıları: Production'da anahtar varsa açık; Preview'da yalnız GOOGLE_PLACES_PREVIEW=true
    ile (ayrı Redis + kota koruması doğrulandıktan sonra) açılır. */
export function googleEnabled(env = process.env.VERCEL_ENV) {
  if (!process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_ENABLED === "false") return false;
  return env !== "preview" || process.env.GOOGLE_PLACES_PREVIEW === "true";
}

const headers = (key: string, mask: string) => ({ "content-type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": mask });

/** Eşleştirme tanısı — yönetim raporu için. Google içeriği (ad, adres) yalnız yanıtta geçer, SAKLANMAZ. */
export interface MatchDiag {
  slug: string; status: "auto" | "pending" | "no_match" | "existing" | "limit" | "error" | "no_db";
  placeId?: string; score?: number; nameSim?: number; distanceM?: number; address?: number | null;
  phone?: "match" | "conflict" | "unknown"; website?: "match" | "conflict" | "unknown"; duplicate?: boolean;
  chain?: boolean; branch?: string[]; rival?: boolean; reason?: string;
  candidate?: { name: string; address?: string }; calls: { textSearch: number; detailsEnterprise: number };
}

type Cand = { id: string; displayName?: { text?: string }; location?: { latitude: number; longitude: number }; formattedAddress?: string };

/** Onaylı ya da otomatik eşleşmiş Google kimliği; yoksa null. Google'a hiç istek atmaz. */
export async function storedGooglePlaceId(slug: string): Promise<{ id: string } | { none: "no_match" | "pending_review" | "rejected" } | null> {
  const db = getDb();
  if (!db) return null;
  const [p] = await db.select({ id: places.id }).from(places).where(eq(places.slug, slug)).limit(1);
  if (!p) return { none: "no_match" };
  const ids = await db.select().from(placeIdentifiers).where(and(eq(placeIdentifiers.placeId, p.id), eq(placeIdentifiers.provider, "google")));
  const usable = ids.find((i) => i.status === "confirmed" || i.status === "auto");
  if (usable) return { id: usable.externalId };
  if (ids.some((i) => i.status === "pending")) return { none: "pending_review" };
  return { none: ids.length ? "rejected" : "no_match" };
}

/** YALNIZ yetkili toplu işten (matchGoogleBatch) çağrılır; sayfa görüntülemesi asla eşleştirme yapmaz.
    1) Text Search Pro: yalnız id, displayName, location, formattedAddress.
    2) Karar katmanı (lib/match/score): güçlü eşleşme Enterprise çağrısı olmadan otomatik; belirsizse ve bizde
       telefon/web varsa Place Details Enterprise (yalnız nationalPhoneNumber, websiteUri) ile doğrula.
    3) Zincir / şube adı farkı / yakında rakip aday / kapı no çelişkisi → katı kural ya da manuel onay.
    Saklanan: place_id + sayısal özet. Google'ın ad/adres/telefon metni hiçbir tabloya yazılmaz. */
export async function resolveGooglePlaceId(slug: string, key: string, f: typeof fetch = fetch, brands?: Map<string, number>): Promise<MatchDiag> {
  const calls = { textSearch: 0, detailsEnterprise: 0 };
  const db = getDb();
  if (!db) return { slug, status: "no_db", calls };
  const [p] = await db.select().from(places).where(eq(places.slug, slug)).limit(1);
  if (!p || p.lat == null || p.lng == null) return { slug, status: "no_match", calls };

  /* Mevcut kayıt (otomatik, onaylı, bekleyen ya da reddedilmiş) asla yeniden taranmaz. */
  const ids = await db.select().from(placeIdentifiers)
    .where(and(eq(placeIdentifiers.placeId, p.id), eq(placeIdentifiers.provider, "google")));
  if (ids.length) {
    const usable = ids.find((i) => i.status === "confirmed" || i.status === "auto");
    return { slug, status: usable ? "existing" : ids.some((i) => i.status === "pending") ? "pending" : "no_match", placeId: usable?.externalId, calls };
  }

  const r = await reserve("google:text_search_pro");
  if (!r.ok) return { slug, status: "limit", calls };
  try {
    calls.textSearch++;
    const res = await f(`${API}/places:searchText`, {
      method: "POST",
      headers: headers(key, "places.id,places.displayName,places.location,places.formattedAddress"),
      body: JSON.stringify({
        textQuery: `${p.name} ${p.district ?? ""} ${p.city}`, languageCode: "tr", maxResultCount: 3,
        locationBias: { circle: { center: { latitude: p.lat, longitude: p.lng }, radius: 200 } },
      }),
      cache: "no-store", signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return { slug, status: "error", calls };
    const j = await res.json() as { places?: Cand[] };
    const self = { name: p.name, lat: p.lat!, lng: p.lng!, phone: p.phone, website: p.website, address: p.address };
    const asInput = (c: Cand, extra: { phone?: string; website?: string } = {}) =>
      ({ name: c.displayName?.text ?? "", lat: c.location!.latitude, lng: c.location!.longitude, address: c.formattedAddress, ...extra });
    const ranked = (j.places ?? []).filter((c) => c.location).map((c) => ({ c, m: matchScore(self, asInput(c)) }))
      .sort((a, b) => b.m.score - a.m.score);
    const best = ranked[0];
    if (!best || best.m.decision === "reject") return { slug, status: "no_match", calls, reason: "puan_dusuk_ya_da_uzak", ...(best ? { score: best.m.score, nameSim: best.m.name, distanceM: best.m.distanceM } : {}) };

    /* Zincir: markamız bizde birden çok mekânda var ya da Google aynı markadan birden çok aday döndürdü. */
    const bk = brandKey(p.name);
    const sameBrand = ranked.filter((x) => brandKey(x.c.displayName?.text ?? "") === bk).length;
    const ctx: MatchContext = {
      chain: (brands?.get(bk) ?? 1) > 1 || sameBrand > 1,
      branch: branchDiff(p.name, best.c.displayName?.text ?? ""),
      rival: ranked.slice(1).some((x) => x.m.name >= 0.6 && x.m.distanceM <= 300 && x.c.id !== best.c.id && x.m.score >= best.m.score - 0.1),
      addrConflict: houseNoConflict(p.address, best.c.formattedAddress),
    };
    let m = best.m;
    let dec = preDecide(m, ctx, !!(p.phone || p.website));
    if (dec.needsVerify) {
      const v = await reserve("google:details_enterprise");
      if (!v.ok) return { slug, status: "limit", calls };
      calls.detailsEnterprise++;
      const d = await f(`${API}/places/${encodeURIComponent(best.c.id)}`, {
        headers: headers(key, "nationalPhoneNumber,websiteUri"), cache: "no-store", signal: AbortSignal.timeout(6000),
      });
      if (!d.ok) return { slug, status: "error", calls };
      const dj = await d.json() as { nationalPhoneNumber?: string; websiteUri?: string };
      m = matchScore(self, asInput(best.c, { phone: dj.nationalPhoneNumber, website: dj.websiteUri }));
      dec = postDecide(m, ctx);
    }
    if (dec.decision === "reject") return { slug, status: "no_match", calls, score: m.score, reason: dec.reason };

    /* Aynı Google kimliği başka bir mekâna zaten bağlıysa otomatik onay verilmez. */
    const taken = await db.select({ placeId: placeIdentifiers.placeId }).from(placeIdentifiers)
      .where(and(eq(placeIdentifiers.provider, "google"), eq(placeIdentifiers.externalId, best.c.id)));
    const duplicate = taken.some((t) => t.placeId !== p.id);
    const status = dec.decision === "auto" && !duplicate ? "auto" : "pending";
    const reason = duplicate ? "ayni_google_kaydi_baska_mekanda" : dec.reason;
    const summary = `ad=${m.name} d=${m.distanceM}m adres=${m.address ?? "-"} tel=${m.phone} web=${m.website} zincir=${ctx.chain ? 1 : 0} sube=${ctx.branch.length ? 1 : 0} rakip=${ctx.rival ? 1 : 0} karar=${reason}`;
    const idRow = uuidv7();
    await db.insert(placeIdentifiers).values({
      id: idRow, placeId: p.id, provider: "google", externalId: best.c.id,
      matchScore: m.score, matchMethod: `text_search_pro${calls.detailsEnterprise ? "+details_enterprise" : ""} ${summary}`, status,
    }).onConflictDoNothing();
    if (status === "pending") {
      await db.insert(moderationQueue).values({
        id: uuidv7(), kind: "identifier_match", refTable: "place_identifiers", refId: idRow,
        reason: `Google eşleşmesi onay bekliyor: puan ${m.score}, ${summary}`,
      });
    }
    return {
      slug, status, placeId: best.c.id, score: m.score, nameSim: m.name, distanceM: m.distanceM,
      address: m.address, phone: m.phone, website: m.website, duplicate, chain: ctx.chain, branch: ctx.branch, rival: ctx.rival, reason,
      candidate: { name: best.c.displayName?.text ?? "", address: best.c.formattedAddress }, calls,
    };
  } catch {
    return { slug, status: "error", calls };
  }
}

/** Toplu eşleştirme (yalnız yönetim, korumalı uç): henüz HİÇ Google kaydı olmayan restoranlar, sırayla.
    Onaylı, otomatik, bekleyen ya da reddedilmiş kayıtlar yeniden taranmaz. Kota biterse ya da hata olursa durur. */
export async function matchGoogleBatch(limit: number, f: typeof fetch = fetch) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !googleEnabled()) return { error: "disabled" as const, results: [] as MatchDiag[] };
  const db = getDb();
  if (!db) return { error: "no_db" as const, results: [] as MatchDiag[] };
  const done = db.select({ id: placeIdentifiers.placeId }).from(placeIdentifiers).where(eq(placeIdentifiers.provider, "google"));
  const todo = await db.select({ slug: places.slug }).from(places)
    .where(and(eq(places.vertical, "restaurant"), notInArray(places.id, done))).orderBy(places.slug).limit(Math.max(1, Math.min(limit, 25)));
  /* marka sayıları: bütün mekânlarımız (restoran, kafe, bar) üzerinden — zincir işareti */
  const brands = new Map<string, number>();
  for (const r of await db.select({ name: places.name }).from(places)) { const k = brandKey(r.name); if (k) brands.set(k, (brands.get(k) ?? 0) + 1); }
  const results: MatchDiag[] = [];
  for (const t of todo) {
    const r = await resolveGooglePlaceId(t.slug, key, f, brands);
    results.push(r);
    if (r.status === "limit" || r.status === "error") break;
  }
  const [left] = await db.select({ n: sql<number>`count(*)::int` }).from(places).where(and(eq(places.vertical, "restaurant"), notInArray(places.id, done)));
  return { results, remaining: Number(left?.n ?? 0) };
}

/** Canlı Google bilgisi — YALNIZ kullanıcı istediğinde, yalnız kayıtlı (onaylı/otomatik) kimlik için. Hiçbir şey saklanmaz.
    · part "reviews": tek Place Details Enterprise + Atmosphere isteği → puan, sayı, saatler, en çok 5 yorum.
    · part "photos":  Place Details Essentials (yalnız photos) + en çok 2 Place Photo isteği. */
export async function fetchGooglePlace(slug: string, f: typeof fetch = fetch, part: "reviews" | "photos" = "reviews"): Promise<GoogleStatus> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !googleEnabled()) return { state: "disabled" };
  const s = await storedGooglePlaceId(slug).catch(() => null);
  if (!s) return { state: "error" };
  if ("none" in s) return { state: "unmatched", reason: s.none };
  const url = `${API}/places/${encodeURIComponent(s.id)}?languageCode=tr`;
  try {
    if (part === "photos") {
      const e = await reserve("google:details_essentials");
      if (!e.ok) return { state: "limit", reason: e.reason };
      const d = await f(url, { headers: headers(key, "photos"), cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (!d.ok) return { state: "error" };
      const p = await d.json() as { photos?: Array<{ name: string; authorAttributions?: Array<{ displayName: string; uri?: string }> }> };
      const photos: GooglePlaceView["photos"] = [];
      for (const ph of (p.photos ?? []).slice(0, PHOTO_LIMIT)) {
        const ok = await reserve("google:photo");
        if (!ok.ok) break;                                  // foto bütçesi bitti
        const m = await f(`${API}/${ph.name}/media?maxWidthPx=800&skipHttpRedirect=true`, {
          headers: { "X-Goog-Api-Key": key }, cache: "no-store", signal: AbortSignal.timeout(6000),
        }).catch(() => null);
        const j = m && m.ok ? await m.json() as { photoUri?: string } : null;
        if (j?.photoUri) photos.push({ src: j.photoUri, author: ph.authorAttributions?.[0]?.displayName ?? "Google kullanıcısı", authorUri: ph.authorAttributions?.[0]?.uri });
      }
      return { state: "ok", data: { hours: [], reviews: [], photos } };
    }
    const d0 = await reserve("google:details_atmosphere");
    if (!d0.ok) return { state: "limit", reason: d0.reason };
    /* tek istek = Place Details Enterprise + Atmosphere (reviews nedeniyle); saatler aynı SKU içinde */
    const d = await f(url, { headers: headers(key, "rating,userRatingCount,googleMapsUri,reviews,regularOpeningHours.weekdayDescriptions"), cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!d.ok) return { state: "error" };
    const p = await d.json() as {
      rating?: number; userRatingCount?: number; googleMapsUri?: string; regularOpeningHours?: { weekdayDescriptions?: string[] };
      reviews?: Array<{ authorAttribution?: { displayName?: string; uri?: string; photoUri?: string }; rating?: number; text?: { text?: string }; originalText?: { text?: string }; relativePublishTimeDescription?: string; googleMapsUri?: string }>;
    };
    return {
      state: "ok",
      data: {
        rating: p.rating, count: p.userRatingCount, mapsUri: p.googleMapsUri, photos: [], hours: p.regularOpeningHours?.weekdayDescriptions ?? [],
        reviews: (p.reviews ?? []).slice(0, 5).map((r) => ({
          author: r.authorAttribution?.displayName ?? "Google kullanıcısı", authorUri: r.authorAttribution?.uri, authorPhoto: r.authorAttribution?.photoUri,
          rating: r.rating ?? 0, text: r.text?.text ?? r.originalText?.text ?? "", when: r.relativePublishTimeDescription ?? "", uri: r.googleMapsUri,
        })),
      },
    };
  } catch {
    return { state: "error" };
  }
}

/** Yönetim: bekleyen Google eşleşmeleri. */
export async function pendingGoogleMatches() {
  const db = getDb();
  if (!db) return [];
  return db.select({ id: placeIdentifiers.id, slug: places.slug, name: places.name, externalId: placeIdentifiers.externalId, score: placeIdentifiers.matchScore, method: placeIdentifiers.matchMethod,
    mapsUrl: sql<string>`'https://www.google.com/maps/search/?api=1&query=' || replace(${places.name}, ' ', '+') || '&query_place_id=' || ${placeIdentifiers.externalId}` })
    .from(placeIdentifiers).innerJoin(places, eq(places.id, placeIdentifiers.placeId))
    .where(and(eq(placeIdentifiers.provider, "google"), inArray(placeIdentifiers.status, ["pending"])));
}

/** Yönetim: manuel onay/ret. Onaylanana kadar Google içeriği gösterilmez. */
export async function reviewGoogleMatch(identifierId: string, decision: "confirmed" | "rejected") {
  const db = getDb();
  if (!db) return { ok: false as const, error: "no_db" };
  const rows = await db.update(placeIdentifiers).set({ status: decision, verifiedBy: "admin", verifiedAt: new Date() })
    .where(and(eq(placeIdentifiers.id, identifierId), eq(placeIdentifiers.provider, "google"), eq(placeIdentifiers.status, "pending")))
    .returning({ id: placeIdentifiers.id });
  if (!rows.length) return { ok: false as const, error: "not_pending" };
  /* Onay kuyruğu satırı silinmez: işlem geçmişi olarak kalır, yalnız açık listeden çıkar. */
  await db.update(moderationQueue).set({ status: decision === "confirmed" ? "approved" : "rejected", decidedBy: "admin", decidedAt: new Date() })
    .where(and(eq(moderationQueue.refTable, "place_identifiers"), eq(moderationQueue.refId, identifierId), eq(moderationQueue.status, "open")));
  return { ok: true as const };
}

/** Geçmiş onaylar için bir kerelik eşitleme: kimliği artık "pending" olmayan açık kuyruk satırlarını
    kimliğin durumuna göre kapatır (approved / rejected). Hiçbir satır silinmez. */
export async function syncGoogleQueue() {
  const db = getDb();
  if (!db) return { ok: false as const, error: "no_db" };
  const open = await db.select({ q: moderationQueue.id, status: placeIdentifiers.status, at: placeIdentifiers.verifiedAt })
    .from(moderationQueue).innerJoin(placeIdentifiers, eq(placeIdentifiers.id, moderationQueue.refId))
    .where(and(eq(moderationQueue.kind, "identifier_match"), eq(moderationQueue.status, "open"), eq(placeIdentifiers.provider, "google")));
  let closed = 0;
  for (const r of open) {
    if (r.status !== "confirmed" && r.status !== "rejected") continue;
    await db.update(moderationQueue).set({ status: r.status === "confirmed" ? "approved" : "rejected", decidedBy: "admin", decidedAt: r.at ?? new Date() })
      .where(eq(moderationQueue.id, r.q));
    closed++;
  }
  return { ok: true as const, closed, stillOpen: open.length - closed };
}

/** Yönetim: eşleşme durumu sayıları. */
export async function googleMatchStats() {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select({ status: placeIdentifiers.status, n: sql<number>`count(*)::int` }).from(placeIdentifiers)
    .where(eq(placeIdentifiers.provider, "google")).groupBy(placeIdentifiers.status);
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
}

/** Yönetim: Google onay kuyruğu satırları duruma göre (open = aktif bekleyen; approved/rejected = geçmiş). */
export async function googleQueueStats() {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select({ status: moderationQueue.status, n: sql<number>`count(*)::int` }).from(moderationQueue)
    .where(eq(moderationQueue.kind, "identifier_match")).groupBy(moderationQueue.status);
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
}

/** Pilot geri alma: YALNIZ Google eşleşme kayıtları ve onların onay kuyruğu satırları silinir.
    Mekânlar, OSM kimlikleri, kullanıcılar, deneyimler ve diğer tablolar değişmez. */
export async function rollbackGoogleMatches() {
  const db = getDb();
  if (!db) return { ok: false as const, error: "no_db" };
  const ids = await db.select({ id: placeIdentifiers.id }).from(placeIdentifiers).where(eq(placeIdentifiers.provider, "google"));
  const list = ids.map((i) => i.id);
  if (list.length) {
    await db.delete(moderationQueue).where(and(eq(moderationQueue.refTable, "place_identifiers"), inArray(moderationQueue.refId, list)));
    await db.delete(placeIdentifiers).where(inArray(placeIdentifiers.id, list));
  }
  return { ok: true as const, removedIdentifiers: list.length };
}
