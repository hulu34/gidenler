import type { UserEntityRelationship, UserEntityState } from "@/lib/types";
import type { PlaceState, PlaceStateRow } from "./placeStatus";

/* Hesap eşitlemesinin saf kuralları (istemci bileşeni ve testler aynı kodu kullanır).
   · Yalnız gerçek mekânlar ("ent.r.<slug>") hesaba gider; demo kayıtlar hiçbir zaman.
   · Hesap kazanır: hesapta kaydı olan mekânın yerel durumu hesabınkiyle değiştirilir.
   · İlk girişte yalnız hesapta HİÇ kaydı olmayan yerel seçimler aktarılır. */

const PREFIX = "ent.r.";
export const isAccountEntity = (id: string) => id.startsWith(PREFIX) && /^[a-z0-9-]+$/.test(id.slice(PREFIX.length));
export const slugOf = (id: string) => id.slice(PREFIX.length);
export const entityOf = (slug: string) => `${PREFIX}${slug}`;
export const toServerState = (s: UserEntityState): PlaceState => (s === "experienced" ? "visited" : s);

export function planImport(local: Record<string, UserEntityRelationship>, server: PlaceStateRow[]) {
  const known = new Set(server.map((r) => r.slug));
  return Object.values(local)
    .filter((r) => isAccountEntity(r.entityId) && r.state !== "none" && !known.has(slugOf(r.entityId)))
    .map((r) => ({ slug: slugOf(r.entityId), state: toServerState(r.state) }))
    .slice(0, 500);
}

export function serverToLocal(rows: PlaceStateRow[]): Record<string, UserEntityState> {
  return Object.fromEntries(rows.map((r) => [entityOf(r.slug), r.state as UserEntityState]));
}

/* Gönderilemeyen değişiklikler (ağ hatası): bir sonraki açılışta hesaba yeniden yazılır. */
const PENDING = "gidenler.bekleyen.v1";
export function readPending(): Record<string, PlaceState> {
  try { const v = JSON.parse(window.localStorage.getItem(PENDING) ?? "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch { return {}; }
}
export function writePending(p: Record<string, PlaceState>) {
  try { if (Object.keys(p).length) window.localStorage.setItem(PENDING, JSON.stringify(p)); else window.localStorage.removeItem(PENDING); } catch { /* depolama kapalı */ }
}
