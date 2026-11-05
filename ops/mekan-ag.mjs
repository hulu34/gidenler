/* MEKÂN DENETİMİ · ağ kısmı (ücretsiz): web sitesi bağlantıları + Production Google eşleşme durumu (yalnız okuma, Google'a istek YOK).
   Çıktı: out/mekan/ag.json (şifreli). Log: yalnız sayılar. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const OUT = "out/mekan"; mkdirSync(OUT, { recursive: true });
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const recs = [...JSON.parse(readFileSync("app/data/real/venues.json", "utf8")), ...JSON.parse(readFileSync("app/data/real/isletme.json", "utf8"))];
const A = `https://${process.env.PROD_DEPLOY}/api/admin/db/`;
const gslug = await (await fetch(`${A}?rapor=google-slug`, { headers: HB })).json().catch(() => ({}));
const grep = await (await fetch(`${A}?rapor=google`, { headers: HB })).json().catch(() => ({}));
console.log("google env", gslug.env, "kullanılabilir", (gslug.slugs ?? []).length, "bekleyen", (grep.pending ?? []).length, JSON.stringify(grep.stats));
const UA = "Mozilla/5.0 (compatible; GidenlerLinkCheck/1.0; +https://www.gidenler.com)";
async function check(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const r = await fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(10000), headers: { "user-agent": UA, accept: "text/html,*/*" } });
      if (method === "HEAD" && (r.status === 405 || r.status === 403 || r.status === 400)) continue;
      return { status: r.status, final: r.url !== url ? r.url : undefined };
    } catch (e) { if (method === "GET") return { status: 0, error: String(e?.cause?.code ?? e?.name ?? e).slice(0, 40) }; }
  }
  return { status: 0, error: "?" };
}
const sites = recs.filter((r) => r.website).map((r) => ({ slug: r.slug, url: r.website }));
const res = {}; let i = 0;
await Promise.all(Array.from({ length: 12 }, async () => { while (i < sites.length) { const s = sites[i++]; res[s.slug] = { url: s.url, ...(await check(s.url)) }; } }));
const dist = Object.values(res).reduce((m, x) => { const k = x.status === 0 ? `hata:${x.error}` : String(x.status).replace(/\d\d$/, "xx"); m[k] = (m[k] ?? 0) + 1; return m; }, {});
console.log("web sitesi", sites.length, JSON.stringify(dist));
writeFileSync(`${OUT}/ag.json`, JSON.stringify({ googleUsable: gslug.slugs ?? [], googlePending: (grep.pending ?? []).map((p) => p.slug ?? p.placeSlug ?? p.place?.slug ?? null), googleStats: grep.stats, links: res }, null, 1));
