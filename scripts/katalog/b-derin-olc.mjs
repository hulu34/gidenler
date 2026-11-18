/* B HAVUZU DERİN ÖLÇÜM (paket 19+): eksik kanıtı (kapı no, adres, tür, ilçe) restoranın KENDİ resmî sitesinde arar.
   Kullanım: node scripts/katalog/b-derin-olc.mjs <aday.json> <secim.json (gersId listesi)> <cikti.json>
   Nazik tarama: alan adı başına sırayla en çok 10 sayfa (ana sayfa + iletişim/hakkımızda/menü bağlantıları + birkaç yaygın yol),
   aynı anda 6 alan adı; robots/403/Cloudflare atlatılmaz. Sayfa içeriği SAKLANMAZ; yalnız kısa kanıt parçaları
   (≤ 160 karakter: başlık, açıklama, schema.org alanları, adres satırı, tür ifadesi) ve sayfa adresi yazılır. */
import { readFileSync, writeFileSync, existsSync } from "node:fs"; import { execFile } from "node:child_process"; import { promisify } from "node:util";
const ex = promisify(execFile); const [adayP, secimP, out] = process.argv.slice(2);
const A = new Map(JSON.parse(readFileSync(adayP, "utf8")).map((a) => [a.id, a])); const IDS = JSON.parse(readFileSync(secimP, "utf8"));
const prev = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};
const fold = (s) => (s ?? "").toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9/]+/g, " ").trim();
const dec = (s) => (s ?? "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
const strip = (h) => dec(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<br\s*\/?>/gi, " , ").replace(/<\/(p|div|li|h\d|td|span|a)>/gi, " | ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const cut = (s, n = 160) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const UA = "Mozilla/5.0 (compatible; GidenlerKatalog/1.0; +https://www.gidenler.com/)";
async function get(u) { try { const { stdout } = await ex("curl", ["-sSL", "--http1.1", "-m", "20", "--max-filesize", "4000000", "-A", UA, "-H", "Accept-Language: tr,en", "-w", "\n@@%{http_code} %{url_effective}", u], { maxBuffer: 3e7 }); const i = stdout.lastIndexOf("\n@@"); const [c, e] = stdout.slice(i + 3).split(" "); return { status: +c, url: e, html: +c < 400 ? stdout.slice(0, i) : "" }; } catch { return { status: 0, html: "" }; } }
const LINK = /iletisim|contact|bize-?ulas|ulasim|adres|address|lokasyon|location|hakkimizda|hakkinda|about|biz-?kimiz|hikaye|story|menu|menü|men%C3%BC|yemekler|lezzetler|urunler/i;
const PATHS = ["/iletisim", "/contact", "/hakkimizda", "/menu"];
const ST = /\b([A-ZÇĞİÖŞÜa-zçğıöşü0-9.'’ -]{3,40}?\s(?:Cad(?:desi)?|Cd|Sok(?:ak|ağı)?|Sk|Bulvar(?:ı)?|Blv|Bul|Yolu|Yokuşu|Meydanı|Çıkmazı|Küme Evler)\.?)\s*,?\s*(?:No|Numara|N0)\s*[:.]?\s*(\d+[A-Za-z]?(?:\s*\/\s*[0-9A-Za-z]+)?)/g;
const ldItems = (html) => { const r = []; for (const m of html.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) { try { const j = JSON.parse(m[1].trim()); const walk = (x) => { if (!x || typeof x !== "object") return; if (Array.isArray(x)) return x.forEach(walk); if (x["@graph"]) walk(x["@graph"]); const t = [].concat(x["@type"] ?? []).join(","); if (/Restaurant|FoodEstablishment|LocalBusiness|Organization|BarOrPub|CafeOrCoffeeShop/i.test(t)) r.push(x); }; walk(j); } catch {} } return r; };
const res = { ...prev }; const todo = IDS.filter((id) => !prev[id] && A.get(id)); let i = 0, n = 0;
console.log("ölçülecek", todo.length);
async function worker() { while (i < todo.length) { const id = todo[i++]; const a = A.get(id);
  const home = await get(a.site); const pages = [home]; let host; try { host = new URL(home.url).host; } catch {}
  if (home.html && host) {
    const links = [...new Set([...home.html.matchAll(/href=["']([^"'#]+)["']/gi)].map((x) => { try { return new URL(dec(x[1]), home.url).toString().replace(/\/$/, ""); } catch { return null; } })
      .filter((u) => u && new URL(u).host === host && LINK.test(decodeURIComponent(u)) && !/\.(pdf|jpe?g|png|webp|gif|zip|svg)(\?|$)/i.test(u) && !/wp-content|\/tag\/|\/category\/|\/feed|whatsapp|maps\.|\?lang=/i.test(u)))].slice(0, 6);
    const seen = new Set([home.url.replace(/\/$/, ""), ...links]);
    for (const p of PATHS) { const u = new URL(p, home.url).toString(); if (seen.size >= 10) break; if (![...seen].some((s) => s.toLowerCase().includes(p.slice(1)))) { seen.add(u); links.push(u); } }
    for (const u of links.slice(0, 9)) { const p = await get(u); if (p.html && p.url && new URL(p.url).host === host) pages.push(p); } }
  const tels = a.telefonlar.map((t) => t.replace(/\D/g, "").slice(-7)).filter((t) => t.length === 7);
  const ilceF = " " + fold(a.ilce) + " ";
  const r = { id, host, status: home.status, sayfalar: [], ld: [], adresSatiri: [], tur: [], ilceSayfa: null, telSayfa: null, tarih: "2026-11-12" };
  for (const p of pages) { if (!p.html) continue; const t = strip(p.html); const f = " " + fold(t) + " "; const dig = t.replace(/\D/g, "");
    const telOk = tels.some((x) => dig.includes(x)); const ilceOk = f.includes(ilceF);
    r.sayfalar.push({ url: p.url, telOk, ilceOk, karakter: t.length });
    if (telOk && !r.telSayfa) r.telSayfa = p.url; if (ilceOk && !r.ilceSayfa) r.ilceSayfa = p.url;
    for (const x of ldItems(p.html)) { const ad = x.address && typeof x.address === "object" ? [].concat(x.address)[0] : null;
      r.ld.push({ sayfa: p.url, tip: cut([].concat(x["@type"]).join(","), 60), ad: cut(x.name, 80), tel: cut(String(x.telephone ?? ""), 30), sokak: cut(ad?.streetAddress, 120), semt: cut([ad?.addressLocality, ad?.addressRegion].filter(Boolean).join(" / "), 60), mutfak: cut([].concat(x.servesCuisine ?? []).join(", "), 100) }); }
    for (const m of t.matchAll(ST)) { const k = m.index; const w = t.slice(Math.max(0, k - 60), k + m[0].length + 80);
      r.adresSatiri.push({ sayfa: p.url, sokak: cut(m[1], 60), no: m[2].replace(/\s+/g, ""), cevre: cut(w, 200), ilceYakin: (" " + fold(w) + " ").includes(ilceF), telSayfa: telOk }); }
    const ttl = dec((p.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] ?? ""); const ds = dec((p.html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || p.html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) || [])[1] ?? "");
    const og = dec((p.html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)/i) || [])[1] ?? ""); const h = [...p.html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)].map((x) => strip(x[1]).trim()).filter((x) => x.length > 2).slice(0, 6);
    r.tur.push({ sayfa: p.url, baslik: cut(ttl, 140), aciklama: cut(ds, 200), og: cut(og, 200), h: h.map((x) => cut(x, 90)) });
    /* işletmenin kendini tanımladığı cümle (hakkımızda): "... restoranı/lokantası/ocakbaşı/balıkçı ... olarak" */
    for (const m of t.matchAll(/[^.!?|]{0,90}\b(restoran[ıi]?|restaurant|lokanta(?:s[ıi])?|ocakba[şs][ıi]|meyhane(?:si)?|bal[ıi]k(?:[çc][ıi]|\s+restoran)|kebap[çc][ıi]?|pideci|d[öo]nerci|mant[ıi]c[ıi]|steak ?house|esnaf lokantas[ıi]|ev yemekleri|pizzeria|trattoria|sushi)\b[^.!?|]{0,90}/giu)) { if (r.tur.length < 40) r.tur.push({ sayfa: p.url, cumle: cut(m[0], 180) }); }
  }
  res[id] = r; if (++n % 25 === 0) { writeFileSync(out, JSON.stringify(res)); console.log("ilerleme", n, "/", todo.length); } } }
await Promise.all(Array.from({ length: 6 }, worker));
writeFileSync(out, JSON.stringify(res));
const v = IDS.map((id) => res[id]).filter(Boolean); console.log("ölçülen", v.length, "açılan", v.filter((x) => x.sayfalar.length).length, "LD", v.filter((x) => x.ld.length).length, "adres satırı", v.filter((x) => x.adresSatiri.length).length);
