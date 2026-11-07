/* SENTETİK YÜK TESTİ — ağsız, veritabanısız, yalnız bellekte. Gerçek mekân EKLEMEZ, hiçbir yere yazmaz.
   Mevcut 456 gerçek mekân kopyalanarak N kayda çıkarılır (slug sonuna "-sentetik-k", ad sonuna " S<k>", koordinat ±kaydırma)
   ve aynı kod yolları ölçülür: arama dizini + sorgu, Sor Gidenler aday bulma, kart havuzu, sitemap, Google puan Excel'i.
   Kullanım: N=2000 npx tsx scripts/yuk-testi.ts  (N=456 taban ölçüm) */
import { performance } from "node:perf_hooks";
import { entities } from "@/data/entities";
import { realEntities } from "@/data/real";
import { VENUES, parseQuery, answer } from "@/lib/sor/engine";
import { listCards } from "@/lib/api";
import { searchV3 } from "@/lib/search";
import { baseRow, withDerived, dueRows, CONFIDENCE, type Venue as GVenue } from "@/lib/gpuan/core";
import { writeWorkbook, readWorkbook } from "@/lib/gpuan/excel";
import { SITE, inVenueSitemap } from "@/lib/seo";

const N = Number(process.env.N ?? 2000);
const base = realEntities.length, baseV = VENUES.length;
const jitter = (k: number) => ((k * 7919) % 200 - 100) / 10000; // ±0,01° ≈ ±1 km
for (let k = 1; realEntities.length < N; k++) {
  for (const e of realEntities.slice(0, base)) {
    if (realEntities.length >= N) break;
    const c = { ...e, id: `${e.id}-s${k}`, slug: `${e.slug}-sentetik-${k}`, name: `${e.name} S${k}`, isDemo: false,
      location: e.location ? { ...e.location, geo: e.location.geo ? { ...e.location.geo, lat: e.location.geo.lat + jitter(k), lng: e.location.geo.lng + jitter(k + 3) } : e.location.geo } : e.location } as typeof e;
    realEntities.push(c); entities.push(c);
  }
}
for (let k = 1; VENUES.length < Math.round((N * baseV) / base); k++) for (const v of VENUES.slice(0, baseV)) { if (VENUES.length >= Math.round((N * baseV) / base)) break; VENUES.push({ ...v, slug: `${v.slug}-sentetik-${k}`, name: `${v.name} S${k}` }); }

const t = async <T,>(f: () => T | Promise<T>) => { const s = performance.now(); const r = await f(); return { ms: Math.round((performance.now() - s) * 10) / 10, r }; };
const Q = ["kebap kadıköy", "balık beşiktaş", "sakin kahve", "pide fatih", "meyhane beyoğlu", "ucuz esnaf lokantası", "kahvaltı üsküdar", "burger", "çiya", "pandeli"];
const SQ = ["Kadıköy'de akşam yemeği", "Beşiktaş'ta balık", "ucuz kebap Fatih", "sakin bir kahveci", "Beyoğlu'nda meyhane", "kahvaltı için Üsküdar", "dürüm", "vejetaryen", "geç saatte açık", "aile ile pide"];
(async () => {
  const mem0 = process.memoryUsage().heapUsed;
  const cards = await t(() => listCards().length);
  const first = await t(() => searchV3("kebap").exact.length);   // dizin kurulumu dahil
  const qs: number[] = []; for (let i = 0; i < 3; i++) for (const q of Q) qs.push((await t(() => searchV3(q, { limit: 60 }))).ms);
  const ss: number[] = []; for (const q of SQ) ss.push((await t(() => answer(parseQuery(q)))).ms);
  /* sitemap mekân bölümü (profil önbelleği Next dışında çalışmadığı için adres kontrolü kimlik verisiyle) */
  const sm = await t(() => realEntities.filter((e) => e.isReal && !e.isDemo && inVenueSitemap(e)).map((e) => ({ url: `${SITE}/mekan/${e.slug}/` })));
  const gv: GVenue[] = realEntities.map((e) => ({ slug: e.slug, name: e.name, categoryId: e.categoryId, kind: null, cuisine: [], district: e.location?.district ?? null, address: null, lat: e.location?.geo?.lat ?? 0, lng: e.location?.geo?.lng ?? 0 }));
  const rows = gv.map((v) => ({ ...baseRow(v, { placeId: `ChIJ${v.slug.slice(0, 20)}`, confidence: CONFIDENCE.auto }), rating: 4.2, checkedAt: new Date().toISOString() }));
  const der = await t(() => withDerived(rows, new Map()).length);
  const due = await t(() => dueRows(rows, "2099-01-01", 100000).length);
  const xw = await t(() => writeWorkbook(rows, { generatedAt: new Date().toISOString(), note: "sentetik" }));
  const xr = await t(() => readWorkbook(xw.r));
  const p = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return { p50: s[Math.floor(s.length / 2)], p95: s[Math.min(s.length - 1, Math.floor(s.length * 0.95))], max: s[s.length - 1] }; };
  const payloadKB = Math.round(JSON.stringify(listCards().map((c) => c.entity)).length / 1024);
  console.log(JSON.stringify({
    N, venues: realEntities.length, sorPool: VENUES.length, cards: cards.r, cardsMs: cards.ms,
    searchFirstMs: first.ms, search: p(qs), sor: p(ss), sitemapMs: sm.ms, sitemapUrls: sm.r.length,
    excel: { rows: rows.length, writeMs: xw.ms, readMs: xr.ms, kb: Math.round(xw.r.length / 1024), readOk: xr.r.rows.length === rows.length && !xr.r.errors.length },
    derivedMs: der.ms, dueMs: due.ms, entityPayloadKB: payloadKB, heapMB: Math.round((process.memoryUsage().heapUsed - mem0) / 1048576),
  }));
})();
