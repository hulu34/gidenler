import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { getDb } from "@/lib/db/client";
import { places, placeIdentifiers, moderationQueue } from "@/lib/db/schema";
import { reserve } from "@/lib/usage/counter";
import { matchScore } from "@/lib/match/score";

/* ──────────────────────────────────────────────────────────────────────────
   GOOGLE PLACES (New) ADAPTÖRÜ — yalnız sunucu.
   · Saklama: yalnız place_id (place_identifiers). Puan, yorum, fotoğraf hiçbir yerde tutulmaz.
   · Her ücretli çağrıdan ÖNCE sayaç (lib/usage/counter): sınır, Redis yok ya da hata → çağrı yok.
   · Eşleştirme: bir kerelik Text Search Pro (ad + konum) → puan ≥ 0,90 otomatik, 0,60–0,90 manuel onay
     kuyruğu (onaylanana kadar Google içeriği gösterilmez), altı ret.
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
  candidate?: { name: string; address?: string }; calls: { textSearch: number; detailsEnterprise: number };
}

type Cand = { id: string; displayName?: { text?: string }; location?: { latitude: number; longitude: number }; formattedAddress?: string };

/** Onaylı (ya da otomatik) Google kimliği; yoksa eşleştirmeyi bir kez dener.
    1) Text Search Pro: yalnız id, displayName, location, formattedAddress (5.000/ay ücretsiz SKU).
    2) En iyi aday için Place Details Enterprise: yalnız nationalPhoneNumber, websiteUri (telefon/web doğrulaması).
    Saklanan: place_id + sayısal eşleşme özeti. Google'ın ad/adres/telefon metni hiçbir tabloya yazılmaz. */
export async function resolveGooglePlaceId(slug: string, key: string, f: typeof fetch = fetch): Promise<MatchDiag> {
  const calls = { textSearch: 0, detailsEnterprise: 0 };
  const db = getDb();
  if (!db) return { slug, status: "no_db", calls };
  const [p] = await db.select().from(places).where(eq(places.slug, slug)).limit(1);
  if (!p || p.lat == null || p.lng == null) return { slug, status: "no_match", calls };

  const ids = await db.select().from(placeIdentifiers)
    .where(and(eq(placeIdentifiers.placeId, p.id), eq(placeIdentifiers.provider, "google")));
  const usable = ids.find((i) => i.status === "confirmed" || i.status === "auto");
  if (usable) return { slug, status: "existing", placeId: usable.externalId, calls };
  if (ids.some((i) => i.status === "pending")) return { slug, status: "pending", calls };
  if (ids.length && ids.every((i) => i.status === "rejected")) return { slug, status: "no_match", calls };

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
    const best = (j.places ?? []).filter((c) => c.location).map((c) => ({ c, m: matchScore(self, asInput(c)) }))
      .sort((a, b) => b.m.score - a.m.score)[0];
    if (!best || best.m.decision === "reject") return { slug, status: "no_match", calls, ...(best ? { score: best.m.score, nameSim: best.m.name, distanceM: best.m.distanceM } : {}) };

    /* Telefon ve web yalnız Enterprise detayda var: yalnız bizde de bilgi varsa ve aday reddedilmediyse sorulur. */
    let m = best.m;
    if (p.phone || p.website) {
      const v = await reserve("google:details_enterprise");
      if (!v.ok) return { slug, status: "limit", calls };
      calls.detailsEnterprise++;
      const d = await f(`${API}/places/${encodeURIComponent(best.c.id)}`, {
        headers: headers(key, "nationalPhoneNumber,websiteUri"), cache: "no-store", signal: AbortSignal.timeout(6000),
      });
      if (!d.ok) return { slug, status: "error", calls };
      const dj = await d.json() as { nationalPhoneNumber?: string; websiteUri?: string };
      m = matchScore(self, asInput(best.c, { phone: dj.nationalPhoneNumber, website: dj.websiteUri }));
      if (m.decision === "reject") return { slug, status: "no_match", calls, score: m.score };
    }

    /* Aynı Google kimliği başka bir mekâna zaten bağlıysa otomatik onay verilmez. */
    const taken = await db.select({ placeId: placeIdentifiers.placeId }).from(placeIdentifiers)
      .where(and(eq(placeIdentifiers.provider, "google"), eq(placeIdentifiers.externalId, best.c.id)));
    const duplicate = taken.some((t) => t.placeId !== p.id);
    const status = m.decision === "auto" && !duplicate ? "auto" : "pending";
    const summary = `ad=${m.name} d=${m.distanceM}m adres=${m.address ?? "-"} tel=${m.phone} web=${m.website}`;
    const idRow = uuidv7();
    await db.insert(placeIdentifiers).values({
      id: idRow, placeId: p.id, provider: "google", externalId: best.c.id,
      matchScore: m.score, matchMethod: `text_search_pro+details_enterprise ${summary}`, status,
    }).onConflictDoNothing();
    if (status === "pending") {
      await db.insert(moderationQueue).values({
        id: uuidv7(), kind: "identifier_match", refTable: "place_identifiers", refId: idRow,
        reason: `Google eşleşmesi onay bekliyor: puan ${m.score}, ${summary}${duplicate ? " · bu Google kaydı başka bir mekâna da bağlı" : ""}`,
      });
    }
    return {
      slug, status, placeId: best.c.id, score: m.score, nameSim: m.name, distanceM: m.distanceM,
      address: m.address, phone: m.phone, website: m.website,
      duplicate, candidate: { name: best.c.displayName?.text ?? "", address: best.c.formattedAddress }, calls,
    };
  } catch {
    return { slug, status: "error", calls };
  }
}

/** Toplu eşleştirme (yönetim): henüz Google kimliği olmayan restoranlar, sırayla; her çağrı kota kontrolünden geçer.
    Kota biterse durur. */
export async function matchGoogleBatch(limit: number, f: typeof fetch = fetch) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !googleEnabled()) return { error: "disabled" as const, results: [] as MatchDiag[] };
  const db = getDb();
  if (!db) return { error: "no_db" as const, results: [] as MatchDiag[] };
  const done = db.select({ id: placeIdentifiers.placeId }).from(placeIdentifiers).where(eq(placeIdentifiers.provider, "google"));
  const todo = await db.select({ slug: places.slug }).from(places)
    .where(and(eq(places.vertical, "restaurant"), notInArray(places.id, done))).orderBy(places.slug).limit(Math.max(1, Math.min(limit, 25)));
  const results: MatchDiag[] = [];
  for (const t of todo) {
    const r = await resolveGooglePlaceId(t.slug, key, f);
    results.push(r);
    if (r.status === "limit" || r.status === "error") break;
  }
  return { results };
}

/** Canlı Google bilgisi: puan, en çok 5 yorum (Google sırası), en çok 2 fotoğraf. Hiçbir şey saklanmaz. */
export async function fetchGooglePlace(slug: string, f: typeof fetch = fetch): Promise<GoogleStatus> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !googleEnabled()) return { state: "disabled" };
  const r0 = await resolveGooglePlaceId(slug, key, f);
  if (r0.status === "limit") return { state: "limit", reason: "match_budget" };
  if (r0.status === "error" || r0.status === "no_db") return { state: "error" };
  if (r0.status === "pending") return { state: "unmatched", reason: "pending_review" };
  if (r0.status === "no_match" || !r0.placeId) return { state: "unmatched", reason: "no_match" };
  const id = { id: r0.placeId };

  const d0 = await reserve("google:details_atmosphere");
  if (!d0.ok) return { state: "limit", reason: d0.reason };
  try {
    const d = await f(`${API}/places/${encodeURIComponent(id.id)}?languageCode=tr`, {
      /* tek istek = Place Details Enterprise + Atmosphere (reviews nedeniyle); saatler aynı SKU içinde */
      headers: headers(key, "rating,userRatingCount,googleMapsUri,reviews,photos,regularOpeningHours.weekdayDescriptions"),
      cache: "no-store", signal: AbortSignal.timeout(6000),
    });
    if (!d.ok) return { state: "error" };
    const p = await d.json() as {
      rating?: number; userRatingCount?: number; googleMapsUri?: string; regularOpeningHours?: { weekdayDescriptions?: string[] };
      photos?: Array<{ name: string; authorAttributions?: Array<{ displayName: string; uri?: string }> }>;
      reviews?: Array<{ authorAttribution?: { displayName?: string; uri?: string; photoUri?: string }; rating?: number; text?: { text?: string }; originalText?: { text?: string }; relativePublishTimeDescription?: string; googleMapsUri?: string }>;
    };
    const wanted = (p.photos ?? []).slice(0, PHOTO_LIMIT);
    const photos: GooglePlaceView["photos"] = [];
    for (const ph of wanted) {
      const ok = await reserve("google:photo");
      if (!ok.ok) break;                                  // foto bütçesi bitti: yalnız yorumlar
      const m = await f(`${API}/${ph.name}/media?maxWidthPx=800&skipHttpRedirect=true`, {
        headers: { "X-Goog-Api-Key": key }, cache: "no-store", signal: AbortSignal.timeout(6000),
      }).catch(() => null);
      const j = m && m.ok ? await m.json() as { photoUri?: string } : null;
      if (j?.photoUri) photos.push({ src: j.photoUri, author: ph.authorAttributions?.[0]?.displayName ?? "Google kullanıcısı", authorUri: ph.authorAttributions?.[0]?.uri });
    }
    return {
      state: "ok",
      data: {
        rating: p.rating, count: p.userRatingCount, mapsUri: p.googleMapsUri, photos, hours: p.regularOpeningHours?.weekdayDescriptions ?? [],
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
  return rows.length ? { ok: true as const } : { ok: false as const, error: "not_pending" };
}

/** Yönetim: eşleşme durumu sayıları. */
export async function googleMatchStats() {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select({ status: placeIdentifiers.status, n: sql<number>`count(*)::int` }).from(placeIdentifiers)
    .where(eq(placeIdentifiers.provider, "google")).groupBy(placeIdentifiers.status);
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
}
