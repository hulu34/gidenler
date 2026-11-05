/* PREVIEW · Google puan sistemi: geçiş (yalnız Preview veritabanı) + kimlik durumu. Çıktı sayı; ayrıntı şifreli. */
import { mkdirSync, writeFileSync } from "node:fs";
const HOST = process.env.PREVIEW_HOST, PROD = process.env.PROD_DEPLOY;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "sec-fetch-site": "same-origin", "content-type": "application/json" };
mkdirSync("out/gpv", { recursive: true });
const m = await fetch(`https://${HOST}/api/admin/db/`, { method: "POST", headers: H, body: JSON.stringify({ target: "preview", confirm: "EVET", action: "migrate" }) });
const mj = await m.json().catch(() => ({}));
console.log("migrate", m.status, "uygulanan", (mj.applied ?? []).length, "bekleyen", (mj.status?.pending ?? []).length);
const k = await fetch(`https://${HOST}/api/admin/google-puan/?rapor=kimlik`, { headers: H });
const kj = await k.json().catch(() => ({}));
const ids = kj.ids ?? {};
const slugs = (process.env.SLUGS ?? "").split(",").filter(Boolean);
let same = 0, usable = 0;
for (const s of slugs) {
  const p = await fetch(`https://${PROD}/api/admin/db/?rapor=profil&slug=${s}`, { headers: H }).then((r) => r.json()).catch(() => null);
  const prodIds = (p?.google?.identifiers ?? []).filter((g) => ["auto", "confirmed"].includes(g.status)).map((g) => g.externalId);
  const pv = (ids[s] ?? []).filter((g) => ["auto", "confirmed"].includes(g.status)).map((g) => g.externalId);
  if (pv.length) usable++;
  if (pv.length && pv.every((x) => prodIds.includes(x))) same++;
}
console.log("kimlik", k.status, "preview_google_mekan", Object.keys(ids).length, "pilot_preview_kullanilabilir", usable, "pilot_canli_ile_ayni", same, "/", slugs.length);
const d = await fetch(`https://${HOST}/api/admin/google-puan/`, { headers: H });
writeFileSync("out/gpv/durum.json", await d.text());
console.log("durum", d.status);
