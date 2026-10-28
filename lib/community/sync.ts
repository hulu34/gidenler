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

/* Gönderilemeyen değişiklikler (ağ hatası): bir sonraki açılışta hesaba yeniden yazılır. Her kayıt değişikliğin
   YAPILDIĞI anı taşır; sunucu, kendi kaydı daha yeniyse (ör. başka cihazdan sonradan değiştirildiyse) eskisini yazmaz. */
export interface PendingChange { state: PlaceState; at: string }
const PENDING = "gidenler.bekleyen.v2";
export function readPending(): Record<string, PendingChange> {
  try {
    const v = JSON.parse(window.localStorage.getItem(PENDING) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([, c]) => c && typeof (c as PendingChange).state === "string" && typeof (c as PendingChange).at === "string")) as Record<string, PendingChange> : {};
  } catch { return {}; }
}
export function writePending(p: Record<string, PendingChange>) {
  try { if (Object.keys(p).length) window.localStorage.setItem(PENDING, JSON.stringify(p)); else window.localStorage.removeItem(PENDING); } catch { /* depolama kapalı */ }
}

type Post = (body: unknown) => Promise<{ ok: boolean; status: number }>;

/** Bekleyenleri gönderir; kalıcı hata (400/404: geçersiz/bilinmeyen) düşer, ağ/sunucu hatası ve oturum yokluğu bekler.
    Döndürülen: hâlâ bekleyenler. */
export async function replayPending(post: Post, pending: Record<string, PendingChange>) {
  const left: Record<string, PendingChange> = {};
  for (const [slug, c] of Object.entries(pending)) {
    const r = await post({ slug, state: c.state, at: c.at }).catch(() => null);
    if (r && (r.ok || r.status === 400 || r.status === 404)) continue;
    left[slug] = c;
  }
  return left;
}

/** Tek değişikliği gönderir; olmazsa bekleyenlere ekler (oturum kapandıysa da: bir sonraki girişte aynı hesaba gider). */
export async function pushChange(post: Post, slug: string, state: PlaceState, at: string, store: { read: () => Record<string, PendingChange>; write: (p: Record<string, PendingChange>) => void }) {
  const r = await post({ slug, state, at }).catch(() => null);
  if (r && (r.ok || r.status === 400 || r.status === 404)) return true;
  store.write({ ...store.read(), [slug]: { state, at } });
  return false;
}

/** Çıkış: önce bekleyenler gönderilir; gönderilemeyen varsa kullanıcıya sorulur. Çıkış isteği BAŞARISIZSA hiçbir
    yerel veri silinmez (kullanıcı hâlâ girişli). Yerel hesap verisi yalnız çıkış başarıyla tamamlanınca silinir. */
export async function signOutFlow(d: {
  flush: () => Promise<Record<string, PendingChange>>;
  confirmLoss: (n: number) => boolean;
  signOut: () => Promise<boolean>;
  clearLocal: () => void;
}): Promise<"signed_out" | "cancelled" | "failed"> {
  const left = await d.flush();
  if (Object.keys(left).length && !d.confirmLoss(Object.keys(left).length)) return "cancelled";
  if (!(await d.signOut())) return "failed";
  d.clearLocal();
  return "signed_out";
}
