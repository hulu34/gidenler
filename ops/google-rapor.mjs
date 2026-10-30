/* CANLI · yalnız okuma: Google eşleşme sayıları, kullanım ve puan durumu. Google'a istek atmaz, hiçbir yazım yok. Çıktı şifreli. */
import { mkdirSync, writeFileSync } from "node:fs";
const HOST = process.env.RAPOR_HOST;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const admin = `https://${HOST}/api/admin/db/`;
mkdirSync("out/grapor", { recursive: true });
for (const rapor of ["google", "google-slug", "puan"]) {
  const r = await fetch(`${admin}?rapor=${rapor}`, { headers: H });
  writeFileSync(`out/grapor/${rapor}.json`, await r.text());
  console.log(rapor, r.status);
}
