import { NextResponse, type NextRequest } from "next/server";
import demo from "@/data/demoPaths.json";

/* ESKİ DEMO ADRESLERİ — demo kapalıyken (varsayılan) prototip dönemine ait mekân, liste ve kişi adresleri
   kalıcı olarak açıklama sayfasına yönlendirilir: kullanıcı boş 404 görmez, arama motoru bu adresleri
   dizinden düşürür (hedef sayfa noindex). Yatırımcı demosunda (NEXT_PUBLIC_SHOW_DEMO=true) dokunulmaz. */
const DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO === "true";
const ENT = new Set(demo.entities), LIST = new Set(demo.lists), USER = new Set(demo.users);

function kindOf(path: string): string | null {
  const p = decodeURIComponent(path).split("/").filter(Boolean);
  if (p.length < 2 && !(p.length === 1 && p[0].startsWith("@"))) return null;
  if (["mekan", "yaz", "isletme"].includes(p[0]) && ENT.has(p[1])) return "mekan";
  if (p[0] === "liste" && LIST.has(p[1])) return "liste";
  if (p[0] === "pasaport" && USER.has(p[1].replace(/^@/, ""))) return "kisi";
  if (p.length === 1 && USER.has(p[0].slice(1))) return "kisi";
  return null;
}

export function middleware(req: NextRequest) {
  if (DEMO) return NextResponse.next();
  const kind = kindOf(req.nextUrl.pathname);
  if (!kind) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/demo-kayit/";
  url.search = `?tur=${kind}`;
  return NextResponse.redirect(url, 301);
}

export const config = { matcher: ["/mekan/:path*", "/yaz/:path*", "/isletme/:path*", "/liste/:path*", "/pasaport/:path*", "/@:path*", "/%40:path*"] };
