"use client";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Google ile giriş; dönüşte `returnTo` sayfasına gelinir. Başarısızsa false (çağıran mesaj gösterir). */
export async function signInWithGoogle(returnTo: string): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/api/auth/sign-in/social/`, {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify({ provider: "google", callbackURL: `${location.origin}${BASE}${returnTo}`, errorCallbackURL: `${location.origin}${BASE}/benim/?giris=hata` }),
    });
    const j = await r.json().catch(() => null) as { url?: string } | null;
    if (j?.url) { location.href = j.url; return true; }
    return false;
  } catch { return false; }
}
