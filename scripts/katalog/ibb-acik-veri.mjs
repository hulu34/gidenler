/* İBB AÇIK VERİ KANITI — İBB'nin kendi işlettiği yeme-içme tesisleri (Kent Lokantaları, Sosyal Tesisler).
   Kaynak: data.ibb.gov.tr (İBB Açık Veri Lisansı). Resmî işletmeci listesi = faaliyet + adres kanıtı.
   Kimlik OSM kaydıdır: İBB satırı 150 m içinde ve adı uyuşan OSM noktasıyla eşleşir; eşleşmeyen satır kuyruğa gider.
   Kullanım: node scripts/katalog/ibb-acik-veri.mjs <ham-osm.json> <cikti.json> <xlsx:etiket:url>... */
import ExcelJS from "exceljs";
import { readFileSync, writeFileSync } from "node:fs";
const [rawP, out, ...files] = process.argv.slice(2);
const fold = (s) => (s ?? "").toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
const coord = (v, lo, hi) => { const s = String(v).replace(/\D/g, ""); if (!s) return null; const x = Number(s.slice(0, 2) + "." + s.slice(2)); return x >= lo && x <= hi ? x : null; };
const m = (a, b) => Math.hypot((a.lat - b.lat) * 111000, (a.lng - b.lng) * 84000);
const RAW = JSON.parse(readFileSync(rawP, "utf8")).elements.filter((e) => e.tags?.name && (e.lat ?? e.center?.lat));
const res = { eslesen: {}, eslesmeyen: [] };
for (const spec of files) {
  const [f, etiket, url] = spec.split("|");
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(f);
  const rows = []; wb.worksheets[0].eachRow((r, i) => { if (i > 1) rows.push(r.values.slice(1).map((v) => (v && typeof v === "object" ? (v.text ?? v.result ?? "") : v))); });
  for (const [ad, la, ln, adres] of rows) {
    const p = { lat: coord(la, 40.8, 41.6), lng: coord(ln, 27.9, 29.95) };
    if (!p.lat || !p.lng) { res.eslesmeyen.push({ ad, neden: "koordinat okunamadı", kaynak: etiket }); continue; }
    const key = fold(ad).replace(/\b(kent lokantasi|sosyal tesisi|sosyal tesisleri|tesisi|tesisleri|ibb)\b/g, " ").trim();
    let best = null;
    for (const e of RAW) {
      const q = { lat: e.lat ?? e.center.lat, lng: e.lon ?? e.center.lon }; const d = m(p, q); if (d > 150) continue;
      const n = fold(e.tags.name);
      const nameOk = (/kent lokanta/.test(fold(ad)) && /kent lokanta/.test(n)) || (/sosyal tesis/.test(fold(ad)) && /(sosyal tesis|beltur)/.test(n)) || (key.length >= 4 && n.includes(key));
      if (nameOk && (!best || d < best.d)) best = { ref: `${e.type}/${e.id}`, d: Math.round(d), osmAd: e.tags.name };
    }
    if (best) res.eslesen[best.ref] = { kaynak: etiket, url, ibbAd: ad, adres, m: best.d, osmAd: best.osmAd };
    else res.eslesmeyen.push({ ad, adres, lat: p.lat, lng: p.lng, kaynak: etiket, neden: "150 m içinde adı uyuşan OSM noktası yok" });
  }
}
writeFileSync(out, JSON.stringify(res, null, 1));
console.log("eşleşen", Object.keys(res.eslesen).length, "eşleşmeyen", res.eslesmeyen.length);
for (const [r, x] of Object.entries(res.eslesen)) console.log(" ", r, x.ibbAd, "→", x.osmAd, x.m + " m");
