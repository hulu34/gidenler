/* Restoran profili V1 pilot adayları: Google eşleşmesi onaylı mı? (yalnız okuma; Places çağrısı YOK — ?rapor=google-slug veritabanını okur).
   Log yalnız aday slug'ları için evet/hayır ve toplam sayı. */
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const r = await fetch(`https://${process.env.TEST_HOST}/api/admin/db/?rapor=google-slug`, { headers: H });
const j = await r.json().catch(() => ({}));
const slugs = new Set(j.slugs ?? []);
console.log(`ortam=${j.env} · Google içeriği gösterilebilen restoran: ${slugs.size}`);
for (const s of ["hunkar-sisli","karakoy-lokantasi-beyoglu","yeni-lokanta-beyoglu","neolokal-beyoglu","pandeli-fatih","balikci-sabahattin-fatih","giritli-fatih","kosebasi-kadikoy","viktor-levi-sarap-evi-kadikoy","ismet-baba-uskudar","emek-manti-evi-sariyer","sultanahmet-koftecisi-kadikoy","ali-ocakbasi-kadikoy","borsa-lokantasi-caddebostan-kadikoy","bebek-balikci-besiktas","sur-balik-restoran-arnavutkoy-besiktas","feriye-besiktas","akinti-burnu-balik-restaurant-besiktas","frontiere-istanbul-besiktas","adanali-kebapci-mehmet-sisli","tarihi-sultanahmet-koftecisi-selim-usta-fatih","ekmek-teknesi-uskudar","del-mare-uskudar","filizler-koftecisi-uskudar","arnavutkoy-balikcisi-sariyer","azur-sariyer","emirgan-sutis-besiktas","fiko-ocakbasi-sariyer","efe-ocakbasi-yesilkoy-bakirkoy","etci-mehmet-bakirkoy","durumcu-baba-bakirkoy","antiochia-beyoglu","gunaydin-beyoglu","sofyali-9-restoran-beyoglu"])
  console.log(`${slugs.has(s) ? "✓" : "·"} ${s}`);
process.exit(r.ok ? 0 : 1);
