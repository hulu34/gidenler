import { createHash } from "node:crypto";

/* Veritabanı parmak izi — bağlantı adresinin YALNIZ sunucu adının SHA-256 karmasının ilk 16 hanesi.
   Parola ya da adres ifşa etmez; Preview'ın üretim veritabanına bağlanıp bağlanmadığını anlamaya yarar. */
export function dbFingerprint(url?: string | null) {
  if (!url) return null;
  try { return createHash("sha256").update(new URL(url).hostname.toLowerCase()).digest("hex").slice(0, 16); }
  catch { return null; }
}

/* Neon aynı veritabanına iki adres verir: havuzlu (ep-x-pooler…) ve doğrudan (ep-x…). İz hangisinden alınmış olursa olsun aynı sayılır. */
function hostVariants(url?: string | null) {
  try { const h = new URL(url!).hostname.toLowerCase(), base = h.replace("-pooler.", "."), [first, ...rest] = base.split("."); return [h, base, [`${first}-pooler`, ...rest].join(".")]; }
  catch { return []; }
}

/** Yazma kilidi: Preview yalnız üretimden FARKLI bir veritabanına yazabilir; üretim parmak izi bilinmiyorsa yazamaz. */
export function previewWriteGuard(url?: string | null): { ok: true } | { ok: false; reason: string } {
  if (process.env.VERCEL_ENV !== "preview") return { ok: true };
  const prod = process.env.PRODUCTION_DB_FINGERPRINT;
  if (!prod) return { ok: false, reason: "PRODUCTION_DB_FINGERPRINT tanımlı değil — Preview yazması kilitli." };
  if (!dbFingerprint(url) || hostVariants(url).some((h) => dbFingerprint(`postgres://${h}`) === prod)) return { ok: false, reason: "Preview üretim veritabanına bağlı görünüyor — yazma reddedildi." };
  return { ok: true };
}
