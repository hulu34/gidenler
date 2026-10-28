/* Restoran profili V1 pilot adayları: Google eşleşmesi onaylı mı? (yalnız okuma; Places çağrısı YOK — ?rapor=google-slug veritabanını okur).
   Log yalnız aday slug'ları için evet/hayır ve toplam sayı. */
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const r = await fetch(`https://${process.env.TEST_HOST}/api/admin/db/?rapor=google-slug`, { headers: H });
const j = await r.json().catch(() => ({}));
const slugs = new Set(j.slugs ?? []);
console.log(`ortam=${j.env} · Google içeriği gösterilebilen restoran: ${slugs.size}`);
for (const s of ["ciya-sofrasi-kadikoy", "hunkar-sisli", "karakoy-lokantasi-beyoglu", "yeni-lokanta-beyoglu", "neolokal-beyoglu", "pandeli-fatih", "balikci-sabahattin-fatih", "giritli-fatih", "sofyali-9-restoran-beyoglu", "kor-agop-beyoglu", "haci-ali-ocakbasi-kadikoy", "kosebasi-kadikoy", "viktor-levi-sarap-evi-kadikoy", "ismet-baba-uskudar", "emek-manti-evi-sariyer"])
  console.log(`${slugs.has(s) ? "✓" : "·"} ${s}`);
process.exit(r.ok ? 0 : 1);
