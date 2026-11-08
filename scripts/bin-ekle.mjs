#!/usr/bin/env node
/* AŞAMALI YENİ MEKÂN EKLEME (1.000 operasyonu): doğrulanmış adaylardan hedef sayıya kadar venues.json'a ekler.
   Kullanım: node scripts/bin-ekle.mjs <hedef-toplam> <dalga> <aday-havuzu.json> <paket-çıktı.json> <doğrulama*.json...>
   Ekleme şartı (hepsi):
   · Google sayfasında GÜÇLÜ doğrulama (ad + konum; ya da telefon/alan adı + konum), kalıcı kapalı DEĞİL,
     tür yeme-içme, Google kaydı başka bir Gidenler mekânına bağlı değil
   · OSM kaydında açık adres (sokak/cadde) var — adres Google'dan KOPYALANMAZ
   · aynı Google kaydı iki adaya çıktıysa ikisi de eklenmez (elle inceleme)
   Seçim: semtler arasında sırayla, tür tavanı %25; mevcut kayıtlar korunur, hiçbir kayıt silinmez.
   Çıktı: venues.json (yeni satırlar wave=<dalga>), Google eşleşme paketi ({ yeni: [{slug, placeId, note}] }), rapor (stdout). */
import { readFileSync, writeFileSync } from "node:fs";

const [targetArg, waveArg, poolFile, packFile, ...resFiles] = process.argv.slice(2);
const TARGET = Number(targetArg), WAVE = Number(waveArg);
if (!TARGET || !WAVE || !poolFile || !packFile || !resFiles.length) { console.error("kullanım: bin-ekle.mjs <hedef> <dalga> <havuz> <paket> <doğrulama...>"); process.exit(2); }
const venuesUrl = new URL("../data/real/venues.json", import.meta.url);
const existing = JSON.parse(readFileSync(venuesUrl, "utf8"));
const pool = new Map(JSON.parse(readFileSync(poolFile, "utf8")).map((v) => [v.slug, v]));
const results = resFiles.flatMap((f) => JSON.parse(readFileSync(f, "utf8")));
const today = new Date().toISOString().slice(0, 10);

const report = { havuz: pool.size, dogrulanan: 0, guclu: 0, orta: 0, bulunamadi: 0, engel: 0, kapali: 0, baskaMekanda: 0, turUygunDegil: 0, adresYok: 0, ayniGoogleIki: 0, eklenen: 0 };
/* kurum tesisi / kapalı devre yemekhane: herkese açık restoran değil → eklenmez, elle incelemeye */
const INSTITUTION = /belediye|dining hall|üniversite|universite|kampüs|kampus|öğrenci|ogrenci|\byurdu?\b|hastane|kafeterya|cafeteria|yemekhane|orduevi|askeri|personel/i;
report.kurum = 0;
const strong = [];
const have = new Set(existing.map((e) => e.slug));
for (const o of results) {
  const v = pool.get(o.slug); if (!v || have.has(o.slug)) continue;   // önceki dalgada eklenenler tekrar sayılmaz
  report.dogrulanan++;
  const tried = o.tried ?? [];
  if (tried.some((t) => t.blocked)) report.engel++;
  if (tried.some((t) => t.closed)) report.kapali++;
  if (tried.some((t) => /başka mekâna bağlı/.test(t.why ?? ""))) report.baskaMekanda++;
  if (tried.some((t) => /yeme-içme|konaklama|tür/.test(t.why ?? "") && t.level === "uygun değil")) report.turUygunDegil++;
  if (o.result === "güçlü") report.guclu++; else if (o.result === "orta") report.orta++; else report.bulunamadi++;
  if (o.result !== "güçlü" || !o.best || o.best.closed) continue;
  if (!v.address) { report.adresYok++; continue; }
  if (INSTITUTION.test(v.name)) { report.kurum++; continue; }
  strong.push({ v, b: o.best });
}
/* önceki dalgaların paketlerinde kullanılan Google kayıtları (ESKI_PAKET=a.json,b.json) yeni adaya verilmez */
const usedPid = new Set((process.env.ESKI_PAKET ?? "").split(",").filter(Boolean).flatMap((f) => JSON.parse(readFileSync(f, "utf8")).yeni.map((x) => x.placeId)));
report.oncekiDalgadaGoogle = 0;
for (let i = strong.length - 1; i >= 0; i--) if (usedPid.has(strong[i].b.placeId)) { strong.splice(i, 1); report.oncekiDalgadaGoogle++; }
/* aynı Google kaydı iki adayda → ikisi de elle incelemeye */
const byPid = new Map(); for (const s of strong) byPid.set(s.b.placeId, [...(byPid.get(s.b.placeId) ?? []), s]);
const twice = [...byPid.values()].filter((x) => x.length > 1).flat();
report.ayniGoogleIki = twice.length;
const ok = strong.filter((s) => byPid.get(s.b.placeId).length === 1);

const need = Math.max(0, TARGET - existing.length);
const byD = new Map(); for (const s of ok) byD.set(s.v.district, [...(byD.get(s.v.district) ?? []), s]);
const kindCount = new Map(), KIND_CAP = Math.max(8, Math.ceil(need * 0.25));
const picked = [];
for (let round = 0; picked.length < need; round++) {
  let progressed = false;
  for (const [, list] of byD) {
    if (picked.length >= need) break;
    while (list.length) {
      const s = list.shift();
      if ((kindCount.get(s.v.kind) ?? 0) >= KIND_CAP) continue;
      kindCount.set(s.v.kind, (kindCount.get(s.v.kind) ?? 0) + 1); picked.push(s); progressed = true; break;
    }
  }
  if (!progressed) break;
}
const ev = (b) => [b.phoneMatch ? "telefon birebir" : "", b.webMatch ? "alan adı birebir" : "", `konum ${b.distanceM} m`, `ad ${b.nameSim}`].filter(Boolean).join(" · ");
const rows = picked.map(({ v, b }) => ({ ...v, wave: WAVE, verifiedAt: today, confidence: "güçlü", verification: `Google sayfası (${today}): ${ev(b)}; kalıcı kapalı değil${v.addressSource ? `; adres: ${v.addressSource}` : ""}` }));
const all = [...existing, ...rows];
const dup = (k) => all.length - new Set(all.map(k)).size;
if (dup((v) => v.slug) || dup((v) => v.ref)) { console.error("tekrarlı slug/ref", dup((v) => v.slug), dup((v) => v.ref)); process.exit(1); }
writeFileSync(venuesUrl, "[\n" + all.map((v) => JSON.stringify(v)).join(",\n") + "\n]\n");
const pack = { yeni: picked.map(({ v, b }) => ({ slug: v.slug, name: v.name, placeId: b.placeId, note: `Sahip onayı bekleniyor · yeni mekân (dalga ${WAVE}) doğrulaması: ${ev(b)}` })) };
writeFileSync(packFile, JSON.stringify(pack, null, 1));
report.eklenen = rows.length;
const count = (xs, k) => Object.fromEntries([...xs.reduce((m, x) => m.set(k(x), (m.get(k(x)) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1]));
console.log(JSON.stringify({ hedef: TARGET, toplam: all.length, ...report, kalanGuclu: ok.length - picked.length,
  yeniSemt: count(rows, (v) => v.district), yeniTur: count(rows, (v) => v.kind),
  elle: twice.map((s) => ({ slug: s.v.slug, placeId: s.b.placeId.slice(0, 8) + "…" })) }, null, 1));
