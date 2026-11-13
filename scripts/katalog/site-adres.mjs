/* RESMÎ SİTEDEN ADRES — kapı numarası ya da adresi eksik kayıtların resmî sitesinde (ana sayfa + en çok 3 iletişim sayfası)
   sokak + kapı numaralı adresi arar. Sayfa içeriği saklanmaz; yalnız bulunan adres ve yeri tutulur.
   Kabul (aday): JSON-LD PostalAddress ya da metindeki "<sokak/cadde/bulvar …> No:<n>" biçimi; ilçe adı adresin ±200 karakterinde;
   kayıtta sokak varsa aynı sokak; sitede kaydın ilçesinde TEK farklı adres (birden çok şube adresi → ret). Karar elle onaylanır.
   Alan adı başına istekler sırayla; 403/429 yeniden denenmez, bot engeli aşılmaz.
   Kullanım: node scripts/katalog/site-adres.mjs <hedef.txt> <cikti.json> */
import { readFileSync, writeFileSync } from "node:fs";
import { fold, coreName, siteKey } from "../../lib/katalog/aday.ts";
const [hedefP, out] = process.argv.slice(2);
const V = JSON.parse(readFileSync("data/real/venues.json", "utf8")), FIX = JSON.parse(readFileSync("data/real/duzeltmeler.json", "utf8"));
const H = new Set(readFileSync(hedefP, "utf8").split(/\s+/).filter(Boolean));
const siteOf = (v) => (FIX[v.slug] && "website" in FIX[v.slug] ? FIX[v.slug].website : v.website) ?? null;
const UA = "Mozilla/5.0 (compatible; GidenlerKatalog/1.0; +https://www.gidenler.com/)";
async function get(url) {
  const c = new AbortController(); const tm = setTimeout(() => c.abort(), 15000);
  try { const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*", "accept-language": "tr" }, redirect: "follow", signal: c.signal }); const ct = r.headers.get("content-type") ?? ""; return { status: r.status, final: r.url, body: /html|text/.test(ct) ? (await r.text()).slice(0, 1_500_000) : "" }; }
  catch (e) { return { status: 0, final: url, body: "", err: String(e.cause?.code ?? e.name) }; } finally { clearTimeout(tm); }
}
const ent = (s) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
const metin = (h) => ent(h.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?>/gi, ", ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const YOL = "(?:Caddesi|Cadde|Cad\\.?|Cd\\.?|Sokağı|Sokak|Sok\\.?|Sk\\.?|Bulvarı|Bulvar|Blv\\.?|Yolu|Yokuşu|Meydanı|Çıkmazı)";
const RE = new RegExp(`((?:[A-ZÇĞİÖŞÜ0-9][\\wçğıöşüÇĞİÖŞÜ.'’-]*\\s){1,5}${YOL}\\s*,?\\s*No\\s*[:.]?\\s*\\d+[A-Za-z]?(?:\\s*[/-]\\s*[\\dA-Za-z]+)?)`, "g");
function adresler(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const walk = (o) => { if (!o || typeof o !== "object") return; if (o.streetAddress) out.push({ yer: "JSON-LD", adres: ent(String(o.streetAddress)).trim(), ilce: o.addressLocality ?? o.addressRegion ?? null }); for (const v of Object.values(o)) walk(v); }; walk(JSON.parse(m[1])); } catch { /* bozuk JSON-LD */ }
  }
  const t = metin(html);
  for (const m of t.matchAll(RE)) out.push({ yer: "metin", adres: m[1].trim(), cevre: t.slice(Math.max(0, m.index - 200), m.index + m[1].length + 200) });
  return out;
}
const sokakCekirdek = (s) => fold(s).replace(/\b(caddesi|cadde|cad|cd|sokagi|sokak|sok|sk|bulvari|bulvar|blv|yolu|yokusu|meydani|cikmazi|mahallesi|mah|mh)\b/g, " ").replace(/\bno\b.*$/, "").replace(/\s+/g, " ").trim();
const res = {}; const hedef = V.filter((v) => H.has(v.slug) && siteOf(v));
async function one(v) {
  const u0 = siteOf(v); const url = u0.startsWith("http") ? u0 : `https://${u0}`;
  const h = await get(url); const sayfalar = []; if (h.body) sayfalar.push({ url: h.final, body: h.body });
  if (h.body) {
    const links = [...new Set([...h.body.matchAll(/href=["']([^"'#]+)["']/gi)].map((x) => x[1]).filter((l) => /iletisim|contact|ulasim|adres|bize-ulasin|location|subeler/i.test(l) && !/\.(pdf|jpe?g|png)$/i.test(l)))].slice(0, 3);
    for (const l of links) { let u; try { u = new URL(l, h.final).toString(); } catch { continue; } if (siteKey(u) !== siteKey(h.final)) continue; const c = await get(u); if (c.body) sayfalar.push({ url: c.final, body: c.body }); }
  }
  const ilce = fold(v.district); const kayitSokak = v.address ? sokakCekirdek(v.address.split(",")[0]) : null;
  const adaylar = [];
  for (const s of sayfalar) for (const a of adresler(s.body)) {
    const ilceYakin = a.yer === "JSON-LD" ? fold(`${a.adres} ${a.ilce ?? ""}`).includes(ilce) : fold(a.cevre).includes(ilce);
    adaylar.push({ ...a, url: s.url, ilceYakin, sokak: sokakCekirdek(a.adres), cevre: undefined });
  }
  const T = sayfalar.map((s) => " " + fold(metin(s.body)) + " ").join(" "); const cn = coreName(v.name) || fold(v.name);
  const ad = cn.length >= 3 && T.includes(" " + cn + " ");
  const ilcede = [...new Map(adaylar.filter((a) => a.ilceYakin).map((a) => [`${a.sokak}#${/No\s*[:.]?\s*(\d+)/i.exec(a.adres)?.[1]}`, a])).values()];
  let karar = null, neden = null;
  if (!h.body) neden = `site açılmadı (${h.status || h.err})`;
  else if (!ad) neden = "sitede ad yok";
  else if (!ilcede.length) neden = adaylar.length ? "adres var ama ilçe yakınında değil" : "sitede kapı numaralı adres yok";
  else if (ilcede.length > 1) neden = `ilçede birden çok adres (${ilcede.length}) — şube ayrımı yapılamadı`;
  else if (kayitSokak && ilcede[0].sokak && !(ilcede[0].sokak.includes(kayitSokak) || kayitSokak.includes(ilcede[0].sokak))) neden = `sokak kayıttakiyle farklı (${v.address.split(",")[0]} ↔ ${ilcede[0].adres})`;
  else karar = { adres: ilcede[0].adres, yer: ilcede[0].yer, url: ilcede[0].url };
  res[v.slug] = { tarih: new Date().toISOString().slice(0, 10), kayitAdresi: v.address ?? null, ilce: v.district, ad, karar, neden, adayAdres: adaylar.slice(0, 6).map((a) => `${a.yer}: ${a.adres}${a.ilceYakin ? "" : " (ilçe yakın değil)"}`) };
}
const gruplar = Object.values(hedef.reduce((g, v) => ((g[siteKey(siteOf(v))] ??= []).push(v), g), {}));
await Promise.all(Array.from({ length: 5 }, async () => { while (gruplar.length) for (const v of gruplar.shift()) await one(v); }));
writeFileSync(out, JSON.stringify(res, null, 1) + "\n");
const r = Object.values(res); console.log({ hedef: hedef.length, aday: r.filter((x) => x.karar).length, neden: r.filter((x) => !x.karar).reduce((m, x) => ((m[x.neden.replace(/ \(.*$/, "")] = (m[x.neden.replace(/ \(.*$/, "")] ?? 0) + 1), m), {}) });
