/* OVERTURE adaylarının resmî site ölçümü (paket 16+). Kullanım: node scripts/katalog/overture-site-olc.mjs <aday.json> <olcum.json> — önbellekli, yeniden çalıştırılabilir. */
/* Overture adaylarının resmî sitesini ölç. Alan adı başına bir kez indirilir (bellekte), adaylar o metne karşı ölçülür.
   Saklanan: ölçüm (ad/telefon/sokak/kapı/ilçe eşleşmesi, hangi sayfada), başlık + açıklama (tür kanıtı için kısa), spam/park işareti. Sayfa içeriği saklanmaz. */
import { readFileSync, writeFileSync, existsSync } from "node:fs"; import { execFile } from "node:child_process"; import { promisify } from "node:util";
const ex = promisify(execFile); const [inp, out] = process.argv.slice(2);
const A = JSON.parse(readFileSync(inp, "utf8")); const prev = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};
const fold = (s) => (s ?? "").toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const dec = (s) => (s ?? "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
const strip = (h) => dec(h.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const SPAM = /casino|bahis|escort|slot oyun|betting|viagra|hacklink|deneme bonusu|canl[ıi] bahis/i, PARK = /domain (is )?for sale|alan ad[ıi] sat[ıi]l[ıi]k|parked free|this domain may be for sale|hostinger|under construction|yap[ıi]m a[şs]amas|coming soon|default web site page|index of \//i;
const GEN = new Set(["restaurant","restoran","restorant","lokantasi","lokanta","cafe","kafe","ve","the","istanbul","by","salonu","evi","and","bar","&"]);
const ST = new Set(["caddesi","cadde","cad","cd","sokak","sokagi","sok","sk","bulvari","bulvar","blv","yolu","yokusu","mahallesi","mah","mh","no","kat","d","istanbul","turkiye","turkey"]);
async function get(u) { try { const { stdout } = await ex("curl", ["-sSL", "--http1.1", "-m", "15", "--max-filesize", "4000000", "-A", "Mozilla/5.0 (compatible; GidenlerKatalog/1.0; +https://www.gidenler.com/)", "-H", "Accept-Language: tr,en", "-w", "\n@@%{http_code} %{url_effective}", u], { maxBuffer: 3e7 }); const i = stdout.lastIndexOf("\n@@"); const [c, e] = stdout.slice(i + 3).split(" "); return { status: +c, url: e, html: +c < 400 ? stdout.slice(0, i) : "" }; } catch { return { status: 0, html: "" }; } }
const byHost = {}; for (const a of A) (byHost[a.host] ??= []).push(a);
const hosts = Object.keys(byHost).filter((h) => byHost[h].some((a) => !prev[a.id])); console.log("alan adı", hosts.length, "aday", A.length);
let i = 0, n = 0;
async function worker() { while (i < hosts.length) { const h = hosts[i++]; const list = byHost[h]; const chain = list.length > 1;
  const home = await get(list[0].site); const pages = [home];
  if (home.html) { let host; try { host = new URL(home.url).host; } catch {}
    const re = chain ? /iletisim|contact|sube|subeler|branch|lokasyon|location|restoran|restaurant|adres|magaza|store|bul|find/i : /iletisim|contact|hakkimizda|about|subeler|sube|adres|location|lokasyon|menu|rezervasyon|reservation/i;
    const links = [...new Set([...home.html.matchAll(/href=["']([^"'#]+)["']/gi)].map((x) => { try { return new URL(dec(x[1]), home.url).toString(); } catch { return null; } }).filter((u) => u && host && new URL(u).host === host && re.test(u) && !/\.(pdf|jpg|png|webp|zip)$/i.test(u)))].slice(0, chain ? 20 : 5);
    for (const u of links) pages.push(await get(u)); }
  const P = pages.filter((p) => p.html).map((p) => ({ url: p.url, t: strip(p.html), f: " " + fold(strip(p.html)) + " " }));
  const all = P.map((p) => p.f).join(" "); const rawAll = P.map((p) => p.t).join(" ");
  const title = dec((home.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  const desc = dec((home.html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || home.html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) || [])[1] ?? "").slice(0, 240);
  const spam = SPAM.test(rawAll), park = PARK.test(rawAll) || rawAll.length < 400;
  for (const a of list) {
    const nt = [...new Set(fold(a.ad).split(" ").filter((w) => w.length >= 3 && !GEN.has(w)))];
    const nameHits = nt.filter((w) => all.includes(" " + w)).length; const nameOk = nt.length > 0 && nameHits >= (nt.length <= 2 ? nt.length : Math.ceil(nt.length * 2 / 3));
    const tels = a.telefonlar.map((t) => t.replace(/\D/g, "").slice(-7)).filter((t) => t.length === 7);
    const addr = a.adres ?? ""; const stw = fold(addr.split(/no\b|No:|,|\d/)[0]).split(" ").filter((w) => w.length >= 4 && !ST.has(w));
    const no = (addr.match(/No\s*[:.]?\s*(\d+)/i) || addr.match(/\b(\d+)\b/) || [])[1];
    let best = null;
    for (const p of P) { const dig = p.t.replace(/\D/g, ""); const telOk = tels.some((t) => dig.includes(t)); const streetOk = stw.length > 0 && stw.every((w) => p.f.includes(w));
      let noOk = false; if (streetOk && no) { const k = p.f.indexOf(stw[0]); noOk = k >= 0 && new RegExp(`(^|\\D)${no}(\\D|$)`).test(p.f.slice(k, k + 140)); }
      const ilceOk = p.f.includes(" " + fold(a.ilce) + " "); const sc = (telOk ? 3 : 0) + (streetOk ? 2 : 0) + (noOk ? 1 : 0) + (ilceOk ? 1 : 0);
      if (!best || sc > best.sc) best = { sc, telOk, streetOk, noOk, ilceOk, sayfa: p.url }; }
    prev[a.id] = { id: a.id, host: h, status: home.status, final: home.url, sayfaSayisi: P.length, nameOk, ...(best ?? { telOk: false, streetOk: false, noOk: false, ilceOk: false, sayfa: null }), spam, park, baslik: title, aciklama: desc, tarih: "2026-11-11" };
  }
  if (++n % 100 === 0) { writeFileSync(out, JSON.stringify(prev)); console.log("ilerleme", n, "/", hosts.length); } } }
await Promise.all(Array.from({ length: 20 }, worker));
writeFileSync(out, JSON.stringify(prev));
const v = Object.values(prev); console.log("ölçülen", v.length, "açılan", v.filter((x) => x.status && x.status < 400).length, "ad+tel/sokak (spam/park yok)", v.filter((x) => x.nameOk && (x.telOk || x.streetOk) && !x.spam && !x.park).length);
