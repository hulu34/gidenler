"use client";

import { useEffect } from "react";
import { applyAccountStates, getRelationships, setRemoteSync } from "@/lib/store";
import { isAccountEntity, planImport, readPending, serverToLocal, slugOf, toServerState, writePending } from "@/lib/community/sync";
import type { PlaceState, PlaceStateRow } from "@/lib/community/placeStatus";
import { setAccountStatus } from "@/lib/community/accountState";

/* HESAP EŞİTLEMESİ — giriş yapılmışsa Kaydet / Gitmek istiyorum / Gittim hesapta saklanır.
   Sayfa açılınca: bekleyen değişiklikler gönderilir → hesaptaki durumlar alınır → hesapta olmayan yerel
   seçimler bir kez aktarılır → hesap durumları bu cihaza uygulanır. Sonraki her değişiklik hesaba da yazılır.
   Giriş yoksa ya da kimlik kapalıysa hiçbir şey yapmaz (site bugünkü gibi yerel çalışır). Görsel çıktısı yok. */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const API = `${BASE}/api/me/places/`;
const post = (body: unknown) => fetch(API, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export function AccountSync() {
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch(`${BASE}/api/auth/get-session/`, { cache: "no-store", credentials: "same-origin" }).catch(() => null);
      const s = res?.ok ? await res.json().catch(() => null) as { user?: { id: string } } | null : null;
      if (!alive) return;
      if (!res?.ok) { setAccountStatus("off"); return; }
      if (!s?.user) { setAccountStatus("anon"); return; }
      setAccountStatus("in");
      const pending = readPending();
      for (const [slug, state] of Object.entries(pending)) {
        const r = await post({ slug, state }).catch(() => null);
        if (r && (r.ok || r.status === 404 || r.status === 400)) delete pending[slug];
      }
      writePending(pending);
      const g = await fetch(API, { cache: "no-store", credentials: "same-origin" }).catch(() => null);
      if (!alive || !g?.ok) return;
      let rows = ((await g.json()) as { states: PlaceStateRow[] }).states;
      const items = planImport(getRelationships(), rows);
      if (items.length) {
        const r = await post({ import: items }).catch(() => null);
        if (r?.ok) rows = ((await r.json()) as { states: PlaceStateRow[] }).states;
      }
      if (!alive) return;
      applyAccountStates(serverToLocal(rows));
      setRemoteSync((entityId, state) => {
        if (!isAccountEntity(entityId)) return;
        const slug = slugOf(entityId), st: PlaceState = toServerState(state);
        post({ slug, state: st }).then((r) => {
          if (r.ok || r.status === 404 || r.status === 400) return;
          if (r.status !== 401) writePending({ ...readPending(), [slug]: st });
        }).catch(() => writePending({ ...readPending(), [slug]: st }));
      });
    })();
    return () => { alive = false; setRemoteSync(null); };
  }, []);
  return null;
}
