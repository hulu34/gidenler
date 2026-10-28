import { NextResponse } from "next/server";
import { getEntity } from "@/data/entities";
import { fetchGooglePlace, googleEnabled, storedGooglePlaceId } from "@/lib/providers/google";
import { strictHit } from "@/lib/usage/rate";
import { hashKey } from "@/lib/ai/privacy";

/* GET /api/google/place?slug=…&part=status|reviews|photos — Google Places (New) canlı vekil. YALNIZCA sunucu.
   · part=status: Google'a istek ATMAZ; yalnız bu mekânın onaylı/otomatik Google kimliği var mı (düğmeyi göstermek için).
   · part=reviews / photos: yalnız kullanıcı düğmeye basınca. Eşleştirme burada HİÇ yapılmaz (yalnız toplu iş).
   · Anahtar yoksa / kapalıysa { disabled: true } (bileşen yalnız Google Haritalar bağlantısı gösterir).
   · Yalnız gerçek mekânlar; demo kayıtlar için Google'a sorgu atılmaz.
   · Önbellek YOK (Google kuralı). Maliyet koruması: lib/usage/counter (önce say, sonra çağır; çalışmazsa durdur)
     + kişi başı saatte 5 istek. Bütçe dolunca { limited: true } → istemci "tıklayınca yükle" kipine düşer. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const H = { "Cache-Control": "no-store" };
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|headless|lighthouse|pagespeed|preview|curl|wget|python|axios|node-fetch/i;

export async function GET(req: Request) {
  if (!googleEnabled()) return NextResponse.json({ disabled: true }, { headers: H });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const e = getEntity(slug);
  if (!e || !e.isReal) return NextResponse.json({ error: "not_found" }, { status: 404, headers: H });

  const part = new URL(req.url).searchParams.get("part") ?? "reviews";
  if (part === "status") {
    const s = await storedGooglePlaceId(slug).catch(() => null);
    return NextResponse.json({ available: !!s && "id" in s }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  }
  if (part !== "reviews" && part !== "photos") return NextResponse.json({ error: "bad_part" }, { status: 400, headers: H });

  /* Arama motoru ve otomasyon botları ücretli çağrı tetiklemez. */
  if (BOT.test(req.headers.get("user-agent") ?? "")) return NextResponse.json({ disabled: true }, { headers: H });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  /* Kişi başı saatlik sınır; varsayılan 5. Yalnız korumalı test dağıtımında (--env) yükseltilebilir. */
  const perIp = Math.min(60, Math.max(1, Number(process.env.GOOGLE_PLACES_IP_HOURLY) || 5));
  if (!(await strictHit(`gp:${hashKey("ip:" + ip)}:h${Math.floor(Date.now() / 3_600_000)}`, perIp, 3700))) {
    return NextResponse.json({ limited: true, reason: "rate" }, { status: 429, headers: H });
  }

  const q = new URL(req.url).searchParams;
  const r = await fetchGooglePlace(slug, fetch, part, { from: Number(q.get("from")) || 0, n: Number(q.get("n")) || undefined });
  switch (r.state) {
    case "ok": return NextResponse.json(r.data, { headers: H });
    case "disabled": return NextResponse.json({ disabled: true }, { headers: H });
    case "limit": return NextResponse.json({ limited: true, reason: r.reason }, { status: 429, headers: H });
    case "unmatched": return NextResponse.json({ unmatched: true, reason: r.reason }, { status: 404, headers: H });
    default: return NextResponse.json({ error: "upstream" }, { status: 502, headers: H });
  }
}
