/* Sor Gidenler veri dizini: gerçek mekân kaydı, kaynaklı profil ve yayımlanmış Seçki yazılarından.
   Her derlemede kendiliğinden üretilir (npm prebuild); yeni mekân ve profil elle bir şey yapmadan öneri motoruna girer.
   Doğrulama kalırsa derleme durur: canlıdaki sürüm bozuk dizinle değişmez. --check: dosya güncel değilse hata verir.
   Yalnız kayıtlı bilgi girer; Google içeriği, puan ya da tahmin girmez. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { realEntities } from "../data/real";
import { articles } from "../lib/seckisi";

const list = articles(false);
const flat = (v: unknown): string => (typeof v === "string" ? v : Array.isArray(v) ? v.map(flat).join(" ") : v && typeof v === "object" ? Object.entries(v as object).filter(([k]) => !["en", "url", "src", "sourceUrl", "href"].includes(k)).map(([, x]) => flat(x)).join(" ") : "");
const out = realEntities.filter((e) => !e.isDemo).map((e) => {
  const f = `content/profiles/${e.slug}.json`;
  const p = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
  const items = (p?.menu?.sections ?? []).flatMap((s: { items?: Array<{ name: string; priceTry?: number }> }) => s.items ?? []) as Array<{ name: string; priceTry?: number }>;
  const prices = items.map((i) => i.priceTry).filter((x): x is number => typeof x === "number");
  const a = list.find((x) => x.venues.some((v) => v.slug === e.slug));
  return {
    slug: e.slug, name: e.name, kind: e.subcategory ?? "", district: e.location?.district ?? "", neighborhood: e.location?.neighborhood ?? null,
    address: p?.address?.value ?? e.address ?? null, lat: e.location?.geo?.lat ?? null, lng: e.location?.geo?.lng ?? null, hours: e.contact?.openingHours ?? e.hours ?? null,
    description: p?.description?.value ?? null, notes: (p?.notes ?? []).map((n: { value: string }) => n.value), menu: items.map((i) => i.name).slice(0, 60),
    priceRange: prices.length ? [Math.min(...prices), Math.max(...prices)] : null, priceMedian: prices.length ? [...prices].sort((x, y) => x - y)[Math.floor(prices.length / 2)] : null,
    secki: a ? { title: a.title.tr, slug: a.slug, text: flat([a.title, (a as unknown as { body?: unknown }).body, a]).slice(0, 3000) } : null,
  };
});
const PATH = "data/real/sor-index.json";
const prev = existsSync(PATH) ? (JSON.parse(readFileSync(PATH, "utf8")) as unknown[]) : [];
const bad = out.filter((x) => !x.slug || !x.name || !x.kind);
const slugs = new Set(out.map((x) => x.slug));
const stop = (m: string) => { console.error("sor-index:", m); process.exit(1); };
if (out.length < 100) stop(`yalnız ${out.length} mekân`);
if (prev.length && out.length < prev.length * 0.8) stop(`mekân sayısı ${prev.length} → ${out.length}: ani düşüş`);
if (bad.length) stop(`${bad.length} kayıtta ad, slug ya da tür yok`);
if (slugs.size !== out.length) stop("yinelenen slug");
if (/googleusercontent|places\.googleapis|"rating"/.test(JSON.stringify(out))) stop("Google içeriği dizine girmiş");
const text = JSON.stringify(out);
if (process.argv.includes("--check")) { if (!existsSync(PATH) || readFileSync(PATH, "utf8") !== text) stop("dizin güncel değil; npx tsx scripts/sor-index.ts"); }
else writeFileSync(PATH, text);
console.log(out.length, "mekân;", out.filter((x) => x.description).length, "profil;", out.filter((x) => x.secki).length, "Seçki");
