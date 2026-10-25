import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db/client";
import { user, session, account, verification } from "@/lib/db/schema";

/* ──────────────────────────────────────────────────────────────────────────
   KİMLİK — Better Auth + "Google ile giriş" (Harun'un kararı).
   · Gereken ortam değişkenleri: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL,
     GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET. Biri eksikse kimlik kapalıdır (null) ve site
     bugünkü gibi tarayıcıda çalışan kişisel verilerle devam eder.
   · Şifre ile giriş kapalı; yalnız Google. Oturum çerezi httpOnly + secure.
   · Neon HTTP sürücüsü etkileşimli işlem desteklemediği için transaction:false.
   ────────────────────────────────────────────────────────────────────────── */

type Auth = ReturnType<typeof betterAuth>;

/** Taban adres: BETTER_AUTH_URL (üretim; gidenler.com'a geçince güncellenir) → yoksa Preview dalının sabit adresi. */
export function authBaseURL() {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL) return `https://${process.env.VERCEL_BRANCH_URL}`;
  return undefined;
}

/** Güvenilen kökenler: taban adres + Preview dal adresi + (varsa) BETTER_AUTH_TRUSTED_ORIGINS (virgülle). */
function trustedOrigins() {
  const list = [authBaseURL(), process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",").map((s) => s.trim())];
  return [...new Set(list.filter(Boolean) as string[])];
}
let cached: Auth | null | undefined;

export function authConfigured() {
  return !!(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && authBaseURL());
}

export function getAuth(): Auth | null {
  if (cached !== undefined) return cached;
  const db = getDb();
  if (!db || !authConfigured()) return (cached = null);
  cached = betterAuth({
    baseURL: authBaseURL(),
    trustedOrigins: trustedOrigins(),
    database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification }, transaction: false }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, prompt: "select_account" },
    },
    user: {
      additionalFields: {
        handle: { type: "string", required: false, input: false },
        kind: { type: "string", required: false, defaultValue: "user", input: false },
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
    plugins: [nextCookies()],
  }) as unknown as Auth;
  return cached;
}

/** Sunucu tarafında oturumdaki kullanıcı (yoksa null). */
export async function currentUser(headers: Headers) {
  const a = getAuth();
  if (!a) return null;
  try {
    const s = await a.api.getSession({ headers });
    return s?.user ?? null;
  } catch {
    return null;
  }
}
