/* Preview'a örnek video ekleme (yönetim ucu, target "preview"; Preview kendi Neon dalını kullanır, Production'a yazmaz). */
import { readFileSync } from "node:fs";
const BYPASS = process.env.VERCEL_BYPASS, HOST = process.env.PREVIEW_HOST;
const list = JSON.parse(readFileSync(new URL("./medya.json", import.meta.url), "utf8"));
const admin = `https://${HOST}/api/admin/db/`, auth = { "x-vercel-protection-bypass": BYPASS };
const db = await (await fetch(admin, { headers: auth })).json().catch(() => null);
console.log("ortam:", db?.env, "· yazma kilidi:", JSON.stringify(db?.db?.writeGuard ?? null));
if (db?.env !== "preview" || !db?.db?.writeGuard?.ok) { console.log("Preview veritabanı doğrulanamadı; durduruldu."); process.exit(1); }
let fail = 0;
for (const [slug, urls] of Object.entries(list)) {
  if (slug.startsWith("_")) continue;
  for (const url of urls) {
    const r = await fetch(admin, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ action: "media-add", confirm: "EVET", target: "preview", slug, url }) });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) fail++;
    console.log(slug, j.ok ? `${j.platform} ${j.created ? "eklendi" : "vardı"}` : `HATA ${j.error ?? r.status}`, "· atıf:", (j.videos ?? []).find((v) => v.externalId === j.externalId)?.credit ?? "-");
  }
}
process.exit(fail ? 1 : 0);
