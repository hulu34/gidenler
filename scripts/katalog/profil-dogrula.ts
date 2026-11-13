/* PROFİL DOSYASI DENETİMİ — content/profiles/*.json dosyalarını yönetim yolundaki şemayla (ProfileInput) doğrular;
   saat alanının JSON-LD'ye çevrilebildiğini, slug'ın Production kataloğunda bulunduğunu ve kaynak alan adının
   kayıttaki resmî siteyle ya da profilin kendi web alanıyla tutarlı olduğunu denetler. Veritabanına yazmaz.
   Kullanım: npx tsx scripts/katalog/profil-dogrula.ts [slug …] */
import { readdirSync, readFileSync } from "node:fs";
import { ProfileInput } from "../../lib/profile/index";
import { openingHoursSpec } from "../../lib/seo";
const V: { slug: string }[] = [...JSON.parse(readFileSync("data/real/venues.json", "utf8")), ...JSON.parse(readFileSync("data/real/isletme.json", "utf8"))];
const slugs = new Set(V.map((v) => v.slug));
const want = process.argv.slice(2);
const files = readdirSync("content/profiles").filter((f) => f.endsWith(".json") && (!want.length || want.includes(f.replace(/\.json$/, ""))));
const host = (u: string) => new URL(u).host.replace(/^www\./, "");
let bad = 0, warn = 0;
for (const f of files) {
  const raw = JSON.parse(readFileSync(`content/profiles/${f}`, "utf8"));
  const { videos: _v, _kaynak_notu: _n, ...rest } = raw;
  const errs: string[] = [], uyari: string[] = [];
  const r = ProfileInput.safeParse(rest);
  if (!r.success) errs.push(...r.error.issues.map((i) => `şema: ${i.path.join(".")} ${i.message}`));
  if (`${raw.slug}.json` !== f) errs.push("dosya adı slug ile aynı değil");
  if (!slugs.has(raw.slug)) errs.push("slug Production kataloğunda yok");
  if (raw.hours && !openingHoursSpec(raw.hours.value)) uyari.push(`saat JSON-LD'ye çevrilemiyor: ${raw.hours.value}`);
  if (raw.website && r.success) { const site = host(raw.website.value); const fields = ["description", "address", "phone", "hours", "reservation", "instagram"].map((k) => raw[k]).filter(Boolean).concat(raw.notes ?? [], raw.menu ? [raw.menu] : []);
    for (const x of fields) if (host(x.url) !== site) uyari.push(`kaynak alan adı farklı (QR menü ya da şube sayfası olabilir): ${host(x.url)} ≠ ${site}`); }
  if (raw.menu) for (const s of raw.menu.sections) for (const it of s.items) if (it.priceTry != null && !raw.menu.pricesPublished) errs.push(`fiyat var ama pricesPublished=false: ${it.name}`);
  if (errs.length) { bad++; console.log("✗", f, [...new Set(errs)].join(" | ")); }
  if (uyari.length) { warn++; console.log("!", f, [...new Set(uyari)].join(" | ")); }
}
console.log(`${files.length} profil denetlendi, ${bad} hatalı, ${warn} uyarılı`);
process.exit(bad ? 1 : 0);
