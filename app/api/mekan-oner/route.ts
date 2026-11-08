import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { sameOrigin } from "@/lib/community/http";
import { softHit } from "@/lib/usage/rate";
import { hashKey } from "@/lib/ai/privacy";
import { getDb } from "@/lib/db/client";
import { currentUser } from "@/lib/auth";
import { DISTRICTS, suggestVenue } from "@/lib/oneri";
import { isCode } from "@/lib/kampanya";
import { recordCampaign } from "@/lib/kampanya/server";

/* POST /api/mekan-oner — Gidenler'de bulunamayan mekânı bildir. Giriş gerekmez (akış kaybolmasın); IP özetiyle saatte 6,
   aynı köken, bal küpü alanı. Kişisel veri istenmez; girişliyse yalnız kullanıcı kimliği bağlanır.
   Öneri yayımlanmaz ve Google puanı almaz; yönetici kuyruğuna girer. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const H = { "cache-control": "no-store" };
const LINK = /(https?:\/\/|www\.|\.(com|net|org|tr)\b|@[a-z0-9_.]{3,})/i;
/** telefon: boşluk/tire/parantezle bölünmüş olsa da 10+ rakamlık dizi */
const hasPhone = (t: string) => (t.match(/[\d\s().+-]{10,}/g) ?? []).some((x) => x.replace(/\D/g, "").length >= 10);
const contact = (t: string) => LINK.test(t) || hasPhone(t);
const Body = z.object({
  name: z.string().trim().min(2).max(80),
  district: z.string().min(2).max(40),
  locationNote: z.string().trim().max(160).optional().nullable(),
  force: z.boolean().optional(),
  code: z.string().max(24).optional().nullable(),
  website: z.string().max(200).optional(), // bal küpü: insanlar görmez, doluysa bot
}).strict();

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403, headers: H });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid", message: "Mekânın adını ve ilçesini yaz." }, { status: 400, headers: H });
  const b = p.data;
  if (b.website) return NextResponse.json({ ok: true, id: "x", merged: false }, { status: 202, headers: H });
  if (b.district !== "Bilmiyorum" && !DISTRICTS.includes(b.district)) return NextResponse.json({ error: "invalid", message: "İlçeyi listeden seç." }, { status: 400, headers: H });
  if (contact(`${b.name} ${b.locationNote ?? ""}`)) return NextResponse.json({ error: "invalid", message: "Bağlantı, kullanıcı adı ya da telefon numarası yazma; mekânın adı ve semti yeter." }, { status: 400, headers: H });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  if (!(await softHit(`oner:${hashKey(ip)}`, 6, 3600))) return NextResponse.json({ error: "rate", message: "Kısa sürede çok öneri gönderildi; biraz sonra yeniden dene." }, { status: 429, headers: H });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "unavailable", message: "Öneri şu an kaydedilemiyor; biraz sonra yeniden dene." }, { status: 503, headers: H });
  const u = await currentUser(await headers()).catch(() => null);
  const r = await suggestVenue(db, { name: b.name, district: b.district, locationNote: b.locationNote, userId: u?.id ?? null, force: b.force });
  if (!r.ok) return NextResponse.json(r, { status: 409, headers: H });
  if (b.code && isCode(b.code)) await recordCampaign(db, b.code, "oneri", req.headers).catch(() => false);
  return NextResponse.json(r, { status: 201, headers: H });
}
