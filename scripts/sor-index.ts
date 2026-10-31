/* Sor Gidenler veri dizini: gerçek mekân kaydı, kaynaklı profil ve yayımlanmış Seçki yazılarından. Çalıştır: npx tsx scripts/sor-index.ts
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
    priceRange: prices.length ? [Math.min(...prices), Math.max(...prices)] : null,
    secki: a ? { title: a.title.tr, slug: a.slug, text: flat([a.title, (a as unknown as { body?: unknown }).body, a]).slice(0, 3000) } : null,
  };
});
writeFileSync("data/real/sor-index.json", JSON.stringify(out));
console.log(out.length, "mekân;", out.filter((x) => x.description).length, "profil;", out.filter((x) => x.secki).length, "Seçki");
