import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { places, userPlaceStatus } from "@/lib/db/schema";

/* ==========================================================================
   KAYDET · GİTMEK İSTİYORUM · GİTTİM — hesapta kalıcı (user_place_status).
   --------------------------------------------------------------------------
   · Yalnız gerçek mekânlar (places tablosu); demo kayıtlar sunucuya hiç gitmez.
   · Arayüzde tek durum vardır; tabloda üç bayrak: saved → favorite, want_to_go → want_to_go, visited → visited.
     "Deneyim yazdım" yayınlama açılana kadar sunucuda "visited" sayılır.
   · Satır silinmez: "none" bütün bayrakları kapatır (kullanıcının son kararı korunur, yeniden aktarılmaz).
   · Kendi beyanıdır; ziyaret DOĞRULAMASI değildir (bkz. lib/visits/verify.ts).
   ========================================================================== */

export const PLACE_STATES = ["none", "saved", "want_to_go", "visited"] as const;
export type PlaceState = (typeof PLACE_STATES)[number];

const flagsOf = (s: PlaceState) => ({ favorite: s === "saved", wantToGo: s === "want_to_go", visited: s === "visited" });
export const stateOf = (r: { favorite: boolean; wantToGo: boolean; visited: boolean }): PlaceState =>
  r.visited ? "visited" : r.wantToGo ? "want_to_go" : r.favorite ? "saved" : "none";

export interface PlaceStateRow { slug: string; state: PlaceState; updatedAt: string }

/** Kullanıcının bütün kayıtları ("none" dahil: istemci, sunucuda kapatılmış durumu yerelde de kapatır). */
export async function listPlaceStates(db: Db, userId: string): Promise<PlaceStateRow[]> {
  const rows = await db.select({ slug: places.slug, favorite: userPlaceStatus.favorite, wantToGo: userPlaceStatus.wantToGo, visited: userPlaceStatus.visited, updatedAt: userPlaceStatus.updatedAt })
    .from(userPlaceStatus).innerJoin(places, eq(places.id, userPlaceStatus.placeId)).where(eq(userPlaceStatus.userId, userId));
  return rows.map((r) => ({ slug: r.slug, state: stateOf(r), updatedAt: r.updatedAt.toISOString() }));
}

async function placeIds(db: Db, slugs: string[]) {
  if (!slugs.length) return new Map<string, string>();
  const rows = await db.select({ id: places.id, slug: places.slug }).from(places).where(and(inArray(places.slug, slugs), eq(places.status, "active")));
  return new Map(rows.map((r) => [r.slug, r.id]));
}

/** Tek mekânın durumunu yazar (son karar geçerli). Bilinmeyen mekân → unknown_place. */
export async function setPlaceState(db: Db, userId: string, slug: string, state: PlaceState): Promise<{ ok: true; state: PlaceState } | { ok: false; error: "unknown_place" }> {
  const id = (await placeIds(db, [slug])).get(slug);
  if (!id) return { ok: false, error: "unknown_place" };
  const f = flagsOf(state);
  await db.insert(userPlaceStatus).values({ userId, placeId: id, ...f, visitCount: f.visited ? 1 : 0 })
    .onConflictDoUpdate({
      target: [userPlaceStatus.userId, userPlaceStatus.placeId],
      set: { ...f, visitCount: f.visited ? sql`greatest(${userPlaceStatus.visitCount}, 1)` : userPlaceStatus.visitCount, updatedAt: new Date() },
    });
  return { ok: true, state };
}

/** İlk girişte bu cihazdaki seçimleri hesaba aktarır: YALNIZ hesapta hiç kaydı olmayan mekânlar (hesap kazanır).
    Bilinmeyen mekânlar ve "none" atlanır. Dönen değer: eklenen kayıt sayısı. */
export async function importPlaceStates(db: Db, userId: string, items: Array<{ slug: string; state: PlaceState }>): Promise<number> {
  const wanted = items.filter((i) => i.state !== "none");
  const ids = await placeIds(db, [...new Set(wanted.map((i) => i.slug))]);
  const values = wanted.filter((i) => ids.has(i.slug)).map((i) => ({ userId, placeId: ids.get(i.slug)!, ...flagsOf(i.state), visitCount: i.state === "visited" ? 1 : 0 }));
  if (!values.length) return 0;
  const seen = new Set<string>();
  const unique = values.filter((v) => (seen.has(v.placeId) ? false : (seen.add(v.placeId), true)));
  const res = await db.insert(userPlaceStatus).values(unique).onConflictDoNothing().returning({ placeId: userPlaceStatus.placeId });
  return res.length;
}
