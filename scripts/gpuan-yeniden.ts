/* Ağsız yeniden sınıflandırma + 8 sayfalı Excel: kayıtlı son Excel'i bugünkü kurallarla yeniden değerlendirir.
   Kullanım: npx tsx scripts/gpuan-yeniden.ts <girdi.xlsx> <cikti.xlsx> [kanit.json]  (Google'a istek yok, veritabanına yazmaz) */
import { readFileSync, writeFileSync } from "node:fs";
import { readWorkbook, writeWorkbook } from "../lib/gpuan/excel";
import { reclassify, withDerived, FINAL } from "../lib/gpuan/core";
import { sheetVenues } from "../lib/gpuan/venues";
import { CLOSURES } from "../lib/closure";

async function main() {
  const [inp, out, evFile] = process.argv.slice(2);
  const evidence = evFile ? Object.fromEntries((JSON.parse(readFileSync(evFile, "utf8")) as Array<{ slug: string; tier: string; why: string; matcher: string }>).map((e) => [e.slug, e])) : undefined;
  const { rows, changes, errors } = await readWorkbook(readFileSync(inp));
  if (errors.length) throw new Error(errors.join("; "));
  const vs = new Map(sheetVenues().map((v) => [v.slug, v]));
  const next = rows.map((r) => reclassify(r, vs.get(r.slug)));
  writeFileSync(out, await writeWorkbook(next, { generatedAt: new Date().toISOString(), note: "Yeniden sınıflandırma (ağsız): tür/konaklama kontrolü, sınırlı görünüm sayıları boşaltıldı, kapanış denetimi eklendi", closures: CLOSURES, evidence }, changes));
  const d = withDerived(next, new Map()).filter((r) => r.record === "Aktif");
  const t: Record<string, number> = {}; for (const r of d) t[r.finalState] = (t[r.finalState] ?? 0) + 1;
  console.log(JSON.stringify({ rows: next.length, final: t, shownWithCount: d.filter((r) => r.finalState === FINAL.shown && r.reviews != null).length }, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
