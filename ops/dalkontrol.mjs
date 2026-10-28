/* Neon dal kullanım kontrolü (yalnız okuma): her hazır dağıtımın yönetim raporundaki veritabanı parmak izi
   (db.fingerprint) toplanır ve ŞİFRELİ dosyaya yazılır; karşılaştırma depo dışında yapılır. Logda yalnız sayı. */
import { mkdirSync, writeFileSync } from "node:fs";
const BYPASS = process.env.VERCEL_BYPASS;
const deps = (process.env.DEPLOYS ?? "").split(",").filter(Boolean);
const out = [];
for (const host of deps) {
  let fp = null, status = 0;
  try { const r = await fetch(`https://${host}/api/admin/db/`, { headers: { "x-vercel-protection-bypass": BYPASS } }); status = r.status; const j = await r.json().catch(() => null); fp = j?.db?.fingerprint ?? null; } catch { status = -1; }
  out.push({ host, status, fp });
}
mkdirSync("out", { recursive: true });
writeFileSync("out/dal.json", JSON.stringify(out, null, 1));
console.log("dağıtım:", out.length, "· parmak izi okunan:", out.filter((x) => x.fp).length);
