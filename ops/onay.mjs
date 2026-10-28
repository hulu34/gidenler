/* GOOGLE EŞLEŞME ONAYI — proje sahibinin sohbette onayladığı kayıtlar (ops/onay-ids.json: slug → kimlik kaydı).
   2026-10-28: A grubu; aynı kapı no + ≤ 50 m + telefon ya da kayıtlı alan adı eşleşmesi + şube/semt uyumu yeniden
   doğrulanan 16 kayıt (MINTIKA ve Ara Gurme kapı no karşılaştırılamadığı için listede yok).
   Yalnız place_identifiers.status: pending → confirmed; kuyruk satırı "approved" olur, silinmez. Google'a çağrı yok. */
import { readFileSync } from "node:fs";
const BYPASS = process.env.VERCEL_BYPASS, HOST = process.env.TOPLU_HOST;
if (!BYPASS || !HOST) { console.error("VERCEL_BYPASS / TOPLU_HOST eksik"); process.exit(2); }
const IDS = JSON.parse(readFileSync(new URL("./onay-ids.json", import.meta.url), "utf8"));
const admin = `https://${HOST}/api/admin/db/`;
const auth = { "x-vercel-protection-bypass": BYPASS };
const before = await (await fetch(`${admin}?rapor=google`, { headers: auth })).json().catch(() => null);
console.log("Önce:", JSON.stringify(before?.stats), "kuyruk", JSON.stringify(before?.queue));
let fail = 0;
for (const [slug, id] of Object.entries(IDS)) {
  const r = await fetch(admin, { method: "POST", headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ action: "google-review", confirm: "EVET", target: "production", id, decision: "confirmed" }) });
  const j = await r.json().catch(() => null);
  if (!j?.ok) fail++;
  console.log(slug, r.status, j?.ok ? "confirmed" : (j?.error ?? "?"));
}
const g = await (await fetch(`${admin}?rapor=google`, { headers: auth })).json().catch(() => null);
console.log("Sonra:", JSON.stringify(g?.stats), "kuyruk", JSON.stringify(g?.queue), "· açık bekleyen:", g?.pending?.length);
process.exit(fail ? 1 : 0);
