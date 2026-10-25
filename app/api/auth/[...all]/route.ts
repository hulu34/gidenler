import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

/* /api/auth/* — Better Auth. Yapılandırılmadıysa 503 (site hesapsız çalışmaya devam eder). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const off = () => NextResponse.json({ error: "auth_not_configured" }, { status: 503 });

export async function GET(req: Request) {
  const a = getAuth();
  return a ? toNextJsHandler(a).GET(req) : off();
}
export async function POST(req: Request) {
  const a = getAuth();
  return a ? toNextJsHandler(a).POST(req) : off();
}
