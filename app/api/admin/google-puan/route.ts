import { after, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getDb } from "@/lib/db/client";
import { previewWriteGuard } from "@/lib/db/fingerprint";
import { DEMO_VISIBLE } from "@/data/demoFlag";
import { acquireLock, addMatch, dailyReport, getFile, googleIds, holdsLock, importFile, importsLog, latestDecisions, listFiles, ratingStats, recordDecision, releaseLock, saveFile } from "@/lib/gpuan/store";
import { sheetVenues } from "@/lib/gpuan/venues";
import { TAG_GPUAN } from "@/lib/gpuan/read";
import { GOOGLE_SCRAPING_ENABLED } from "@/lib/gpuan/policy";

/* ──────────────────────────────────────────────────────────────────────────
   /api/admin/google-puan — Google puan Excel'i: yükleme, indirme, kilit ve Excel → veritabanı aktarımı.
   Erişim: yalnız Vercel Authentication ile korunan dağıtım adresi (VERCEL_URL) ya da dalın kalıcı adresi
   (VERCEL_BRANCH_URL). gidenler.com ve diğer herkese açık alan adlarında 404. Excel herkese açık depoya konmaz.
   · GET ?dosya=son|en-yeni|<id>   → .xlsx indirme (yönetici tarayıcıda Vercel oturumuyla açar)
   · GET ?rapor=durum | kimlik    → yalnız okuma
   · POST { target, confirm:"EVET", op: kilit-al | kilit-birak | dosya-yukle | aktar, holder, … }
   ────────────────────────────────────────────────────────────────────────── */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const H = { "Cache-Control": "no-store" };
const envName = () => process.env.VERCEL_ENV ?? "local";
const nf = () => new NextResponse(null, { status: 404 });
const MAX_BYTES = 3_000_000;

function allowed(req: Request) {
  if (!process.env.VERCEL) return process.env.DB_ADMIN_LOCAL === "1";
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
  const own = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].map((x) => (x ?? "").toLowerCase()).filter((x) => x.endsWith(".vercel.app"));
  return own.includes(host);
}
const dbOrNull = () => (DEMO_VISIBLE ? null : getDb());
const fail = (e: unknown, status = 500) => NextResponse.json({ error: "failed", message: e instanceof Error ? e.message.slice(0, 300) : "error" }, { status, headers: H });

export async function GET(req: Request) {
  if (!allowed(req)) return nf();
  const db = dbOrNull();
  if (!db) return NextResponse.json({ error: "no_database" }, { status: 503, headers: H });
  const u = new URL(req.url);
  try {
    const which = u.searchParams.get("dosya");
    if (which) {
      const f = await getFile(db, which);
      if (!f) return NextResponse.json({ error: "not_found" }, { status: 404, headers: H });
      const day = f.createdAt.toISOString().slice(0, 10);
      return new NextResponse(new Uint8Array(f.buf), { headers: { ...H, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="gidenler-mekan-puanlari-${day}-${f.kind}.xlsx"`, "X-Dosya-Id": f.id, "X-Dosya-Sha256": f.sha256, "X-Robots-Tag": "noindex" } });
    }
    if (u.searchParams.get("rapor") === "kimlik") return NextResponse.json({ env: envName(), ids: await googleIds(db) }, { headers: H });
    if (u.searchParams.get("rapor") === "kararlar") return NextResponse.json({ env: envName(), decisions: [...(await latestDecisions(db)).values()] }, { headers: H });
    if (u.searchParams.get("rapor") === "gunluk") return NextResponse.json({ env: envName(), ...(await dailyReport(db)) }, { headers: H });
    return NextResponse.json({ env: envName(), venues: sheetVenues().length, stats: await ratingStats(db), files: await listFiles(db), imports: await importsLog(db) }, { headers: H });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  if (!allowed(req)) return nf();
  /* Aşama 0: Google puanı yazma yolları kapalı (lib/gpuan/policy.ts). Eski kayıtlar yalnız okunur (hukuki inceleme). */
  if (!GOOGLE_SCRAPING_ENABLED) return NextResponse.json({ error: "google_ratings_disabled" }, { status: 410, headers: H });
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return NextResponse.json({ error: "cross_site" }, { status: 403, headers: H });
  let body: { target?: string; confirm?: string; op?: string; holder?: string; ttl?: number; kind?: string; data?: string; fileId?: string } = {};
  try { body = await req.json(); } catch { /* boş */ }
  if (body.target !== envName()) return NextResponse.json({ error: "target_mismatch", expected: envName() }, { status: 400, headers: H });
  if (body.confirm !== "EVET") return NextResponse.json({ error: "confirm_required" }, { status: 400, headers: H });
  const guard = previewWriteGuard(process.env.DATABASE_URL);
  if (!guard.ok) return NextResponse.json({ error: "write_locked", reason: guard.reason }, { status: 409, headers: H });
  const db = dbOrNull();
  if (!db) return NextResponse.json({ error: "no_database" }, { status: 503, headers: H });
  const holder = String(body.holder ?? "").slice(0, 80);
  if (!/^[a-z0-9-]{6,80}$/.test(holder)) return NextResponse.json({ error: "holder_required" }, { status: 400, headers: H });
  try {
    switch (body.op) {
      case "kilit-al": {
        const r = await acquireLock(db, holder, Number(body.ttl) || 1800);
        return NextResponse.json({ op: body.op, ...r }, { status: r.ok ? 200 : 409, headers: H });
      }
      case "karar": {
        /* yönetici kararı: gerekçe zorunlu, denetim kaydına yazılır; ret puanı hemen gizler */
        const b = body as unknown as { slug?: string; placeId?: string; decision?: string; note?: string; evidence?: unknown };
        const r = await recordDecision(db, { slug: String(b.slug ?? ""), placeId: String(b.placeId ?? ""), decision: b.decision as "onay" | "ret", note: String(b.note ?? ""), evidence: b.evidence, actor: `yonetim:${holder}` });
        if (r.ok) { try { after(() => revalidateTag(TAG_GPUAN)); } catch { /* test */ } }
        return NextResponse.json({ op: body.op, ...r }, { status: r.ok ? 200 : 400, headers: H });
      }
      case "eslesme-ekle": {
        /* arama ile bulunan Google adayı: kimlik "pending" + gerekçeli puan onayı (fotoğraf/ayrıntı açılmaz) */
        const b = body as unknown as { slug?: string; placeId?: string; note?: string; evidence?: unknown; replaceExternalId?: string };
        const r = await addMatch(db, { slug: String(b.slug ?? ""), placeId: String(b.placeId ?? ""), note: String(b.note ?? ""), evidence: b.evidence, replaceExternalId: b.replaceExternalId, actor: `yonetim:${holder}` });
        return NextResponse.json({ op: body.op, ...r }, { status: r.ok ? 200 : 400, headers: H });
      }
      case "kilit-birak":
        await releaseLock(db, holder);
        return NextResponse.json({ op: body.op, ok: true }, { headers: H });
      case "dosya-yukle": {
        if (!(await holdsLock(db, holder))) return NextResponse.json({ error: "lock_not_held" }, { status: 409, headers: H });
        const kind = body.kind === "son" ? "son" : body.kind === "elle" ? "elle" : "taslak";
        const buf = Buffer.from(String(body.data ?? ""), "base64");
        if (!buf.length || buf.length > MAX_BYTES) return NextResponse.json({ error: "bad_size", size: buf.length }, { status: 400, headers: H });
        const r = await saveFile(db, buf, kind, holder);
        return NextResponse.json({ op: body.op, ...r }, { status: r.ok ? 200 : 422, headers: H });
      }
      case "aktar": {
        if (!(await holdsLock(db, holder))) return NextResponse.json({ error: "lock_not_held" }, { status: 409, headers: H });
        const rep = await importFile(db, String(body.fileId ?? ""), sheetVenues(), `gpuan:${holder}`);
        /* veritabanı yazıldıktan SONRA önbellek yenilenir; ret durumunda site verisi ve önbellek değişmez */
        if (rep.status === "applied" && (rep.written || rep.hidden || rep.unhidden)) { try { after(() => revalidateTag(TAG_GPUAN)); } catch { /* test */ } }
        return NextResponse.json({ op: body.op, ...rep }, { status: rep.status === "applied" ? 200 : 422, headers: H });
      }
    }
    return NextResponse.json({ error: "unknown_op" }, { status: 400, headers: H });
  } catch (e) { return fail(e); }
}
