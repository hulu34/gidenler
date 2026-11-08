#!/usr/bin/env node
/* ADRES TAMAMLAMA (1.000 operasyonu) — Google'da güçlü doğrulanmış ama OSM kaydında adresi olmayan adaylar için
   adres OSM'nin kendi ters konum servisinden (Nominatim, ODbL) alınır; Google adresi KOPYALANMAZ.
   Kabul şartı: OSM'nin verdiği sokak/cadde adının kökü, doğrulamada Google sayfasında görünen adreste geçiyor.
   Kapı numarası iki kaynakta da aynıysa "kapı birebir" yazılır; değilse adres sokak + mahalle düzeyinde kalır.
   Nominatim kullanım kuralı: saniyede en çok 1 istek, tanıtıcı User-Agent, önbellek.
   Kullanım: node scripts/adres-tamamla.mjs <havuz.json> <çıktı-havuz.json> <doğrulama*.json...> */
import { readFileSync, writeFileSync } from "node:fs";
const [poolFile, outFile, ...resFiles] = process.argv.slice(2);
const pool = JSON.parse(readFileSync(poolFile, "utf8"));
const res = new Map(resFiles.flatMap((f) => JSON.parse(readFileSync(f, "utf8"))).map((o) => [o.slug, o]));
const fold = (s) => (s ?? "").toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
const SUFFIX = /\b(caddesi|cadde|cad|cd|sokagi|sokak|sok|sk|bulvari|bulvar|blv|bulv|yolu|yol|meydani|meydan|cikmazi|cikmaz|mahallesi|mah|mh|yokusu)\b/g;
const core = (road) => fold(road).replace(SUFFIX, " ").replace(/\s+/g, " ").trim();
const houseNo = (s) => (/(?:no[:.\s]*|^|\s)(\d{1,4}[a-z]?)(?=\b|\/)/i.exec(s ?? "")?.[1] ?? "").toLowerCase();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = { aday: 0, kabul: 0, kapiBirebir: 0, sokakTutmadi: 0, sokakYok: 0, hata: 0 };
const out = [];
for (const v of pool) {
  const o = res.get(v.slug);
  if (v.address || !o || o.result !== "güçlü" || !o.best || o.best.closed) { out.push(v); continue; }
  t.aday++;
  let j = null;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${v.lat}&lon=${v.lng}&zoom=18&addressdetails=1&accept-language=tr`, { headers: { "user-agent": "gidenler-adres-dogrulama/1.0 (gidenler.com)" }, signal: AbortSignal.timeout(20000) });
    j = r.ok ? await r.json() : null;
  } catch { j = null; }
  await wait(1100);
  if (!j?.address) { t.hata++; out.push(v); continue; }
  const a = j.address, road = a.road ?? a.pedestrian ?? a.footway ?? "";
  if (!road) { t.sokakYok++; out.push(v); continue; }
  const g = fold(o.best.address), c = core(road);
  if (!c || !c.split(" ").filter((w) => w.length >= 3).every((w) => g.includes(w))) { t.sokakTutmadi++; out.push(v); continue; }
  const gNo = houseNo(o.best.address), oNo = (a.house_number ?? "").toLowerCase();
  const door = oNo && gNo && oNo === gNo;
  const mah = a.suburb ?? a.neighbourhood ?? a.quarter ?? v.neighborhood;
  const address = [door ? `${road} No:${a.house_number}` : road, mah, v.district].filter(Boolean).join(", ");
  t.kabul++; if (door) t.kapiBirebir++;
  out.push({ ...v, address, neighborhood: v.neighborhood ?? mah, addressSource: door ? "OSM ters konum · kapı birebir (Google adresiyle doğrulandı)" : "OSM ters konum · sokak düzeyi (Google adresiyle doğrulandı)" });
}
writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(JSON.stringify(t));
