import { NextResponse } from "next/server";
import { z } from "zod";
import { getEntity } from "@/data/entities";
import { feeFor, isPartner, mealOf, reservationCode, slotOpen, slotsOf } from "@/lib/reservation";
import { rateStore } from "@/lib/ai/ratelimit";
import { hashKey } from "@/lib/ai/privacy";

/* POST /api/rezervasyon — Gidenler üzerinden rezervasyon TALEBİ (yalnızca sunucu modunda; statik önizlemede yok).
   · Kişisel veri (ad, telefon) yalnızca işletmeye iletilmek için alınır; sunucu günlüğüne YAZILMAZ.
   · İletim: RESERVATION_WEBHOOK_URL tanımlıysa oraya (işletme paneli / e-posta / tablo otomasyonu); yoksa talep reddedilmez,
     "işletmeye iletilecek" durumunda kalır — iletim kanalı kurulana kadar yalnızca kayıt kodu üretilir.
   · Ücret işletmeye aittir; yanıt kullanıcıya ücret göstermez. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Req = z.object({
  entitySlug: z.string().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  party: z.number().int().min(1).max(20),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{10,20}$/),
  note: z.string().trim().max(300).optional(),
  consent: z.literal(true),
}).strict();

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const p = Req.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid_request", fields: p.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  const r = p.data;

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  const hour = Math.floor(Date.now() / 3_600_000);
  if ((await rateStore().incr(`${hashKey("rz:" + ip)}:h${hour}`, 3700)) > 10) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "3600" } });
  }

  const e = getEntity(r.entitySlug);
  if (!e) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isPartner(e)) return NextResponse.json({ error: "not_partner" }, { status: 409 });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(r.date + "T00:00:00");
  const days = (d.getTime() - today.getTime()) / 86_400_000;
  if (!(days >= 0 && days <= 30)) return NextResponse.json({ error: "date_out_of_range" }, { status: 400 });
  const s = slotsOf(e);
  if (![...s.lunch, ...s.dinner].includes(r.time) || !slotOpen(e, r.date, r.time)) return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  if (r.party > (e.reservation?.maxParty ?? 8)) return NextResponse.json({ error: "party_too_large" }, { status: 400 });

  const code = reservationCode();
  const record = {
    code, venue: { slug: e.slug, name: e.name, demo: !!e.isDemo }, date: r.date, time: r.time, party: r.party,
    meal: mealOf(r.time), fee: feeFor(r.time, r.party), guest: { name: r.name, phone: r.phone, note: r.note ?? "" },
    createdAt: new Date().toISOString(),
  };

  let forwarded = false;
  const hook = process.env.RESERVATION_WEBHOOK_URL;
  if (hook && !e.isDemo) {
    try {
      const res = await fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(record), signal: AbortSignal.timeout(8000) });
      forwarded = res.ok;
    } catch { forwarded = false; }
  }
  /* Günlükte kişisel veri yok: yalnızca kod, mekân, kişi sayısı. */
  console.info(JSON.stringify({ evt: "reservation_request", code, venue: e.slug, party: r.party, meal: record.meal, forwarded, demo: !!e.isDemo }));

  return NextResponse.json(
    { code, status: e.isDemo ? "önizleme" : "talep", forwarded },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
