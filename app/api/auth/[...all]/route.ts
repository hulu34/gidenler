import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

/* /api/auth/* — Better Auth. Yapılandırılmadıysa 503 (site hesapsız çalışmaya devam eder).
   Site trailingSlash:true kullanıyor; Better Auth yolları eğik çizgisiz eşleştiği için sondaki "/" atılır
   (Google dönüşü /api/auth/callback/google → Next 308 → buraya, sorgu parametreleriyle birlikte). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const off = () => NextResponse.json({ error: "auth_not_configured" }, { status: 503 });

async function normalize(req: Request) {
  const u = new URL(req.url);
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) u.pathname = u.pathname.slice(0, -1);
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(u.toString(), { method: req.method, headers: req.headers, body: hasBody ? await req.arrayBuffer() : undefined, redirect: "manual" });
}

export async function GET(req: Request) {
  const a = getAuth();
  return a ? toNextJsHandler(a).GET(await normalize(req)) : off();
}
export async function POST(req: Request) {
  const a = getAuth();
  return a ? toNextJsHandler(a).POST(await normalize(req)) : off();
}
