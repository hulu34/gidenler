/* ZİNCİR RESMÎ ŞUBE LİSTESİ → OSM ŞUBESİ (paket 9+). Markanın resmî şube sayfalarındaki İstanbul adresleri çıkarılır,
   OSM'nin kendi arama servisiyle (Nominatim, ODbL; saniyede ≤1 istek, önbellek) konuma çevrilir ve markanın OSM'deki
   şube noktasıyla eşleştirilir. Kanıt: resmî listedeki tam adres (kapı no dahil) + konum uyumu. Sayfa içeriği saklanmaz;
   yalnız şube adresi (işletmenin yayımladığı iletişim bilgisi), kaynak sayfa ve ölçüm tutulur.
   Kullanım: node scripts/katalog/zincir-liste.mjs <ham-osm.json> <havuz.json> <onbellek-geo.json> <cikti.json> */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const [rawP, hp, geoP, out] = process.argv.slice(2);
const fold = (s) => (s ?? "").toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
const DIST = ["Adalar","Arnavutköy","Ataşehir","Avcılar","Bağcılar","Bahçelievler","Bakırköy","Başakşehir","Bayrampaşa","Beşiktaş","Beykoz","Beylikdüzü","Beyoğlu","Büyükçekmece","Çatalca","Çekmeköy","Esenler","Esenyurt","Eyüpsultan","Fatih","Gaziosmanpaşa","Güngören","Kadıköy","Kağıthane","Kartal","Küçükçekmece","Maltepe","Pendik","Sancaktepe","Sarıyer","Silivri","Sultanbeyli","Sultangazi","Şile","Şişli","Tuzla","Ümraniye","Üsküdar","Zeytinburnu"];
const DF = DIST.map((d) => [fold(d), d]); DF.push(["eyup", "Eyüpsultan"]);
const m = (a, b) => Math.hypot((a.lat - b.lat) * 111000, (a.lng - b.lng) * 84000);
const UA = "Mozilla/5.0 (compatible; GidenlerKatalog/1.0; +https://www.gidenler.com/)";
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?>/gi, " | ").replace(/<\/(p|div|li|tr|td|h\d|span|a)>/gi, " | ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/\s+/g, " ");
async function get(u) { try { const r = await fetch(u, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(15000) }); return r.ok ? { url: r.url, html: (await r.text()).slice(0, 9_000_000) } : null; } catch { return null; } }
/* markalar: resmî kök + şube sayfası yolları (elle doğrulanmış kökler zincir-siteleri.json'da) */
const SITE = JSON.parse(readFileSync("data/katalog/zincir-siteleri.json", "utf8")).siteler;
const BRANDS = { "hd iskender": "https://www.hdiskender.com/", "etiler marmaris": "https://etilermarmaris.com.tr/", "bigchefs": "https://bigchefs.com.tr/", ...SITE };
const LINK = /sube|şube|restoran|lokasyon|magaza|iletisim/i;
/* adres parçası: İstanbul ilçesi + "No <sayı>" içeren blok; telefon ve kalıp sözcükler atılır */
function addresses(text) {
  const out = [];
  for (const seg of text.split("|").map((s) => s.trim()).filter((s) => s.length >= 15 && s.length <= 260)) {
    if (!/\bNo\s*[:.]?\s*\d/i.test(seg)) continue;
    const f = " " + fold(seg) + " ";
    /* ilçe: önce "X/İstanbul" kalıbı, yoksa metindeki SON ilçe adı ("Fatih Bulvarı ... Sultanbeyli" → Sultanbeyli) */
    const slash = /([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*\/\s*(İstanbul|ISTANBUL|Istanbul)/.exec(seg);
    let d = slash ? DF.find(([k]) => k === fold(slash[1])) : null;
    if (!d) { let best = null, at = -1; for (const x of DF) { const i = f.lastIndexOf(" " + x[0] + " "); if (i > at) { at = i; best = x; } } d = best; }
    if (!d) continue;
    if (/ankara|izmir|bursa|antalya|kocaeli|tekirdag|adana|konya/.test(f) && !/istanbul/.test(f)) continue;
    const no = /\bNo\s*[:.]?\s*([0-9]{1,4}[A-Za-z]?)/i.exec(seg)[1];
    const clean = seg.replace(/(\+?90)?\s*\(?0?\d{3}\)?\s*\d{3}\s*\d{2}\s*\d{2}/g, " ").replace(/(Yol Tarifi|Haritada Gör(üntüle)?|Detaylar?|Telefon|Tel|Adres)\s*:?/gi, " ").replace(/\s+/g, " ").trim();
    /* sokak: "No" öncesindeki metinde geçen SON cadde/sokak/bulvar ifadesi (arada AVM/bina adı olabilir) */
    const pre = seg.slice(0, /\bNo\s*[:.]?\s*\d/i.exec(seg).index);
    const SM = [...pre.matchAll(/((?:[0-9A-Za-zÇĞİÖŞÜçğıöşü.'’-]+\s+){0,3}(?:(?:Yolu|Asfaltı)\s+)?(?:Caddesi|Cadde|Cad\.?|Cd\.?|Sokağı|Sokak|Sok\.?|Sk\.?|Bulvarı|Bulvar|Blv\.?|Yolu|Asfaltı|Meydanı)(?=[\s.,]|$))/gi)];
    const sm = SM.length ? SM[SM.length - 1] : null;
    const hm = /((?:[0-9A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ.'’-]*\s+){0,2}[0-9A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ.'’-]*)\s+(?:Mahallesi|Mah\.?|Mh\.?)(?=[\s.,]|$)/.exec(seg);
    const sokak = sm ? sm[1].replace(/^.*\b(Mahallesi|Mah\.?|Mh\.?)\s+/i, "").replace(/^(No\s*[:.]?\s*\d+\S*\s+)/i, "").trim() : null;
    out.push({ adres: clean, ilce: d[1], no: no.toUpperCase(), sokak, mahalle: hm ? hm[1].trim() : null });
  }
  return out;
}
const RAW = new Map(JSON.parse(readFileSync(rawP, "utf8")).elements.map((e) => [`${e.type}/${e.id}`, e]));
const H = JSON.parse(readFileSync(hp, "utf8")).adaylar;
const GEO = existsSync(geoP) ? JSON.parse(readFileSync(geoP, "utf8")) : {};
const res = { markalar: {}, eslesen: {}, eslesmeyenListe: [] };
for (const [brand, root] of Object.entries(BRANDS)) {
  const home = await get(root); if (!home) { res.markalar[brand] = { hata: "kök açılmadı" }; continue; }
  const host = new URL(home.url).host;
  const pages = [home];
  const l1 = [...new Set([...home.html.matchAll(/href=["']([^"'#]+)["']/gi)].map((x) => { try { return new URL(x[1], home.url).toString(); } catch { return null; } }).filter((u) => u && new URL(u).host === host && LINK.test(u)))].slice(0, 6);
  for (const u of l1) { const p = await get(u); if (!p) continue; pages.push(p);
    /* bir alt düzey: şube ayrıntı sayfaları (/subeler/<ad>, /restoranlar/<ad>) */
    const l2 = [...new Set([...p.html.matchAll(/href=["']([^"'#]+)["']/gi)].map((x) => { try { return new URL(x[1], p.url).toString(); } catch { return null; } }).filter((v) => v && new URL(v).host === host && /\/(subeler|sube|restoranlar|restoranlarimiz|lokasyonlar)\/[^/?#]+/i.test(new URL(v).pathname)))].slice(0, 80);
    for (const v of l2) { const q = await get(v); if (q) pages.push(q); }
  }
  const seen = new Map();
  for (const p of pages) for (const a of addresses(strip(p.html))) { const k = fold(a.adres); if (!seen.has(k)) seen.set(k, { ...a, sayfa: p.url }); }
  const list = [...seen.values()];
  res.markalar[brand] = { kok: home.url, sayfa: pages.length, istanbulAdres: list.length };
  /* markanın OSM noktaları (havuzdaki aday, adı markayla başlayan) */
  const bf = fold(brand).replace(/\s+/g, "");
  const osm = H.filter((a) => !a.esles && fold(a.name).replace(/\s+/g, "").startsWith(bf.slice(0, Math.max(5, bf.length))));
  for (const a of list) {
    const key = `S|${a.sokak}|${a.no}|${a.ilce}`;
    if (!GEO[key]) {
      await new Promise((z) => setTimeout(z, 1100));
      if (!a.sokak) { res.eslesmeyenListe.push({ marka: brand, ...a, neden: "sokak çıkarılamadı" }); continue; }
      try { const q = `street=${encodeURIComponent(`${a.no} ${a.sokak}`)}&city=${encodeURIComponent(a.ilce)}&state=${encodeURIComponent("İstanbul")}&country=T%C3%BCrkiye`;
        const r = await fetch(`https://nominatim.openstreetmap.org/search?${q}&format=jsonv2&addressdetails=1&limit=1`, { headers: { "user-agent": "gidenler-katalog-adres/1.0 (+https://www.gidenler.com/)" }, signal: AbortSignal.timeout(15000) });
        let j = (await r.json())[0];
        if (!j) { await new Promise((z) => setTimeout(z, 1100)); const r2 = await fetch(`https://nominatim.openstreetmap.org/search?street=${encodeURIComponent(a.sokak)}&city=${encodeURIComponent(a.ilce)}&state=${encodeURIComponent("İstanbul")}&country=T%C3%BCrkiye&format=jsonv2&addressdetails=1&limit=1`, { headers: { "user-agent": "gidenler-katalog-adres/1.0 (+https://www.gidenler.com/)" }, signal: AbortSignal.timeout(15000) }); j = (await r2.json())[0]; }
        GEO[key] = j ? { lat: +j.lat, lng: +j.lon, road: j.address?.road ?? null, house: j.address?.house_number ?? null, sinif: j.addresstype ?? j.type, osm: `${j.osm_type}/${j.osm_id}` } : { yok: true };
      } catch { GEO[key] = { hata: true }; }
    }
    const g = GEO[key];
    if (!g || g.yok || g.hata) { res.eslesmeyenListe.push({ marka: brand, ...a, neden: "konum bulunamadı" }); continue; }
    const exact = !!g.house && g.house.toUpperCase().replace(/\s/g, "") === a.no.replace(/\s/g, "");
    let best = null;
    for (const c of osm) { if (c.district !== a.ilce) continue; const d = m(c, g); if (!best || d < best.d) best = { c, d }; }
    const lim = exact ? 150 : 400;
    const f0 = fold(a.sokak).split(" ")[0];
    const roadOk = g.road && (f0.length >= 3 ? f0 === fold(g.road).split(" ")[0] : fold(a.sokak).replace(/\b(caddesi|cad|cd|sokak|sokagi|sk|sok)\b/g, "").trim() === fold(g.road).replace(/\b(caddesi|cad|cd|sokak|sokagi|sk|sok)\b/g, "").trim());
    if (best && best.d <= lim && roadOk) {
      const prev = res.eslesen[best.c.ref];
      if (!prev || best.d < prev.m) res.eslesen[best.c.ref] = { marka: brand, ad: best.c.name, ilce: a.ilce, adres: a.adres, sokak: a.sokak, mahalle: a.mahalle, kapiNo: a.no, sayfa: a.sayfa, m: Math.round(best.d), konum: exact ? "bina" : "sokak", geo: g.osm, tarih: new Date().toISOString().slice(0, 10) };
    } else res.eslesmeyenListe.push({ marka: brand, ...a, neden: best ? `en yakın OSM şubesi ${Math.round(best.d)} m${roadOk ? "" : ", sokak uyuşmadı"}` : "ilçede OSM şubesi yok", geo: g });
  }
  writeFileSync(geoP, JSON.stringify(GEO)); writeFileSync(out, JSON.stringify(res, null, 1));
  console.log(brand, JSON.stringify(res.markalar[brand]), "OSM nokta", osm.length, "eşleşen toplam", Object.keys(res.eslesen).length);
}
writeFileSync(out, JSON.stringify(res, null, 1));
