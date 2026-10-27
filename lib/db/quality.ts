import type { Executor } from "./migrate";

/* ──────────────────────────────────────────────────────────────────────────
   VERİ KALİTE RAPORU — veritabanındaki gerçek kayıtlar üzerinden, alan başına "gerçekten var" sayısı.
   Anahtarlar lib/completeness.ts ile aynıdır (google, photo, reviews, menu, video, reservation, hours,
   contact, address). Kişisel veri döndürmez; yalnız sayılar.
   ────────────────────────────────────────────────────────────────────────── */

const Q = `
with r as (select id, address, phone, website, instagram, opening_hours from places where vertical = 'restaurant' and status = 'active')
select
  (select count(*) from places)::int as places_total,
  (select json_object_agg(vertical, n) from (select vertical, count(*)::int n from places group by vertical) v) as by_vertical,
  (select count(*) from r)::int as restaurants,
  (select count(*) from r where address is not null)::int as address,
  (select count(*) from r where opening_hours is not null)::int as hours,
  (select count(*) from r where coalesce(phone, website, instagram) is not null)::int as contact,
  (select count(*) from r where phone is not null)::int as phone,
  (select count(*) from r where website is not null)::int as website,
  (select count(*) from r where instagram is not null)::int as instagram,
  (select count(distinct pi.place_id) from place_identifiers pi join r on r.id = pi.place_id where pi.provider = 'google' and pi.status in ('auto','confirmed'))::int as google,
  (select count(distinct pi.place_id) from place_identifiers pi join r on r.id = pi.place_id where pi.provider = 'google' and pi.status = 'pending')::int as google_pending,
  (select count(distinct mp.place_id) from media_places mp join media_items m on m.id = mp.media_id join r on r.id = mp.place_id where m.type = 'photo' and m.status = 'approved')::int as photo,
  (select count(distinct mp.place_id) from media_places mp join media_items m on m.id = mp.media_id join r on r.id = mp.place_id where m.type in ('video','embed') and m.status = 'approved')::int as video,
  (select count(distinct rv.place_id) from reviews rv join r on r.id = rv.place_id where rv.status = 'published')::int as reviews,
  (select count(distinct mi.place_id) from menu_items mi join r on r.id = mi.place_id)::int as menu,
  (select count(*) from vertical_restaurant vr join r on r.id = vr.place_id where vr.reservation_mode = 'gidenler')::int as reservation,
  (select count(*) from places where id is null or name = '' or lat is null or lng is null or district is null)::int as missing_required`;

type Row = Record<string, number> & { by_vertical: Record<string, number> | null };

export async function qualityReport(x: Executor) {
  const [r] = await x.query<Row>(Q);
  const n = r.restaurants || 0;
  const pct = (v: number) => (n ? Math.round((v / n) * 1000) / 10 : 0);
  const fields = ["photo", "phone", "website", "instagram", "hours", "menu", "video", "google", "reviews", "reservation", "contact", "address"] as const;
  return {
    placesTotal: r.places_total, byVertical: r.by_vertical ?? {}, restaurants: n, missingRequired: r.missing_required,
    googlePending: r.google_pending,
    restaurantFields: Object.fromEntries(fields.map((f) => [f, { count: r[f], pct: pct(r[f]) }])),
  };
}
