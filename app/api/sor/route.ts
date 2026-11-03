import { NextResponse } from "next/server";
import { checkRate } from "@/lib/ai/ratelimit";
import { RequestSchema, sor, sorAvailable } from "@/lib/sor/ask";
import { sorCapUsd, spentUsd } from "@/lib/sor/harcama";
import { candidatesFor } from "@/lib/ai/router";
import { allowedProviders, kotaDurum } from "@/lib/sor/kota";
import { previewWriteGuard } from "@/lib/db/fingerprint";
import { realEntities } from "@/data/real";
import { coverOf } from "@/lib/media/cover";
import { publishedScores } from "@/lib/live";
import { CONFIDENCE_TEXT } from "@/lib/score/publishedCards";
import type { SorResult } from "@/lib/sor/ask";

/* POST /api/sor — Sor Gidenler. Anahtarlar yalnız sunucuda; hesap ve profil modele gönderilmez. Hata boş sonuç gibi gösterilmez. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;
const H = { "Cache-Control": "no-store" };

/* Durum: yalnız Preview ve yerel; değer ya da anahtar içermez. Üretimde yok. */
export async function GET() {
  if (process.env.VERCEL_ENV === "production") return NextResponse.json({ error: "not_found" }, { status: 404, headers: H });
  const url = process.env.DATABASE_URL;
  const only = allowedProviders(), pick = (r: "primary" | "fast") => candidatesFor(r).find((c) => !only || only.includes(c.provider)) ?? null;
  const c = pick("primary"), f = pick("fast");
  return NextResponse.json({ env: process.env.VERCEL_ENV ?? "dev", db: !url ? "yok" : previewWriteGuard(url).ok ? "yalitilmis" : "kapali", ai: sorAvailable("primary"), yalnizUcretsiz: !!only, provider: c?.provider ?? null, model: c?.model ?? null, fast: f?.model ?? null, kota: c ? await kotaDurum(c.provider, c.model) : null, capUsd: sorCapUsd(), spentUsd: await spentUsd() }, { headers: H });
}

/* Kart eki: yalnız kayıtlı, hak bilgili kapak ve yayımlanmış Gidenler puanı (rating_history). Yoksa alan boş kalır; tahmin yok.
   Model bu alanları görmez ve değiştiremez: sunucu, seçilen slug'a göre kendi kaydından ekler. */
const ENT = new Map(realEntities.map((e) => [e.slug, e]));
async function ekle(r: SorResult) {
  const puan = await publishedScores().catch(() => ({} as Awaited<ReturnType<typeof publishedScores>>));
  const f = <T extends { slug: string }>(c: T) => {
    const e = ENT.get(c.slug), cover = e ? coverOf(e) : null, p = puan[c.slug];
    return { ...c, cover, puan: p && p.score != null ? { score: p.score, count: p.reviewCount, confidence: CONFIDENCE_TEXT[p.confidence] ?? null } : null };
  };
  return { ...r, items: r.items.map(f), alternatives: r.alternatives.map(f) };
}

export async function POST(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return NextResponse.json({ error: "forbidden" }, { status: 403, headers: H });
  const p = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid_request", message: "İsteğini anlayamadım; biraz daha kısa yazar mısın?" }, { status: 400, headers: H });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const rl = await checkRate(ip, null);
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited", message: "Çok hızlı soruyorsun; biraz sonra yeniden dene." }, { status: 429, headers: { ...H, "Retry-After": "60" } });
  try { return NextResponse.json(await ekle(await sor(p.data)), { headers: H }); }
  catch { return NextResponse.json({ error: "internal", message: "Sor Gidenler şu an yanıt veremedi; yeniden dene." }, { status: 500, headers: H }); }
}
