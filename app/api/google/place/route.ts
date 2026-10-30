import { NextResponse } from "next/server";
import { getEntity } from "@/data/entities";
import { fetchGooglePhotoMedia, fetchGoogleView, googleEnabled, type GooglePhotoRef } from "@/lib/providers/google";
import { googleCallAllowed } from "@/lib/providers/googlePolicy";
import { strictHit } from "@/lib/usage/rate";
import { hashKey } from "@/lib/ai/privacy";

/* GET /api/google/place?slug=…&part=view|media|status — Google Places (New) canlı vekil. YALNIZCA sunucu.
   · part=view (varsayılan): sayfa açılınca TEK istek — puan, sayı, yorumlar, saatler, ilk 5 fotoğraf + kalan referanslar.
   · POST part=media (gövde: { refs }): galeride kalan fotoğraflar; yalnız Photo istekleri.
   · Eski part=reviews / photos kapatıldı (410).
   · Her ücretli çağrı önce izin kapısından geçer (googleCallAllowed): varsayılan kapalı.
   · part=status: Google'a istek ATMAZ; yalnız bu mekânın onaylı/otomatik Google kimliği var mı (düğmeyi göstermek için).
   · Eşleştirme burada HİÇ yapılmaz (yalnız yönetici işi).
   · Anahtar yoksa / kapalıysa { disabled: true } (bileşen yalnız Google Haritalar bağlantısı gösterir).
   · Yalnız gerçek mekânlar; demo kayıtlar için Google'a sorgu atılmaz.
   · Önbellek YOK (Google kuralı). Maliyet koruması: lib/usage/counter (önce say, sonra çağır; çalışmazsa durdur)
     + kişi başı saatlik sınır. Bütçe dolunca { limited: true } → istemci "tıklayınca yükle" kipine düşer. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const H = { "Cache-Control": "no-store" };
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|headless|lighthouse|pagespeed|preview|curl|wget|python|axios|node-fetch/i;

export async function GET(req: Request) {
  if (!googleEnabled()) return NextResponse.json({ disabled: true }, { headers: H });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const e = getEntity(slug);
  if (!e || !e.isReal) return NextResponse.json({ error: "not_found" }, { status: 404, headers: H });

  const part = new URL(req.url).searchParams.get("part") ?? "view";
  if (part === "status") {
    const s = await googleCallAllowed(slug);
    return NextResponse.json({ available: !!s && "id" in s }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  }
  if (part === "reviews" || part === "photos") return NextResponse.json({ error: "gone" }, { status: 410, headers: H });
  if (part !== "view") return NextResponse.json({ error: "bad_part" }, { status: 400, headers: H });

  /* Arama motoru ve otomasyon botları ücretli çağrı tetiklemez. */
  if (BOT.test(req.headers.get("user-agent") ?? "")) return NextResponse.json({ disabled: true }, { headers: H });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  /* Kişi başı saatlik sınır (sayfa başına 1 istek); varsayılan 10, ortam değişkeniyle en çok 60. Harcama ayrıca 100 USD tavanında. */
  const perIp = Math.min(60, Math.max(1, Number(process.env.GOOGLE_PLACES_IP_HOURLY) || 10));
  if (!(await strictHit(`gp:${hashKey("ip:" + ip)}:h${Math.floor(Date.now() / 3_600_000)}`, perIp, 3700))) {
    return NextResponse.json({ limited: true, reason: "rate" }, { status: 429, headers: H });
  }

  const q = new URL(req.url).searchParams;
  /* n: ilk istekte kaç fotoğraf (mobil 1 = yalnız görünen kapak; masaüstü 5 = mozaik) */
  const r = await fetchGoogleView(slug, fetch, Math.max(1, Math.min(5, Number(q.get("n")) || 5)));
  switch (r.state) {
    case "ok": return NextResponse.json(r.data, { headers: H });
    case "disabled": return NextResponse.json({ disabled: true }, { headers: H });
    case "limit": return NextResponse.json({ limited: true, reason: r.reason }, { status: 429, headers: H });
    case "unmatched": return NextResponse.json({ unmatched: true, reason: r.reason }, { status: 404, headers: H });
    default: return NextResponse.json({ error: "upstream" }, { status: 502, headers: H });
  }
}

/* POST /api/google/place?slug=…&part=media — galerinin kalan Google fotoğrafları (gövde: { refs: GooglePhotoRef[] }). */
export async function POST(req: Request) {
  if (!googleEnabled()) return NextResponse.json({ disabled: true }, { headers: H });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const e = getEntity(slug);
  if (!e || !e.isReal) return NextResponse.json({ error: "not_found" }, { status: 404, headers: H });
  if (BOT.test(req.headers.get("user-agent") ?? "")) return NextResponse.json({ disabled: true }, { headers: H });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  const perIp = Math.min(60, Math.max(1, Number(process.env.GOOGLE_PLACES_IP_HOURLY) || 10));
  /* galeri/şerit devamı ayrı sayılır (sayfa görünümü payını yemesin); tavanı sayfa payının 3 katı */
  if (!(await strictHit(`gpm:${hashKey("ip:" + ip)}:h${Math.floor(Date.now() / 3_600_000)}`, perIp * 3, 3700))) {
    return NextResponse.json({ limited: true, reason: "rate" }, { status: 429, headers: H });
  }
  let refs: GooglePhotoRef[] = [];
  try { const b = await req.json(); refs = Array.isArray(b?.refs) ? b.refs : []; } catch { /* boş */ }
  const r = await fetchGooglePhotoMedia(slug, refs);
  switch (r.state) {
    case "ok": return NextResponse.json(r.data, { headers: H });
    case "limit": return NextResponse.json({ limited: true, reason: r.reason }, { status: 429, headers: H });
    case "unmatched": return NextResponse.json({ unmatched: true }, { status: 404, headers: H });
    case "disabled": return NextResponse.json({ disabled: true }, { headers: H });
    default: return NextResponse.json({ error: "upstream" }, { status: 502, headers: H });
  }
}
