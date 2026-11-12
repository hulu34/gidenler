/* TÜR VE KATEGORİ · RESMÎ SİTE TANIMI — tür ya da kategori sorunu olan kayıtların kayıtlı resmî sitesinde işletmenin KENDİ
   tanımı okunur (paket 14 yöntemi): sayfa başlığı, meta açıklama, og:title/og:description, ilk iki h1 ve JSON-LD
   (@type, servesCuisine). Gövde metni saklanmaz; yalnız bu kısa üst bilgiler (en çok 300 karakter) ve ad eşleşmesi tutulur.
   Bulunamazsa "hakkımızda" ya da "menü" bağlantılarından en çok 2 iç sayfanın üst bilgisi de okunur.
   Alan adı başına istekler sırayla; 403/429 yeniden denenmez, bot engeli aşılmaz.
   Kullanım: npx tsx scripts/katalog/tur-site.mjs <hedef.txt> <cikti.json> */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fold, coreName, siteKey } from "../../lib/katalog/aday.ts";
const [hedefP, out] = process.argv.slice(2);
const V = JSON.parse(readFileSync("data/real/venues.json", "utf8"));
const FIX = JSON.parse(readFileSync("data/real/duzeltmeler.json", "utf8"));
const H = new Set(readFileSync(hedefP, "utf8").split(/\s+/).filter(Boolean));
const prev = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};
const siteOf = (v) => (FIX[v.slug] && "website" in FIX[v.slug] ? FIX[v.slug].website : v.website) ?? null;
const paylasim = {}; for (const v of V) { const k = siteKey(siteOf(v) ?? undefined); if (k) paylasim[k] = (paylasim[k] ?? 0) + 1; }
const hedef = V.filter((v) => H.has(v.slug) && siteOf(v) && !prev[v.slug]);
const UA = "Mozilla/5.0 (compatible; GidenlerKatalog/1.0; +https://www.gidenler.com/)";
async function get(url) {
  const c = new AbortController(); const tm = setTimeout(() => c.abort(), 15000);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*", "accept-language": "tr,en;q=0.8" }, redirect: "follow", signal: c.signal });
    const ct = r.headers.get("content-type") ?? "";
    return { status: r.status, final: r.url, body: /html|text/.test(ct) ? (await r.text()).slice(0, 1_500_000) : "" };
  } catch (e) { return { status: 0, final: url, body: "", err: String(e.cause?.code ?? e.name ?? e).slice(0, 40) }; } finally { clearTimeout(tm); }
}
const dec = (s) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#0*39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, " ").trim().slice(0, 300);
const meta = (h, re) => dec(re.exec(h)?.[1]);
function ustBilgi(h) {
  const ld = [];
  for (const m of h.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const j = JSON.parse(m[1]); for (const o of [].concat(j["@graph"] ?? j)) if (o && typeof o === "object") ld.push({ type: [].concat(o["@type"] ?? []).join(","), servesCuisine: [].concat(o.servesCuisine ?? []).join(", ") || undefined, name: o.name ? dec(String(o.name)) : undefined }); } catch { /* bozuk JSON-LD yok sayılır */ }
  }
  return {
    title: meta(h, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: meta(h, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || meta(h, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i),
    ogTitle: meta(h, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i),
    ogDescription: meta(h, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i),
    h1: [...h.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].slice(0, 2).map((m) => dec(m[1])).filter(Boolean),
    jsonld: ld.filter((x) => x.type || x.servesCuisine).slice(0, 4),
  };
}
const adVar = (v, h) => { const T = " " + fold(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")) + " "; const cn = coreName(v.name) || fold(v.name); return (cn.length >= 3 && T.includes(" " + cn + " ")) || T.includes(" " + fold(v.name) + " "); };
const res = { ...prev }; let n = 0;
async function one(v) {
  const u0 = siteOf(v); const url = u0.startsWith("http") ? u0 : `https://${u0}`;
  const h = await get(url); const denenen = [{ url, status: h.status, err: h.err }];
  const sayfalar = [];
  if (h.body) {
    sayfalar.push({ url: h.final, ...ustBilgi(h.body) });
    const links = [...new Set([...h.body.matchAll(/href=["']([^"'#]+)["']/gi)].map((x) => x[1]).filter((l) => /hakkimizda|hakkinda|about|menu|menü|biz-kimiz/i.test(l) && !/\.(pdf|jpe?g|png|webp)$/i.test(l)))].slice(0, 2);
    for (const l of links) {
      let u; try { u = new URL(l, h.final).toString(); } catch { continue; }
      if (siteKey(u) !== siteKey(h.final)) continue;
      const c = await get(u); denenen.push({ url: u, status: c.status });
      if (c.body) sayfalar.push({ url: c.final, ...ustBilgi(c.body) });
    }
  }
  res[v.slug] = { tarih: new Date().toISOString().slice(0, 10), denenen, alan: siteKey(h.final), kayitliAlan: siteKey(url), paylasilan: paylasim[siteKey(url)] ?? 1, ad: h.body ? adVar(v, h.body) : null, sayfalar };
  if (++n % 25 === 0) { console.log(n, "/", hedef.length); writeFileSync(out, JSON.stringify(res)); }
}
const gruplar = Object.values(hedef.reduce((g, v) => ((g[siteKey(siteOf(v))] ??= []).push(v), g), {}));
await Promise.all(Array.from({ length: 6 }, async () => { while (gruplar.length) { for (const v of gruplar.shift()) await one(v); } }));
writeFileSync(out, JSON.stringify(res));
const r = Object.values(res);
console.log({ hedef: hedef.length, kontrol: r.length, acildi: r.filter((x) => x.sayfalar.length).length, ad: r.filter((x) => x.ad).length });
