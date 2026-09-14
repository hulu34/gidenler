import { NextResponse, after } from "next/server";
import { AIInputError, ask, status } from "@/lib/ai/orchestrator";
import { AskRequestSchema } from "@/lib/ai/schema";

/* ──────────────────────────────────────────────────────────────────────────
   GİDENLER AI API — POST /api/ai (sor) · GET /api/ai (durum)
   · Yalnızca sunucu modunda derlenir (`.api.ts` uzantısı; bkz. next.config.ts). Statik export'ta bu dosya yoktur;
     istemci /api/ai bulamazsa yerel deterministik motora düşer.
   · API anahtarları yalnızca process.env'de; bu dosyadan istemciye yalnızca AIResponse sözleşmesi gider.
   · Model çağrıları orchestrator içinde; burada yalnızca HTTP kabuğu ve hata → HTTP kodu eşlemesi.
   ────────────────────────────────────────────────────────────────────────── */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function clientIp(req: Request): string | null {
  const h = req.headers;
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json", message: "Geçersiz istek gövdesi." }, { status: 400, headers: NO_STORE }); }
  const parsed = AskRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", message: "İstek şemaya uymuyor.", issues: parsed.error.issues.slice(0, 5).map((i) => i.path.join(".")) }, { status: 400, headers: NO_STORE });
  try {
    const res = await ask(parsed.data, { ip: clientIp(req), sessionId: parsed.data.sessionId ?? null, defer: (fn) => after(fn) });
    return NextResponse.json(res, { status: 200, headers: NO_STORE });
  } catch (e) {
    if (e instanceof AIInputError) {
      const headers: Record<string, string> = { ...NO_STORE };
      if (e.status === 429) headers["Retry-After"] = "60";
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status, headers });
    }
    /* Beklenmeyen hata: ayrıntı sızdırma. */
    return NextResponse.json({ error: "internal", message: "Gidenler AI şu an yanıt veremiyor." }, { status: 500, headers: NO_STORE });
  }
}

export async function GET() {
  const s = await status();
  return NextResponse.json(s, { status: 200, headers: NO_STORE });
}
