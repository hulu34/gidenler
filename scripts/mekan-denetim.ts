/* MEKÂN KALİTE DENETİMİ (ücretsiz, ağsız): data/real kayıtları A/B/C/D gruplarına ayrılır.
   A — kullanıma hazır · B — kullanılabilir, eksikleri var · C — kimlik/şube/tür/erişim doğrulaması gerekiyor · D — kaldırılmalı/birleştirilmeli.
   Google'a istek atılmaz. Google eşleşmesi Production veritabanındadır; GOOGLE_SLUGS dosyası verilirse (yalnız slug listesi) okunur.
   Çıktı: calisma/mekan-denetim.json ve .md (yolu MEKAN_DENETIM_OUT ile değişir). */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { realVenueRecords, realVenueReview, invalidRecord, type RealVenueRecord } from "../data/real";
import { realEntities } from "../data/real";
import { coverOf } from "../lib/media/cover";

const OUT = process.env.MEKAN_DENETIM_OUT ?? "../calisma";
/* AG_JSON: ops/mekan-ag çıktısı (Production Google eşleşme durumu + web sitesi bağlantı kontrolü) */
const ag = process.env.AG_JSON && existsSync(process.env.AG_JSON) ? JSON.parse(readFileSync(process.env.AG_JSON, "utf8")) as { googleUsable: string[]; googlePending: string[]; links: Record<string, { url: string; status: number; error?: string }> } : null;
const google = new Set<string>(ag?.googleUsable ?? []);
const gPending = new Set<string>(ag?.googlePending ?? []);
const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
const meters = (a: RealVenueRecord, b: RealVenueRecord) => {
  if (typeof a.lat !== "number" || typeof b.lat !== "number" || typeof a.lng !== "number" || typeof b.lng !== "number") return Infinity;
  const R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  return 2 * R * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2));
};
/* adında açık tür ipucu olan kelimeler → beklenen tür (kayıttaki tür bununla çelişiyorsa C) */
const NAME_KIND: Array<[RegExp, RegExp, string]> = [
  [/\bburger\b/, /burger/i, "Burger"], [/\bpizz/, /pizza/i, "Pizza"], [/\bbalik|\bfish\b|\bbalikci/, /balık/i, "Balık restoranı"],
  [/\bkebap|\bkebab|\bocakbasi|\bdurum\b/, /kebap|ocakbaşı|döner/i, "Kebapçı / Ocakbaşı"], [/\bdoner/, /döner|kebap/i, "Dönerci"],
  [/\bmeyhane/, /meyhane/i, "Meyhane"], [/\bsushi\b/, /sushi|japon/i, "Sushi / Japon"], [/\bpide|\bpideci/, /pide/i, "Pideci"],
  [/\bmanti/, /mantı/i, "Mantıcı"], [/\bkahvalti|\bbreakfast\b/, /kahvaltı/i, "Kahvaltı"], [/\bsteak|\bsteakhouse/, /steak|et/i, "Steakhouse"],
];
const RESTRICTED = /sosyal tesis|polis evi|orduevi|ordu evi|askeri|kulubu|kulub|lokali|ogretmenevi|ogretmen evi|mensuplari/;

type Grp = "A" | "B" | "C" | "D";
interface Row { slug: string; name: string; district: string; kind: string; group: Grp; durum: "Tamamlandı" | "Eksik" | "Doğrulama gerekiyor"; issues: string[]; missing: string[]; photo: string; google: string; site: string; contact: string; map: string; source: string }
const rows: Row[] = [];
const bySlug = new Map<string, number>();
for (const r of realVenueRecords) bySlug.set(r.slug, (bySlug.get(r.slug) ?? 0) + 1);
const ent = new Map(realEntities.map((e) => [e.slug, e]));

for (const r of realVenueRecords) {
  const issues: string[] = [], missing: string[] = []; let d = false, c = false;
  const inv = invalidRecord(r); if (inv) { issues.push(`geçersiz kayıt: ${inv}`); c = true; }
  if ((bySlug.get(r.slug) ?? 0) > 1) { issues.push("slug tekrarı (profil adresi çakışır)"); d = true; }
  const n = fold(r.name);
  /* mükerrer: aynı ad ≤ 60 m (aynı bina) → D; aynı ad aynı ilçe > 60 m → şube olabilir → C */
  for (const o of realVenueRecords) {
    if (o === r || fold(o.name) !== n) continue;
    const m = meters(r, o);
    if (m <= 60) { issues.push(`mükerrer olası: ${o.slug} (${Math.round(m)} m)`); d = true; }
    else if (o.district === r.district) { issues.push(`aynı ad aynı ilçe: ${o.slug} (şube mi?)`); c = true; }
  }
  /* aynı adres + adın ilk kelimesi aynı: ayrı web siteleri varsa ayrı markadır (ör. aynı caddede iki şube), değilse birleştirme adayı */
  const twin = realVenueRecords.find((o) => o !== r && o.address && r.address && fold(o.address) === fold(r.address) && fold(o.name).split(" ")[0] === n.split(" ")[0]);
  if (twin) { if (twin.website && r.website && twin.website !== r.website) issues.push(`aynı sokak adresinde ayrı marka: ${twin.slug}`); else { issues.push(`aynı adreste benzer adlı kayıt: ${twin.slug}`); d = true; } }
  const hints = NAME_KIND.filter(([re]) => re.test(n));
  if (hints.length && !hints.some(([, ok]) => ok.test(r.kind))) { issues.push(`tür çelişkisi: adı "${hints.map((h) => h[2]).join(" / ")}" diyor, kayıtta "${r.kind}"`); c = true; }
  if (RESTRICTED.test(n)) { issues.push("üyelere/kuruma özel olabilir (herkese açık mı doğrulanmalı)"); c = true; }
  if (r.categoryId === "cat.restaurant" && r.osmAmenity && r.osmAmenity !== "restaurant") issues.push(`OSM türü ${r.osmAmenity}, kategori restoran`);
  if (!r.address) missing.push("adres");
  if (typeof r.lat !== "number") missing.push("harita noktası");
  if (!r.phone && !r.website && !r.instagram) missing.push("iletişim/rezervasyon kanalı");
  if (!r.openingHours) missing.push("çalışma saatleri");
  if (!r.kind || r.kind === "Restoran") missing.push("mutfak türü");
  if (!r.cuisine?.length) missing.push("mutfak etiketi");
  const e = ent.get(r.slug);
  const cover = e ? coverOf(e, undefined) : null;
  if (!cover) missing.push("izinli fotoğraf");
  /* Google eşleşmesi (Production): kullanılabilir / onay bekliyor / yok */
  const gState = !ag ? "bilinmiyor" : google.has(r.slug) ? "eşleşmiş" : gPending.has(r.slug) ? "onay bekliyor" : "yok";
  if (gState === "onay bekliyor") { issues.push("Google eşleşmesi yönetici onayı bekliyor"); c = true; }
  /* web sitesi: düzeltme sonrası kayıttaki adres; ilk taramadaki sonuç */
  const lk = ag?.links[r.slug];
  let site = r.website ? "var" : "yok";
  if (lk && r.website) {
    if (r.website !== lk.url) site = "düzeltildi (ana sayfaya)";
    else if (lk.status >= 200 && lk.status < 400) site = "çalışıyor";
    else if (lk.status === 403) site = "bot engelli (403), elle bakılmalı";
    else { site = `sorunlu (${lk.error ?? lk.status})`; issues.push(`web sitesi açılmıyor: ${lk.error ?? lk.status}`); c = true; }
  } else if (lk && !r.website) site = "kaldırıldı (ölü bağlantı)";
  const g: Grp = d ? "D" : c ? "C" : missing.filter((x) => x !== "izinli fotoğraf" && x !== "mutfak etiketi").length ? "B" : "A";
  const durum = g === "A" ? "Tamamlandı" : g === "B" ? "Eksik" : "Doğrulama gerekiyor";
  rows.push({ slug: r.slug, name: r.name, district: r.district, kind: r.kind, group: g, durum, issues, missing, site,
    photo: cover ? `${cover.source} · ${cover.credit}` : "yok", google: gState,
    contact: [r.phone && "telefon", r.website && "web", r.instagram && "instagram"].filter(Boolean).join(", ") || "yok",
    map: typeof r.lat === "number" ? "koordinat" : r.address ? "adresle arama" : "yok", source: r.ref.startsWith("isletme/") ? `işletme (${r.sourceUrl})` : `OSM ${r.ref}` });
}
const count = (g: Grp) => rows.filter((x) => x.group === g).length;
const cats = realVenueRecords.reduce<Record<string, number>>((m, r) => ((m[r.categoryId] = (m[r.categoryId] ?? 0) + 1), m), {});
const amen = realVenueRecords.reduce<Record<string, number>>((m, r) => ((m[r.osmAmenity ?? "işletme"] = (m[r.osmAmenity ?? "işletme"] ?? 0) + 1), m), {});
const miss = rows.flatMap((r) => r.missing).reduce<Record<string, number>>((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {});
const sum = { toplam: rows.length, A: count("A"), B: count("B"), C: count("C"), D: count("D"), kategori: cats, osmTuru: amen, eksikler: miss, incelemeCiftleri: realVenueReview.length, google: ag ? { eslesmis: rows.filter((r) => r.google === "eşleşmiş").length, onayBekliyor: rows.filter((r) => r.google === "onay bekliyor").length, yok: rows.filter((r) => r.google === "yok").length } : "verilmedi", site: rows.reduce<Record<string, number>>((m, r) => ((m[r.site.replace(/ \(.*$/, "")] = (m[r.site.replace(/ \(.*$/, "")] ?? 0) + 1), m), {}), durum: { tamamlandi: rows.filter((r) => r.durum === "Tamamlandı").length, eksik: rows.filter((r) => r.durum === "Eksik").length, dogrulama: rows.filter((r) => r.durum === "Doğrulama gerekiyor").length } };
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/mekan-denetim.json`, JSON.stringify({ ozet: sum, kayitlar: rows }, null, 1));
const line = (r: Row) => `| ${r.durum} | [${r.name}](https://www.gidenler.com/mekan/${r.slug}/) | ${r.district} | ${r.kind} | ${r.google} | ${r.site} | ${r.photo === "yok" ? "yok" : "izinli"} | ${r.issues.join("; ") || "—"} | ${r.missing.filter((x) => x !== "izinli fotoğraf").join(", ") || "—"} |`;
writeFileSync(`${OUT}/mekan-denetim.md`, [
  `# Mekân kalite denetimi`, ``, `Toplam ${sum.toplam}: **Tamamlandı ${sum.durum.tamamlandi}** · **Eksik ${sum.durum.eksik}** · **Doğrulama gerekiyor ${sum.durum.dogrulama}** (A ${sum.A} · B ${sum.B} · C ${sum.C} · D ${sum.D})`, ``, `Google: ${JSON.stringify(sum.google)} · Web sitesi: ${JSON.stringify(sum.site)}`, ``,
  `Kategori: ${JSON.stringify(cats)} · OSM türü: ${JSON.stringify(amen)}`, ``, `Eksikler: ${Object.entries(miss).map(([k, v]) => `${k} ${v}`).join(" · ")}`, ``,
  `## Doğrulama gerekiyor`, ``, `| Durum | Mekân | Semt | Tür | Google | Web sitesi | Fotoğraf | Sorun | Eksik |`, `|---|---|---|---|---|---|---|---|---|`,
  ...rows.filter((r) => r.group === "D" || r.group === "C").map(line), ``,
  `## Eksik`, ``, `| Durum | Mekân | Semt | Tür | Google | Web sitesi | Fotoğraf | Sorun | Eksik |`, `|---|---|---|---|---|---|---|---|---|`, ...rows.filter((r) => r.group === "B").map(line), ``,
  `## Tamamlandı`, ``, `| Durum | Mekân | Semt | Tür | Google | Web sitesi | Fotoğraf | Sorun | Eksik |`, `|---|---|---|---|---|---|---|---|---|`, ...rows.filter((r) => r.group === "A").map(line),
].join("\n"));
console.log(JSON.stringify(sum, null, 1));
