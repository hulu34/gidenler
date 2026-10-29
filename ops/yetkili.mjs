/* Test erişim başlıkları (Vercel korumasını aşma) YALNIZ yetkili test alan adına eklenir; YouTube, Google görselleri
   ve diğer üçüncü taraf isteklerine taşınmaz. Bağlamın kendi extraHTTPHeaders'ı kullanılmaz. */
export async function yetkiliBaslik(ctx, host, headers) {
  if (!headers || !Object.values(headers).some(Boolean)) return;
  await ctx.route((u) => u.hostname === host, (r) => r.continue({ headers: { ...r.request().headers(), ...headers } }));
}
/* sayfa dışına giden isteklerde test başlığı var mı (olmamalı) */
export function baslikSizintisi(ctx, host) {
  const leak = new Set();
  ctx.on("request", (r) => { const u = new URL(r.url()); if (u.hostname !== host && Object.keys(r.headers()).some((k) => k.startsWith("x-vercel-protection-bypass") || k === "x-vercel-set-bypass-cookie")) leak.add(u.hostname); });
  return leak;
}
