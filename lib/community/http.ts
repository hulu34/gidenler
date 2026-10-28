/** Yazma istekleri yalnız sitenin kendi sayfalarından (Origin = istek yapılan alan adı). Tarayıcı dışı ve
    başka siteden gelen istekler reddedilir; oturum çerezi tek başına yetmez. */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
