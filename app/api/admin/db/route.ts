import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { executorFor } from "@/lib/db/executors";
import { applyMigrations, migrationStatus } from "@/lib/db/migrate";
import { seedRealVenues, verifyRealVenues } from "@/lib/db/seed";
import { realVenueRecords } from "@/data/real";

/* ──────────────────────────────────────────────────────────────────────────
   /api/admin/db — KONTROLLÜ GEÇİŞ VE TOHUM (derlemede otomatik çalışmaz).
   Koruma katmanları:
   1. Yalnız Vercel PREVIEW dağıtımında var (VERCEL_ENV=preview); üretimde ve statik sitede 404.
   2. Preview adresleri Vercel Authentication ile korunur: yalnız proje sahibi oturumuyla açılır.
   3. Yazma işlemleri yalnız aynı kökenden POST + { confirm: "EVET" } ile.
   4. Geçişler danışma kilidi + işlem içinde; tohum tekrar çalıştırılabilir.
   Not: Preview ve Production aynı Neon veritabanını kullanır; buradaki işlem üretim verisini değiştirir.
   ────────────────────────────────────────────────────────────────────────── */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const H = { "Cache-Control": "no-store" };
/* Vercel'de yalnız Preview; Vercel dışında (yerel test) yalnız DB_ADMIN_LOCAL=1 ile. */
const enabled = () => process.env.VERCEL ? process.env.VERCEL_ENV === "preview" : process.env.DB_ADMIN_LOCAL === "1";
const nf = () => new NextResponse(null, { status: 404 });

function exec() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  return url ? executorFor(url) : null;
}

export async function GET() {
  if (!enabled()) return nf();
  const x = exec(), db = getDb();
  if (!x || !db) return NextResponse.json({ error: "no_database" }, { status: 503, headers: H });
  try {
    const migrations = await migrationStatus(x);
    const integrity = migrations.pending.length ? null : await verifyRealVenues(db, realVenueRecords).catch(() => null);
    return NextResponse.json({ env: process.env.VERCEL_ENV ?? "local", migrations, integrity }, { headers: H });
  } catch (e) {
    return NextResponse.json({ error: "failed", message: e instanceof Error ? e.message.slice(0, 300) : "error" }, { status: 500, headers: H });
  }
}

export async function POST(req: Request) {
  if (!enabled()) return nf();
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return NextResponse.json({ error: "cross_site" }, { status: 403, headers: H });
  let body: { action?: string; confirm?: string } = {};
  try { body = await req.json(); } catch { /* boş */ }
  if (body.confirm !== "EVET") return NextResponse.json({ error: "confirm_required" }, { status: 400, headers: H });
  const x = exec(), db = getDb();
  if (!x || !db) return NextResponse.json({ error: "no_database" }, { status: 503, headers: H });
  try {
    if (body.action === "migrate") {
      const r = await applyMigrations(x);
      return NextResponse.json({ action: "migrate", ...r }, { headers: H });
    }
    if (body.action === "seed") {
      const st = await migrationStatus(x);
      if (st.pending.length) return NextResponse.json({ error: "pending_migrations", pending: st.pending }, { status: 409, headers: H });
      const r = await seedRealVenues(db, realVenueRecords);
      const integrity = await verifyRealVenues(db, realVenueRecords);
      return NextResponse.json({ action: "seed", ...r, integrity }, { headers: H });
    }
    return NextResponse.json({ error: "unknown_action" }, { status: 400, headers: H });
  } catch (e) {
    return NextResponse.json({ error: "failed", message: e instanceof Error ? e.message.slice(0, 300) : "error" }, { status: 500, headers: H });
  }
}
