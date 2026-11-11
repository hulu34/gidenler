/* ADIM 4: resmî site doğrulaması. Adayın OSM'deki web sitesi açılır (ana sayfa + bulunursa iletişim/şubeler sayfası);
   sayfada adın, sokağın, mahallenin/ilçenin ve telefonun geçip geçmediği ölçülür. Sayfa içeriği SAKLANMAZ; yalnız ölçüm
   (hangi alan eşleşti, HTTP durumu, tarih, kontrol edilen adres) kanıt olarak tutulur.
   Kullanım: npx tsx scripts/katalog/site-dogrula.mjs <havuz.json> <kanit.json> */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fold, coreName, siteKey } from "../../lib/katalog/aday.ts";
const [inp, out] = process.argv.slice(2);
const H = JSON.parse(readFileSync(inp, "utf8"));
const prev = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};
const todo = H.adaylar.filter((a) => !a.esles && !a.ret.length && siteKey(a.website) && !prev[a.ref]);
const UA = "Mozilla/5.0 (compatible; GidenlerKatalog/1.0; +https://www.gidenler.com/)";
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
async function get(url) {
  const c = new AbortController(); const tm = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*" }, redirect: "follow", signal: c.signal });
    const ct = r.headers.get("content-type") ?? "";
    const body = /html|text/.test(ct) ? (await r.text()).slice(0, 1_500_000) : "";
    return { status: r.status, final: r.url, body };
  } catch (e) { return { status: 0, final: url, body: "", err: String(e.name ?? e).slice(0, 40) }; } finally { clearTimeout(tm); }
}
const STREET_WORDS = /\b(caddesi|cadde|cad|cd|sokagi|sokak|sk|sok|bulvari|bulvar|blv|yolu|meydani|mahallesi|mah|mh|no)\b/g;
function measure(a, text) {
  const T = " " + fold(text) + " ", digits = text.replace(/\D/g, "");
  const cn = coreName(a.name) || fold(a.name);
  const nameHit = cn.length >= 3 && T.includes(" " + cn + " ") || T.includes(" " + fold(a.name) + " ");
  const st = a.street ? fold(a.street).replace(STREET_WORDS, " ").replace(/\s+/g, " ").trim() : "";
  const streetHit = st.length >= 4 && T.includes(" " + st + " ");
  const hood = a.neighbourhood ? fold(a.neighbourhood).replace(STREET_WORDS, " ").trim() : "";
  const hoodHit = hood.length >= 4 && T.includes(" " + hood + " ");
  const distHit = T.includes(" " + fold(a.district) + " ");
  const pk = (a.phone ?? "").replace(/\D/g, "").slice(-7);
  const phoneHit = pk.length === 7 && (digits.includes(pk) || T.replace(/\s/g, "").includes(pk));
  return { ad: !!nameHit, sokak: streetHit, mahalle: hoodHit, ilce: distHit, telefon: phoneHit };
}
const res = { ...prev }; let n = 0;
async function one(a) {
  const tried = [];
  const h = await get(a.website); tried.push({ url: a.website, status: h.status, final: h.final !== a.website ? h.final : undefined, err: h.err });
  let m = h.body ? measure(a, strip(h.body)) : null;
  if (h.body && m && !(m.sokak || m.telefon)) {
    const links = [...h.body.matchAll(/href=["']([^"'#]+)["']/gi)].map((x) => x[1]).filter((u) => /iletisim|contact|ulasim|subeler|şubeler|subelerimiz|location|lokasyon|adres|bize-ulasin|hakkimizda/i.test(u)).slice(0, 2);
    for (const l of links) {
      let u; try { u = new URL(l, h.final).toString(); } catch { continue; }
      if (siteKey(u) !== siteKey(h.final)) continue;
      const c = await get(u); tried.push({ url: u, status: c.status });
      if (c.body) { const m2 = measure(a, strip(c.body)); m = Object.fromEntries(Object.keys(m).map((k) => [k, m[k] || m2[k]])); }
      if (m.sokak || m.telefon) break;
    }
  }
  res[a.ref] = { tarih: new Date().toISOString().slice(0, 10), denenen: tried, olcum: m, alan: siteKey(h.final) };
  if (++n % 50 === 0) { console.log(n, "/", todo.length); writeFileSync(out, JSON.stringify(res)); }
}
const q = [...todo]; await Promise.all(Array.from({ length: 10 }, async () => { while (q.length) await one(q.shift()); }));
writeFileSync(out, JSON.stringify(res));
const v = Object.values(res);
console.log({ kontrol: v.length, acildi: v.filter((x) => x.olcum).length, ad: v.filter((x) => x.olcum?.ad).length, ad_ve_adres_ya_da_tel: v.filter((x) => x.olcum?.ad && (x.olcum.sokak || x.olcum.telefon)).length, ad_ve_ilce: v.filter((x) => x.olcum?.ad && (x.olcum.ilce || x.olcum.mahalle)).length });
