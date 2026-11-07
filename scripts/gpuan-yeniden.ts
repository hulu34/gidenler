/* Ağsız yeniden sınıflandırma + Excel: kayıtlı son Excel'i bugünkü kurallarla yeniden değerlendirir; isteğe bağlı kanıt dosyaları ekler.
   Kullanım: npx tsx scripts/gpuan-yeniden.ts <girdi.xlsx> <cikti.xlsx> [--kanit kanit.json] [--olcum olcum.json] [--arama arama.json] [--kararlar kararlar.json]
   Google'a istek yok, veritabanına yazmaz. */
import { readFileSync, writeFileSync } from "node:fs";
import { readWorkbook, writeWorkbook } from "../lib/gpuan/excel";
import { MAIN, reclassify, withDerived, type Decision, type Evidence } from "../lib/gpuan/core";
import { sheetVenues } from "../lib/gpuan/venues";
import { CLOSURES } from "../lib/closure";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const TIER: Record<string, string> = { A: "A · güçlü kanıt", B: "B · orta kanıt", C: "C · zayıf/çelişkili" };
type Cand = { level: string; placeId: string; name: string; address: string; why: string; distanceM?: number | null; nameSim?: number };
async function main() {
  const [inp, out] = process.argv.slice(2);
  const { rows, changes, errors } = await readWorkbook(readFileSync(inp));
  if (errors.length) throw new Error(errors.join("; "));
  const evidence: Record<string, Evidence> = {};
  const kanit = arg("--kanit");
  if (kanit) for (const e of JSON.parse(readFileSync(kanit, "utf8")) as Array<{ slug: string; tier: string; why: string }>) evidence[e.slug] = { level: TIER[e.tier] ?? e.tier, why: e.why };
  const olcum = arg("--olcum");
  if (olcum) for (const o of JSON.parse(readFileSync(olcum, "utf8")) as Array<{ slug: string; result: string; best: Cand | null; tried: Cand[] }>) {
    const c = o.best ?? o.tried?.[0]; if (!c) continue;
    evidence[o.slug] = { level: o.result === "güçlü" ? "Güçlü (yeniden ölçüldü)" : o.result === "orta" ? "Orta (yeniden ölçüldü)" : "Zayıf / uygun değil (yeniden ölçüldü)", why: `konum ${c.distanceM ?? "?"} m · ad ${c.nameSim ?? "?"}${c.why ? ` · ${c.why}` : ""}` };
  }
  const candidates: Record<string, Cand> = {};
  const arama = arg("--arama");
  if (arama) for (const o of JSON.parse(readFileSync(arama, "utf8")) as Array<{ slug: string; result: string; best: Cand | null; tried: Cand[] }>) {
    const c = o.best ?? (o.tried ?? []).find((t) => t.placeId) ?? null;
    candidates[o.slug] = c ? { level: o.best ? o.result : "uygun değil", placeId: c.placeId, name: c.name, address: c.address, why: `konum ${c.distanceM ?? "?"} m · ad ${c.nameSim ?? "?"}${c.why ? ` · ${c.why}` : ""}` } : { level: "bulunamadı", placeId: "", name: "", address: "", why: "Aramada aday çıkmadı" };
  }
  const decisions = new Map<string, Decision>();
  const kf = arg("--kararlar");
  if (kf) for (const d of JSON.parse(readFileSync(kf, "utf8")) as Decision[]) decisions.set(d.slug, d);
  const pk = arg("--paket");
  if (pk) {
    const P = JSON.parse(readFileSync(pk, "utf8")) as { onay: Array<{ slug: string }>; yeni: Array<{ slug: string }> };
    for (const x of P.onay) evidence[x.slug] = { level: `${evidence[x.slug]?.level ?? "Güçlü"} · ONAY PAKETİNDE`, why: evidence[x.slug]?.why ?? "" };
    for (const x of P.yeni) if (candidates[x.slug]) candidates[x.slug].level = "güçlü · ONAY PAKETİNDE";
  }
  const vs = new Map(sheetVenues().map((v) => [v.slug, v]));
  const next = rows.map((r) => reclassify(r, vs.get(r.slug)));
  writeFileSync(out, await writeWorkbook(next, { generatedAt: new Date().toISOString(), note: "Yeniden sınıflandırma (ağsız) + kanıt dosyaları", closures: CLOSURES, evidence, candidates, decisions }, changes));
  const d = withDerived(next, decisions, CLOSURES, evidence).filter((r) => r.record === "Aktif");
  const t: Record<string, number> = {}; for (const r of d) t[r.mainState] = (t[r.mainState] ?? 0) + 1;
  console.log(JSON.stringify({ rows: next.length, main: t, total: Object.values(t).reduce((a, b) => a + b, 0), shown: t[MAIN.shown] ?? 0 }, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
