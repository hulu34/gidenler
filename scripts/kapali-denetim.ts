/* Kapalı işletme denetimi (ağsız): kesin kapalı (closed_confirmed) mekânlar genel önerilerde çıkıyor mu?
   Ad ile arama profili bulabilir (kapanış notuyla); genel sorgu, Keşfet, kategori ve Sor havuzunda çıkmamalı.
   Çalıştırma: npx tsx scripts/kapali-denetim.ts  → çıkış kodu 0 = sorun yok */
import { CLOSED_CONFIRMED } from "@/lib/closure";
import { listAllCards, listCards } from "@/lib/api";
import { searchV3 } from "@/lib/search";
import { VENUES } from "@/lib/sor/engine";
import { activeEntities } from "@/data/real";

const closed = [...CLOSED_CONFIRMED];
const cards = listCards();
const inCards = cards.filter((c) => CLOSED_CONFIRMED.has(c.entity.slug)).length;
const GENERAL = ["kebap", "balık", "meyhane", "kahvaltı", "pide", "kahve", "köfte", "Kadıköy", "Beşiktaş", "Beyoğlu", "Fatih", "Üsküdar", "ocakbaşı", "esnaf lokantası", "tatlı", "burger"];
const leaks: Record<string, string[]> = {};
for (const q of GENERAL) {
  const r = searchV3(q, { limit: 60 });
  const hit = [...r.exact, ...r.adjacent].map((h) => h.card.entity.slug).filter((s) => CLOSED_CONFIRMED.has(s));
  if (hit.length) leaks[q] = hit;
}
const named = closed.filter((s) => { const c = listAllCards().find((x) => x.entity.slug === s); return c && searchV3(c.entity.name, { limit: 10 }).exact.some((h) => h.card.entity.slug === s); }).length;
const sor = VENUES.filter((v) => CLOSED_CONFIRMED.has(v.slug)).length;
const active = activeEntities.filter((e) => CLOSED_CONFIRMED.has(e.slug)).length;
const out = { closedConfirmed: closed.length, inCardPool: inCards, generalQueryLeaks: Object.values(leaks).flat().length, leakQueries: leaks, findableByName: named, inSorPool: sor, inActivePool: active };
console.log(JSON.stringify(out, null, 1));
process.exit(out.generalQueryLeaks || sor || active ? 1 : 0);
