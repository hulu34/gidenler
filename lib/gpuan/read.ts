import { unstable_cache } from "next/cache";
import { isClosed } from "@/lib/closure";
import { and, eq, gte, inArray, isNull } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db/client";
import { googleRatings, placeIdentifiers, places } from "@/lib/db/schema";
import { DEMO_VISIBLE } from "@/data/demoFlag";
import { latestDecisions } from "./decisions";

/* ──────────────────────────────────────────────────────────────────────────
   GÖRÜNTÜLEME KATMANI — sitenin Google puanı için tek okuma noktası.
   · Kaynağı bilmez (bugün Excel aktarımı; yatırım sonrası başka kaynak). Yalnız google_ratings tablosunu okur.
   · Sayfa açılışında Excel okunmaz, Google'a istek gitmez; sonuç önbellekte, aktarım bitince TAG_GPUAN ile yenilenir.
   · Gösterim şartı: kayıtlı place ID bugün de onaylı/otomatik Google eşleşmesi olmalı (eşleşme reddedilir ya da
     değişirse puan kendiliğinden gizlenir) ve son başarılı kontrol 45 günden eski olmamalı.
   · Google puanı 5 üzerinden; Gidenler puanıyla (10 üzerinden) hiçbir yerde birleşmez.
   ────────────────────────────────────────────────────────────────────────── */
export const TAG_GPUAN = "google-ratings";
export const STALE_DAYS = 45;
export interface GRating { rating: number; count: number | null; checkedAt: string; mapsUrl: string | null }
export type GRatingMap = Record<string, GRating>;

/** Doğrudan okuma (önbelleksiz; testler ve yönetim).
    Gösterim: gizlenmemiş (hidden_reason boş), 45 günden taze, ve place ID bugün de onaylı/otomatik eşleşme —
    ya da eşleşme onay bekliyorsa aynı place ID için son yönetici kararı "onay". */
export async function loadGoogleRatings(db: Db): Promise<GRatingMap> {
    const rows = await db.select({ slug: googleRatings.slug, placeId: googleRatings.placeId, rating: googleRatings.rating, count: googleRatings.reviewCount, checkedAt: googleRatings.checkedAt, mapsUrl: googleRatings.mapsUrl, idStatus: placeIdentifiers.status })
      .from(googleRatings)
      .innerJoin(places, eq(places.slug, googleRatings.slug))
      .innerJoin(placeIdentifiers, and(eq(placeIdentifiers.placeId, places.id), eq(placeIdentifiers.provider, "google"), eq(placeIdentifiers.externalId, googleRatings.placeId), inArray(placeIdentifiers.status, ["auto", "confirmed", "pending"])))
      .where(and(gte(googleRatings.checkedAt, new Date(Date.now() - STALE_DAYS * 864e5)), isNull(googleRatings.hiddenReason)));
    const decided = await latestDecisions(db);
    const out: GRatingMap = {};
    for (const r of rows) {
      const d = decided.get(r.slug); const dec = d && d.placeId === r.placeId ? d.decision : null;
      if (dec === "ret") continue;
      if (isClosed(r.slug)) continue;   // kesin kapalı işletmede Google puanı gösterilmez (kapanış notu yeterli)
      if (r.idStatus === "pending" && dec !== "onay") continue;
      out[r.slug] = { rating: r.rating, count: r.count, checkedAt: r.checkedAt.toISOString(), mapsUrl: r.mapsUrl };
    }
    return out;
}

export const googleRatingMap = unstable_cache(async (): Promise<GRatingMap> => {
  const db = getDb();
  if (!db || DEMO_VISIBLE) return {};
  try { return await loadGoogleRatings(db); } catch { return {}; }
}, ["google-ratings-v2"], { revalidate: 3600, tags: [TAG_GPUAN] });

export async function googleRatingOf(slug: string): Promise<GRating | null> {
  return (await googleRatingMap())[slug] ?? null;
}

/** "4,6" biçimi (tr-TR, tek ondalık). */
export const fmtG = (x: number) => x.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** "5 Kas 2026" */
export const fmtGDate = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });
/** Sıralamaya girmek için en az bu kadar Google değerlendirmesi. */
export const MIN_RANK_REVIEWS = 100;
