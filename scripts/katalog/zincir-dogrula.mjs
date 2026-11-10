/* ZİNCİR ŞUBE DOĞRULAMASI (restoran paketi). Marka etiketli ya da zincir şüpheli restoran adaylarını markanın resmî
   şube sayfalarıyla karşılaştırır. Sayfa içeriği saklanmaz; yalnız ölçüm (hangi sayfa, sokak/bölge/kapı/telefon eşleşti).
   Kullanım: npx tsx scripts/katalog/zincir-dogrula.mjs <ham-osm.json> <havuz.json> <cikti.json> [ters.json] */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { siteKey, fold } from "../../lib/katalog/aday.ts";
import { matchBranch, branchStrong, KAPSAM_DISI_ZINCIR } from "../../lib/katalog/zincir.ts";
const [rawP, hp, out, tersP] = process.argv.slice(2);
const RAW = new Map(JSON.parse(readFileSync(rawP, "utf8")).elements.map((e) => [`${e.type}/${e.id}`, e]));
const H = JSON.parse(readFileSync(hp, "utf8")).adaylar;
const TERS = tersP && existsSync(tersP) ? JSON.parse(readFileSync(tersP, "utf8")) : {};
/* OSM'de sitesi olmayan markalar için elle doğrulanmış resmî kök adresler */
const SITELER = existsSync("data/katalog/zincir-siteleri.json") ? JSON.parse(readFileSync("data/katalog/zincir-siteleri.json", "utf8")).siteler : {};
const UA = "Mozilla/5.0 (compatible; GidenlerKatalog/1.0; +https://www.gidenler.com/)";
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
const cache = new Map();
async function get(url) {
  if (cache.has(url)) return cache.get(url);
  const p = (async () => { const c = new AbortController(); const tm = setTimeout(() => c.abort(), 15000);
    try { const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*" }, redirect: "follow", signal: c.signal }); const ct = r.headers.get("content-type") ?? ""; const raw = /html|text|json/.test(ct) ? (await r.text()).slice(0, 9_000_000) : ""; return { status: r.status, final: r.url, raw, text: strip(raw) }; }
    catch (e) { return { status: 0, final: url, raw: "", text: "" }; } finally { clearTimeout(tm); } })();
  cache.set(url, p); return p;
}
const PRIORITY = /^(turkish|regional|kebab|doner|döner|pide|lahmacun|kofte|köfte|fish|seafood|steak_house|meat|grill|pizza|italian|japanese|sushi|ramen|asian|chinese|korean|breakfast|homestyle|manti|iskender|burger)$/;
const tag = (e, ...k) => k.map((x) => e.tags[x]).find(Boolean);
const brandOf = (a, e) => fold(tag(e, "brand", "brand:tr") ?? "") || siteKey(a.website) || fold(a.name);
const isRestaurant = (a, e) => a.amenity === "restaurant" || (a.amenity === "fast_food" && (e.tags.cuisine ?? "").split(";").some((c) => PRIORITY.test(c.trim())));
const chainy = (a) => a.ret.includes("zincir_marka_etiketi") || a.inceleme.some((x) => x.startsWith("zincir_suphesi"));
const C = H.filter((a) => !a.esles && chainy(a) && RAW.get(a.ref) && isRestaurant(a, RAW.get(a.ref)) && !a.ret.some((r) => r !== "zincir_marka_etiketi"));
const groups = new Map();
for (const a of C) { const e = RAW.get(a.ref); const b = brandOf(a, e); (groups.get(b) ?? groups.set(b, []).get(b)).push(a); }
console.log("zincir restoran adayı", C.length, "marka", groups.size);
const LINK = /sube|şube|subeler|şubeler|restoranlar|restoranlarimiz|lokasyon|location|magaza|branch|adres|iletisim|bize-ulasin|istanbul|bayi|nerede/i;
const res = {}; const kapsamDisi = [];
const brands = [...groups.entries()];
let bi = 0;
await Promise.all(Array.from({ length: 4 }, async () => { while (brands.length) { const [b, list] = brands.shift(); bi++;
  if (KAPSAM_DISI_ZINCIR[b]) { for (const a of list) kapsamDisi.push({ ref: a.ref, ad: a.name, ilce: a.district, marka: b, neden: KAPSAM_DISI_ZINCIR[b] }); continue; }
  /* markanın resmî kökleri: OSM brand:website / website alanlarının ana sayfaları */
  const roots = new Set(SITELER[b] ? [SITELER[b]] : []);
  for (const a of list) { const e = RAW.get(a.ref); for (const u of [tag(e, "brand:website"), a.website]) { if (!u) continue; try { const x = new URL(u); if (!siteKey(u)) continue; roots.add(`${x.protocol}//${x.host}/`); } catch {} } }
  const pages = [];
  for (const r of [...roots].slice(0, 2)) {
    const h = await get(r); if (!h.raw) continue; pages.push({ url: h.final, text: h.text, sube: false });
    const guess = ["subeler", "subelerimiz", "sube", "restoranlarimiz", "restoranlar", "lokasyonlar", "iletisim"].map((x) => new URL(`/${x}`, h.final).toString());
    const links = [...new Set([...guess, ...[...h.raw.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => { try { return new URL(m[1], h.final).toString(); } catch { return null; } }).filter((u) => u && siteKey(u) === siteKey(h.final) && LINK.test((() => { try { return decodeURIComponent(u); } catch { return u; } })()))])].slice(0, 12);
    for (const l of links) { const p = await get(l); if (p.text) pages.push({ url: p.final, text: p.text, sube: false }); }
  }
  /* ortak metin (alt bilgi, menü, genel merkez adresi) kanıt sayılmaz: ana sayfayla paylaşılan ~60 karakterlik parçalar silinir */
  const home = pages[0]?.text ?? "";
  const chunks = (t) => t.split(/(?<=[.!?|·•])\s+|\s{2,}/).map((x) => x.trim()).filter((x) => x.length >= 20);
  const boiler = new Set(chunks(home));
  const clean = (t) => chunks(t).filter((c) => !boiler.has(c)).join(" . ");
  for (const p of pages.slice(1)) p.text = clean(p.text);
  if (pages[0]) pages[0].text = "";            // ana sayfanın kendisi şube kanıtı değildir
  for (const a of list) {
    const e = RAW.get(a.ref);
    const t = TERS[a.ref];
    const br = { street: a.street ?? t?.road ?? undefined, housenumber: a.housenumber ?? t?.house_number ?? undefined, district: a.district, neighbourhood: a.neighbourhood ?? t?.suburb ?? undefined, phone: a.phone };
    const own = [];
    if (a.website && siteKey(a.website)) { try { const u = new URL(a.website); if (u.pathname.length > 1) { const p = await get(a.website); if (p.text) own.push({ url: p.final, text: clean(p.text), sube: true }); } } catch {} }
    let best = null;
    for (const p of [...own, ...pages]) {
      const m = matchBranch(p.text, br);
      const strong = branchStrong(m, p.sube);
      const score = (strong ? 10 : 0) + (m.sokak ? 2 : 0) + (m.bolge ? 2 : 0) + (m.kapi ? 1 : 0) + (m.telefon ? 1 : 0) + (m.listeKapiNo ? 1 : 0);
      if (!best || score > best.score) best = { score, strong, url: p.url, subeSayfasi: p.sube, olcum: { sokak: m.sokak, bolge: m.bolge, kapi: m.kapi, telefon: m.telefon }, ...(m.listeKapiNo ? { listeKapiNo: m.listeKapiNo, listeSokak: br.street } : {}) };
    }
    res[a.ref] = { tarih: new Date().toISOString().slice(0, 10), marka: b, sayfaSayisi: pages.length + own.length, adresKaynagi: a.street ? "osm" : t?.road ? "osm_ters" : null, ...(best ?? { strong: false, url: null }) };
  }
  if (bi % 10 === 0) console.log(bi, "marka");
} }));
writeFileSync(out, JSON.stringify({ kanit: res, kapsamDisi }, null, 1));
const v = Object.values(res);
console.log({ incelenen: v.length, sayfaBulunan: v.filter((x) => x.sayfaSayisi).length, sokakBolge: v.filter((x) => x.olcum?.sokak && x.olcum?.bolge).length, guclu: v.filter((x) => x.strong).length, kapsamDisi: kapsamDisi.length });
const byBrand = {}; for (const x of v.filter((x) => x.strong)) byBrand[x.marka] = (byBrand[x.marka] ?? 0) + 1; console.log(byBrand);
