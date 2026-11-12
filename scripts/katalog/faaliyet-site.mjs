/* FAALİYET KANITI · RESMÎ SİTE (E1) — tarihli faaliyet kanıtı olmayan kayıtların kayıtlı resmî sitesi bugün açılır; ana sayfa
   ve en çok 3 iletişim/şube sayfasında ad, sokak, mahalle/ilçe ve telefonun geçip geçmediği ölçülür (site-dogrula.mjs ölçüsü).
   Sayfa içeriği SAKLANMAZ; yalnız ölçüm, HTTP durumu ve tarih tutulur. Alan adı başına istekler sırayla gider.
   Aynı alan adını katalogda birden çok kayıt paylaşıyorsa (zincir/kurum) ölçüm, sokağın ilçe ya da mahalleyle aynı bölümde
   (±300 karakter) geçip geçmediğini ayrıca kaydeder; karar betiği şube kanıtı için bunu ister.
   DERIN=1: yalnız önceki turda açılmayan ya da adı bulunup adres/telefonu bulunamayan kayıtlar yeniden denenir. Açılmayan
   sitede bir kez http/www çeşidi denenir (bot engeli aşılmaz: 403/429 yeniden denenmez); en çok 8 iç sayfa (iletişim, şube,
   rezervasyon, menü, hakkımızda) ve /iletisim, /contact tahminleri.
   YALNIZ=<dosya>: yalnız dosyadaki slug'lar derin kipte yeniden ölçülür (sıkılaştırılmış ölçüyle yeniden kontrol için).
   Kullanım: [DERIN=1 | YALNIZ=<dosya>] npx tsx scripts/katalog/faaliyet-site.mjs <osm.json> <cikti.json> */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fold, coreName, siteKey } from "../../lib/katalog/aday.ts";
const [osmP, out] = process.argv.slice(2);
const V = JSON.parse(readFileSync("data/real/venues.json", "utf8"));
const B = JSON.parse(readFileSync("data/real/isletme.json", "utf8"));
const FIX = JSON.parse(readFileSync("data/real/duzeltmeler.json", "utf8"));
const OSM = JSON.parse(readFileSync(osmP, "utf8")).ogeler;
const prev = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};
const siteOf = (v) => (FIX[v.slug] && "website" in FIX[v.slug] ? FIX[v.slug].website : v.website) ?? null;
const paylasim = {}; for (const v of [...V, ...(Array.isArray(B) ? B : B.venues ?? [])]) { const k = siteKey(siteOf(v) ?? undefined); if (k) paylasim[k] = (paylasim[k] ?? 0) + 1; }
const YALNIZ = process.env.YALNIZ ? new Set(readFileSync(process.env.YALNIZ, "utf8").split(/\s+/).filter(Boolean)) : null;
const DERIN = process.env.DERIN === "1" || !!YALNIZ;
const yeniden = (p) => p && !p.derin && (!p.olcum ? ![403, 429].includes(p.denenen[0].status) : p.olcum.ad && !(p.olcum.sokak || p.olcum.telefon));
const hedef = V.filter((v) => (v.wave ?? 0) <= 1 && !v.verifiedAt && siteKey(siteOf(v) ?? undefined) && (YALNIZ ? YALNIZ.has(v.slug) : DERIN ? yeniden(prev[v.slug]) : !prev[v.slug]));
const UA = "Mozilla/5.0 (compatible; GidenlerKatalog/1.0; +https://www.gidenler.com/)";
const strip = (h) => h.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
async function get(url) {
  const c = new AbortController(); const tm = setTimeout(() => c.abort(), 15000);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*", "accept-language": "tr,en;q=0.8" }, redirect: "follow", signal: c.signal });
    const ct = r.headers.get("content-type") ?? "";
    const body = /html|text/.test(ct) ? (await r.text()).slice(0, 1_500_000) : "";
    return { status: r.status, final: r.url, body };
  } catch (e) { return { status: 0, final: url, body: "", err: String(e.cause?.code ?? e.name ?? e).slice(0, 40) }; } finally { clearTimeout(tm); }
}
const STREET_WORDS = /\b(caddesi|cadde|cad|cd|sokagi|sokak|sk|sok|bulvari|bulvar|blv|yolu|meydani|mahallesi|mah|mh|no)\b/g;
const KAPANIS = /\b(kalici olarak kapan\w*|kapandik|kapanmistir|faaliyetlerimize son|hizmet vermemekteyiz|permanently closed|we have closed|we are permanently)\b/;
function girdi(v) {
  const t = OSM[v.ref]?.tags ?? {};
  const sokak = t["addr:street"] ?? (/^([^,]*?)(?:\s+No\b|,)/i.exec(v.address ?? "")?.[1] ?? null);
  return { name: v.name, osmName: t.name, street: sokak, hood: v.neighborhood ?? t["addr:suburb"] ?? null, district: v.district, phone: v.phone ?? t.phone ?? t["contact:phone"] ?? null };
}
function measure(a, text) {
  const T = " " + fold(text) + " ";
  const adlar = [a.name, a.osmName].filter(Boolean);
  const ad = adlar.some((n) => { const cn = coreName(n) || fold(n); return (cn.length >= 3 && T.includes(" " + cn + " ")) || T.includes(" " + fold(n) + " "); });
  const st = a.street ? fold(a.street).replace(STREET_WORDS, " ").replace(/\s+/g, " ").trim() : "";
  const sIdx = st.length >= 4 ? T.indexOf(" " + st + " ") : -1;
  const hood = a.hood ? fold(a.hood).replace(STREET_WORDS, " ").trim() : "";
  const hoodHit = hood.length >= 4 && T.includes(" " + hood + " ");
  const dist = fold(a.district); const distHit = T.includes(" " + dist + " ");
  const yakin = sIdx >= 0 && [dist, hood].filter((x) => x.length >= 4).some((x) => { const w = T.slice(Math.max(0, sIdx - 300), sIdx + st.length + 300); return w.includes(" " + x + " "); });
  /* telefon yalnız telefon biçimli bir dizide aranır (sayfadaki bütün rakamlar birleştirilmez; fiyat ve kod dizileri rastlantısal eşleşme üretmesin) */
  const pk = (a.phone ?? "").replace(/\D/g, "").slice(-7);
  const telDizileri = (text.match(/\+?\(?\d[\d\s().\/-]{6,20}\d/g) ?? []).map((x) => x.replace(/\D/g, "")).filter((d) => d.length >= 7 && d.length <= 13);
  const phoneHit = pk.length === 7 && telDizileri.some((d) => d.endsWith(pk) || d.includes(pk) && d.length <= 12);
  return { ad, sokak: sIdx >= 0, mahalle: hoodHit, ilce: distHit, telefon: phoneHit, sokakBolgeYakin: yakin, kapanisMetni: KAPANIS.test(T) };
}
const or = (m, m2) => Object.fromEntries(Object.keys(m).map((k) => [k, m[k] || m2[k]]));
const res = { ...prev }; let n = 0;
async function one(v) {
  const url0 = siteOf(v); const url = url0.startsWith("http") ? url0 : `https://${url0}`; const a = girdi(v);
  const tried = [];
  let h = await get(url); tried.push({ url, status: h.status, final: h.final !== url ? h.final : undefined, err: h.err });
  if (DERIN && !h.body && ![403, 429].includes(h.status)) {
    const u = new URL(url); const alt = u.protocol === "https:" ? `http://${u.host}${u.pathname}` : `https://${u.host.startsWith("www.") ? u.host.slice(4) : "www." + u.host}${u.pathname}`;
    const h2 = await get(alt); tried.push({ url: alt, status: h2.status, final: h2.final !== alt ? h2.final : undefined, err: h2.err }); if (h2.body) h = h2;
  }
  let m = h.body ? measure(a, strip(h.body)) : null;
  if (h.body && m && !(m.sokak && m.telefon)) {
    const desen = DERIN ? /iletisim|contact|ulasim|subeler|şubeler|subelerimiz|sube|location|lokasyon|adres|bize-ulasin|hakkimizda|about|rezervasyon|reservation|menu|kunye/i : /iletisim|contact|ulasim|subeler|şubeler|subelerimiz|location|lokasyon|adres|bize-ulasin|hakkimizda|about/i;
    const links = [...new Set([...[...h.body.matchAll(/href=["']([^"'#]+)["']/gi)].map((x) => x[1]).filter((u) => desen.test(u) && !/\.(pdf|jpe?g|png|webp)$/i.test(u)), ...(DERIN ? ["/iletisim", "/contact"] : [])])].slice(0, DERIN ? 8 : 3);
    for (const l of links) {
      let u; try { u = new URL(l, h.final).toString(); } catch { continue; }
      if (siteKey(u) !== siteKey(h.final)) continue;
      const c = await get(u); tried.push({ url: u, status: c.status });
      if (c.body) m = or(m, measure(a, strip(c.body)));
      if (m.sokak && m.telefon) break;
    }
  }
  res[v.slug] = { tarih: new Date().toISOString().slice(0, 10), denenen: tried, olcum: m, alan: siteKey(h.final), kayitliAlan: siteKey(url), paylasilan: paylasim[siteKey(url)] ?? 1, ...(DERIN ? { derin: true } : {}) };
  if (++n % 50 === 0) { console.log(n, "/", hedef.length); writeFileSync(out, JSON.stringify(res)); }
}
/* alan adı başına sıra: aynı alanın kayıtları tek kuyrukta */
const gruplar = Object.values(hedef.reduce((g, v) => ((g[siteKey(siteOf(v))] ??= []).push(v), g), {}));
await Promise.all(Array.from({ length: 6 }, async () => { while (gruplar.length) { for (const v of gruplar.shift()) await one(v); } }));
writeFileSync(out, JSON.stringify(res));
const r = Object.values(res);
console.log({ hedef: hedef.length, kontrol: r.length, acildi: r.filter((x) => x.olcum).length, ad: r.filter((x) => x.olcum?.ad).length, ad_sokak_ya_da_tel: r.filter((x) => x.olcum?.ad && (x.olcum.sokak || x.olcum.telefon)).length, kapanisMetni: r.filter((x) => x.olcum?.kapanisMetni).length });
