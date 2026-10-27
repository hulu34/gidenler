import { and, eq, inArray } from "drizzle-orm";
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
  rating?: number; count?: number; mapsUri?: string;
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

/** Onaylı (ya da otomatik) Google kimliği; yoksa eşleştirmeyi bir kez dener. */
export async function resolveGooglePlaceId(slug: string, key: string, f: typeof fetch = fetch):
  Promise<{ id: string } | { none: "no_match" | "pending_review" | "rejected" | "limit" | "error" | "no_db" }> {
  const db = getDb();
  if (!db) return { none: "no_db" };
  const [p] = await db.select().from(places).where(eq(places.slug, slug)).limit(1);
  if (!p || p.lat == null || p.lng == null) return { none: "no_match" };

  const ids = await db.select().from(placeIdentifiers)
    .where(and(eq(placeIdentifiers.placeId, p.id), eq(placeIdentifiers.provider, "google")));
  const usable = ids.find((i) => i.status === "confirmed" || i.status === "auto");
  if (usable) return { id: usable.externalId };
  if (ids.some((i) => i.status === "pending")) return { none: "pending_review" };
  if (ids.length && ids.every((i) => i.status === "rejected")) return { none: "rejected" };

  const r = await reserve("google:text_search_pro");
  if (!r.ok) return { none: "limit" };
  try {
    const res = await f(`${API}/places:searchText`, {
      method: "POST",
      headers: headers(key, "places.id,places.displayName,places.location,places.nationalPhoneNumber,places.websiteUri"),
      body: JSON.stringify({
        textQuery: `${p.name} ${p.district ?? ""} ${p.city}`, languageCode: "tr", maxResultCount: 3,
        locationBias: { circle: { center: { latitude: p.lat, longitude: p.lng }, radius: 200 } },
      }),
      cache: "no-store", signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return { none: "error" };
    const j = await res.json() as { places?: Array<{ id: string; displayName?: { text?: string }; location?: { latitude: number; longitude: number }; nationalPhoneNumber?: string; websiteUri?: string }> };
    const scored = (j.places ?? []).filter((c) => c.location).map((c) => ({
      c, m: matchScore(
        { name: p.name, lat: p.lat!, lng: p.lng!, phone: p.phone, website: p.website },
        { name: c.displayName?.text ?? "", lat: c.location!.latitude, lng: c.location!.longitude, phone: c.nationalPhoneNumber, website: c.websiteUri },
      ),
    })).sort((a, b) => b.m.score - a.m.score);
    const best = scored[0];
    if (!best || best.m.decision === "reject") return { none: "no_match" };
    /* Aynı Google kimliği başka bir mekâna zaten bağlıysa otomatik onay verilmez. */
    const taken = await db.select({ placeId: placeIdentifiers.placeId }).from(placeIdentifiers)
      .where(and(eq(placeIdentifiers.provider, "google"), eq(placeIdentifiers.externalId, best.c.id)));
    const duplicate = taken.some((t) => t.placeId !== p.id);
    const status = best.m.decision === "auto" && !duplicate ? "auto" : "pending";
    const idRow = uuidv7();
    await db.insert(placeIdentifiers).values({
      id: idRow, placeId: p.id, provider: "google", externalId: best.c.id,
      matchScore: best.m.score, matchMethod: `text_search_pro name=${best.m.name} d=${best.m.distanceM}m`, status,
    }).onConflictDoNothing();
    if (status === "pending") {
      await db.insert(moderationQueue).values({
        id: uuidv7(), kind: "identifier_match", refTable: "place_identifiers", refId: idRow,
        reason: `Google adayı: "${best.c.displayName?.text ?? "?"}", ${best.m.distanceM} m, puan ${best.m.score}${duplicate ? " · bu Google kaydı başka bir mekâna da bağlı" : ""}`,
      });
      return { none: "pending_review" };
    }
    return { id: best.c.id };
  } catch {
    return { none: "error" };
  }
}

/** Canlı Google bilgisi: puan, en çok 5 yorum (Google sırası), en çok 2 fotoğraf. Hiçbir şey saklanmaz. */
export async function fetchGooglePlace(slug: string, f: typeof fetch = fetch): Promise<GoogleStatus> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !googleEnabled()) return { state: "disabled" };
  const id = await resolveGooglePlaceId(slug, key, f);
  if ("none" in id) {
    if (id.none === "limit") return { state: "limit", reason: "match_budget" };
    if (id.none === "error" || id.none === "no_db") return { state: "error" };
    return { state: "unmatched", reason: id.none };
  }

  const d0 = await reserve("google:details_atmosphere");
  if (!d0.ok) return { state: "limit", reason: d0.reason };
  try {
    const d = await f(`${API}/places/${encodeURIComponent(id.id)}?languageCode=tr`, {
      headers: headers(key, "rating,userRatingCount,googleMapsUri,reviews,photos"),
      cache: "no-store", signal: AbortSignal.timeout(6000),
    });
    if (!d.ok) return { state: "error" };
    const p = await d.json() as {
      rating?: number; userRatingCount?: number; googleMapsUri?: string;
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
        rating: p.rating, count: p.userRatingCount, mapsUri: p.googleMapsUri, photos,
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
  return db.select({ id: placeIdentifiers.id, slug: places.slug, name: places.name, externalId: placeIdentifiers.externalId, score: placeIdentifiers.matchScore, method: placeIdentifiers.matchMethod })
    .from(placeIdentifiers).innerJoin(places, eq(places.id, placeIdentifiers.placeId))
    .where(and(eq(placeIdentifiers.provider, "google"), inArray(placeIdentifiers.status, ["pending"])));
}
