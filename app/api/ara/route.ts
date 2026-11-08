import { NextResponse } from "next/server";
import { searchV3 } from "@/lib/search";

/* SUNUCU TARAFI ARAMA — aynı arama motoru (searchV3: Türkçe/ASCII, yazım hatası, semt, tür, ad katmanı),
   tarayıcıya bütün mekân verisi gönderilmeden. Üst menü hızlı önerisi bunu kullanır; sayfalama: offset + limit.
   Yanıt yalnız kart için gereken alanlar; kişisel veri yok, önbelleğe alınabilir. */
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") ?? "").slice(0, 80);
  const limit = Math.min(60, Math.max(1, Number(u.searchParams.get("limit")) || 6));
  const offset = Math.min(600, Math.max(0, Number(u.searchParams.get("offset")) || 0));
  if (q.trim().length < 2) return NextResponse.json({ q, total: 0, items: [] });
  const r = searchV3(q, { limit: offset + limit });
  const all = [...r.exact, ...r.adjacent];
  const items = all.slice(offset, offset + limit).map((h) => ({
    slug: h.card.entity.slug, name: h.card.entity.name, category: h.card.category.label,
    district: h.card.entity.location?.district ?? null, score: h.card.score, tier: h.tier, reason: h.reason,
  }));
  return NextResponse.json({ q, total: all.length, offset, items }, { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}
