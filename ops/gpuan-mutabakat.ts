/* EXCEL ↔ VERİTABANI ↔ SİTE MUTABAKATI — yalnız okuma (GET). Uygulama klasöründe çalışır (app/), kendi kütüphanesiyle.
   Log: yalnız sayılar. Ayrıntı (ad/slug) out/mutabakat.json'a yazılır ve şifrelenir. */
import { mkdirSync, writeFileSync } from "node:fs";
import { readWorkbook } from "./lib/gpuan/excel";
import { withDerived, FINAL, type Decision, type GoogleId } from "./lib/gpuan/core";
import { CLOSURES, CLOSED_CONFIRMED } from "./lib/closure";

const B = `https://${process.env.HOST}`, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS ?? "" };
const get = (p: string) => fetch(B + p, { headers: H, cache: "no-store" });
const j = async <T,>(p: string) => (await (await get(p)).json()) as T;

(async () => {
  const rapor = await j<{ env: string; site: { shown: number; hidden: number; stale: number }; final: Record<string, number>; lastImport: { at: string; status: string } | null; file: { createdAt: string; rows: number } | null }>("/api/admin/google-puan/?rapor=gunluk");
  const kimlik = await j<{ ids: Record<string, GoogleId[]> }>("/api/admin/google-puan/?rapor=kimlik");
  const kararlar = await j<{ decisions: Decision[] }>("/api/admin/google-puan/?rapor=kararlar");
  const fr = await get("/api/admin/google-puan/?dosya=son");
  const buf = Buffer.from(await fr.arrayBuffer());
  const wb = await readWorkbook(buf);
  const dec = new Map(kararlar.decisions.map((d) => [d.slug, d]));
  const rows = withDerived(wb.rows, dec, CLOSURES as never);
  const slugs = rows.map((r) => r.slug);
  const excelShown = new Map(rows.filter((r) => r.finalState === FINAL.shown).map((r) => [r.slug, r.rating]));

  /* aynı place ID iki mekânda (reddedilmemiş) */
  const owner = new Map<string, string[]>();
  for (const [s, xs] of Object.entries(kimlik.ids)) for (const x of xs) if (x.status !== "rejected") owner.set(x.externalId, [...(owner.get(x.externalId) ?? []), s]);
  const dupIds = [...owner.entries()].filter(([, s]) => new Set(s).size > 1).map(([id, s]) => ({ id: id.slice(0, 6) + "…", slugs: [...new Set(s)] }));

  /* her profil: HTTP durumu, kayıtlı Google puanı ve değeri, kapanış notu */
  const site = new Map<string, { code: number; rating: number | null; closedNote: boolean }>();
  let i = 0;
  const worker = async () => {
    while (i < slugs.length) {
      const s = slugs[i++];
      const r = await get(`/mekan/${s}/`); const t = r.ok ? await r.text() : "";
      const m = /data-google-kayitli[\s\S]{0,1600}?text-ink">([1-5],\d)</.exec(t);
      site.set(s, { code: r.status, rating: m ? Number(m[1].replace(",", ".")) : null, closedNote: /data-kapanis="kesin"/.test(t) });
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  const siteShown = new Map([...site.entries()].filter(([, v]) => v.rating != null).map(([s, v]) => [s, v.rating!]));
  const onlyExcel = [...excelShown.keys()].filter((s) => !siteShown.has(s));
  const onlySite = [...siteShown.keys()].filter((s) => !excelShown.has(s));
  const ratingDiff = [...excelShown.entries()].filter(([s, r]) => siteShown.has(s) && siteShown.get(s) !== r).map(([s, r]) => ({ slug: s, excel: r, site: siteShown.get(s) }));
  const non200 = [...site.entries()].filter(([, v]) => v.code !== 200).map(([s, v]) => ({ slug: s, code: v.code }));

  /* kesin kapalı: profil açık + not var; ana sayfa ve Keşfet'te bağlantı yok */
  const closed = [...CLOSED_CONFIRMED];
  const closedNoNote = closed.filter((s) => !site.get(s)?.closedNote);
  const closedRated = closed.filter((s) => siteShown.has(s));
  const pageLeaks: Record<string, string[]> = {};
  for (const p of ["/", "/kesfet/", "/kategori/restoran/", "/gidenler-100/"]) {
    const r = await get(p); const t = r.ok ? await r.text() : "";
    const hit = closed.filter((s) => t.includes(`/mekan/${s}/`) || t.includes(`/mekan/${s}"`));
    pageLeaks[`${p} (${r.status})`] = hit;
  }
  const sm = await (await get("/sitemap.xml")).text();
  const sitemapClosed = closed.filter((s) => sm.includes(`/mekan/${s}/`)).length;

  const out = {
    env: rapor.env, at: new Date().toISOString(),
    excel: { http: fr.status, bytes: buf.length, format: wb.format, errors: wb.errors.length, rows: rows.length, uniqueSlugs: new Set(slugs).size, shown: excelShown.size, final: Object.fromEntries(Object.values(FINAL).map((f) => [f, rows.filter((r) => r.finalState === f).length])) },
    db: { shown: rapor.site.shown, hidden: rapor.site.hidden, stale: rapor.site.stale, lastImport: rapor.lastImport, file: rapor.file },
    site: { profiles: site.size, non200: non200.length, shown: siteShown.size },
    compare: { onlyExcel, onlySite, ratingDiff, dupIds },
    closed: { confirmed: closed.length, noNote: closedNoNote, withRating: closedRated, pageLeaks, inSitemap: sitemapClosed },
  };
  mkdirSync("../out", { recursive: true }); writeFileSync("../out/mutabakat.json", JSON.stringify(out, null, 1));
  console.log("excel", JSON.stringify({ http: out.excel.http, rows: out.excel.rows, unique: out.excel.uniqueSlugs, shown: out.excel.shown, errors: out.excel.errors }));
  console.log("db", JSON.stringify({ shown: out.db.shown, hidden: out.db.hidden, stale: out.db.stale, import: rapor.lastImport?.status }));
  console.log("site", JSON.stringify({ profiles: out.site.profiles, non200: out.site.non200, shown: out.site.shown }));
  console.log("fark", JSON.stringify({ onlyExcel: onlyExcel.length, onlySite: onlySite.length, ratingDiff: ratingDiff.length, dupIds: dupIds.length }));
  console.log("kapali", JSON.stringify({ confirmed: closed.length, noNote: closedNoNote.length, withRating: closedRated.length, leaks: Object.fromEntries(Object.entries(pageLeaks).map(([k, v]) => [k, v.length])), inSitemap: sitemapClosed }));
})();
