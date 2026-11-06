/* Bekleyen Google eşleşmeleri için kanıt puanı (ağsız): eşleştiricinin kaydettiği özet (ad/mesafe/telefon/web) +
   Maps sayfasında görülen ad/adres/tür. Çıktı: öneri seviyesi ve gerekçe. KARAR VERMEZ; yalnız yönetici onayına liste hazırlar.
   Kullanım: npx tsx scripts/gpuan-kanit.ts <bekleyen.json> <son.xlsx> <cikti.json> */
import { readFileSync, writeFileSync } from "node:fs";
import { readWorkbook } from "../lib/gpuan/excel";
import { reclassify, STATUS } from "../lib/gpuan/core";
import { sheetVenues } from "../lib/gpuan/venues";
import { addressSimilarity, houseNoConflict, nameSimilarity } from "../lib/match/score";

type P = { id: string; slug: string; name: string; externalId: string; score: number; method: string };
const field = (m: string, k: string) => (m.match(new RegExp(`(?:^|\\s)${k}=(\\S+)`)) ?? [])[1] ?? "";
async function main() {
  const [pj, xl, out] = process.argv.slice(2);
  const pending = (JSON.parse(readFileSync(pj, "utf8")).pending ?? []) as P[];
  const { rows } = await readWorkbook(readFileSync(xl));
  const vs = new Map(sheetVenues().map((v) => [v.slug, v]));
  const by = new Map(rows.map((r) => [r.slug, reclassify(r, vs.get(r.slug))]));
  const res = pending.map((p) => {
    const r = by.get(p.slug), v = vs.get(p.slug);
    const m = { ad: Number(field(p.method, "ad")) || 0, d: Number(field(p.method, "d").replace("m", "")), adres: field(p.method, "adres"), tel: field(p.method, "tel"), web: field(p.method, "web"), zincir: field(p.method, "zincir") === "1", sube: field(p.method, "sube") === "1", rakip: field(p.method, "rakip") === "1", karar: field(p.method, "karar") };
    const seen = r && r.placeId === p.externalId ? r : null;
    const nm = seen?.seenName ? nameSimilarity(v?.name ?? p.name, seen.seenName) : null;
    const as = seen?.seenAddress && v?.address ? addressSimilarity(v.address, seen.seenAddress) : null;
    const clash = seen?.seenAddress && v?.address ? houseNoConflict(v.address, seen.seenAddress) : false;
    const contact = m.tel === "match" || m.web === "match";
    const why: string[] = [];
    let tier: "A" | "B" | "C";
    const blockers = [
      !seen && "Maps okuması yok ya da place ID farklı",
      seen && seen.status === STATUS.closed && "Google'da kalıcı kapalı",
      seen && [STATUS.typeMismatch, STATUS.typeSuspect, STATUS.typeUnknown, STATUS.branch].includes(seen.status as never) && `Maps okuması: ${seen.status}`,
      m.rakip && "yakında başka güçlü aday var",
      !(m.d <= 150) && `eşleştiricide konum ${m.d} m`,
      m.tel === "conflict" && m.web !== "match" && "telefon çelişiyor",
      clash && "kapı numarası farklı",
    ].filter(Boolean) as string[];
    const strong = m.d <= 50 && m.ad >= 0.85 && (nm ?? 0) >= 0.85 && (contact || ((as ?? 0) >= 0.5 && !clash)) && !m.rakip;
    if (blockers.length) { tier = "C"; why.push(...blockers); }
    else if (strong) { tier = "A"; why.push(`ad ${m.ad} / Maps adı ${nm?.toFixed(2)}`, `konum ${m.d} m`, contact ? `iletişim eşleşti (${m.tel === "match" ? "telefon" : "web"})` : `adres benzerliği ${as?.toFixed(2)}`); }
    else { tier = "B"; why.push(`ad ${m.ad}${nm != null ? ` / Maps adı ${nm.toFixed(2)}` : ""}`, `konum ${m.d} m`, `iletişim tel=${m.tel} web=${m.web}`, m.sube ? "adda şube eki" : "", m.zincir ? "zincir marka" : ""); }
    return { slug: p.slug, name: p.name, placeId: p.externalId, identifierId: p.id, tier, why: why.filter(Boolean).join(" · "), matcher: m.karar, rating: seen?.rating ?? null, seenName: seen?.seenName ?? "", status: seen?.status ?? "" };
  });
  writeFileSync(out, JSON.stringify(res, null, 1));
  const t: Record<string, number> = {}; for (const x of res) t[x.tier] = (t[x.tier] ?? 0) + 1;
  console.log(JSON.stringify({ pending: res.length, tiers: t, withRatingA: res.filter((x) => x.tier === "A" && x.rating != null).length, withRatingB: res.filter((x) => x.tier === "B" && x.rating != null).length }));
}
main().catch((e) => { console.error(e); process.exit(1); });
