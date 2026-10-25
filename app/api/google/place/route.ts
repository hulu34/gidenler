import { NextResponse } from "next/server";
import { getEntity } from "@/data/entities";

/* GET /api/google/place?slug=… — Google Places (New) canlı vekil. YALNIZCA sunucu; anahtar istemciye gitmez.
   · GOOGLE_PLACES_API_KEY yoksa { disabled: true } (bileşen yalnızca Google Haritalar bağlantısı gösterir).
   · Yalnızca gerçek mekânlar (demo kayıtlar için Google'a sorgu atılmaz).
   · Önbellek YOK (Google Maps Platform: içerik saklanamaz; yalnızca place_id saklanabilir).
   · Maliyet: Text Search (Pro) + Place Details (Enterprise + Atmosphere: yorumlar) + fotoğraf medyası — aylık ücretsiz kota sonrası ücretli. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const H = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  /* Anahtar yok: 200 + disabled (tarayıcı konsolunda hata gürültüsü olmasın). */
  if (!key) return NextResponse.json({ disabled: true }, { headers: H });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const e = getEntity(slug);
  if (!e || !e.isReal || !e.location?.geo) return NextResponse.json({ error: "not_found" }, { status: 404, headers: H });

  try {
    let id = e.googlePlaceId;
    if (!id) {
      const s = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: { "content-type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id" },
        body: JSON.stringify({ textQuery: `${e.name} ${e.location.district ?? ""} İstanbul`, languageCode: "tr", maxResultCount: 1, locationBias: { circle: { center: { latitude: e.location.geo.lat, longitude: e.location.geo.lng }, radius: 150 } } }),
        cache: "no-store", signal: AbortSignal.timeout(6000),
      });
      id = (await s.json()).places?.[0]?.id;
      if (!id) return NextResponse.json({ error: "no_match" }, { status: 404, headers: H });
    }
    const d = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=tr`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews,photos" },
      cache: "no-store", signal: AbortSignal.timeout(6000),
    });
    if (!d.ok) return NextResponse.json({ error: "upstream" }, { status: 502, headers: H });
    const p = await d.json();
    const photos = await Promise.all((p.photos ?? []).slice(0, 6).map(async (ph: { name: string; authorAttributions?: Array<{ displayName: string; uri?: string }> }) => {
      const m = await fetch(`https://places.googleapis.com/v1/${ph.name}/media?maxWidthPx=800&skipHttpRedirect=true&key=${key}`, { cache: "no-store", signal: AbortSignal.timeout(6000) });
      const j = m.ok ? await m.json() : null;
      return j?.photoUri ? { src: j.photoUri as string, author: ph.authorAttributions?.[0]?.displayName ?? "Google kullanıcısı", authorUri: ph.authorAttributions?.[0]?.uri } : null;
    }));
    return NextResponse.json({
      rating: p.rating, count: p.userRatingCount, mapsUri: p.googleMapsUri,
      photos: photos.filter(Boolean),
      reviews: (p.reviews ?? []).slice(0, 5).map((r: { authorAttribution?: { displayName?: string; uri?: string; photoUri?: string }; rating?: number; text?: { text?: string }; originalText?: { text?: string }; relativePublishTimeDescription?: string; googleMapsUri?: string }) => ({
        author: r.authorAttribution?.displayName ?? "Google kullanıcısı", authorUri: r.authorAttribution?.uri, authorPhoto: r.authorAttribution?.photoUri,
        rating: r.rating ?? 0, text: r.text?.text ?? r.originalText?.text ?? "", when: r.relativePublishTimeDescription ?? "", uri: r.googleMapsUri,
      })),
    }, { headers: H });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502, headers: H });
  }
}
