/* Yönetici özeti: bir Google puan Excel'inden Markdown rapor (yalnız okuma).
   Kullanım: npx tsx scripts/gpuan-ozet.ts <dosya.xlsx> [cikti.md] */
import { readFileSync, writeFileSync } from "node:fs";
import { readWorkbook } from "../lib/gpuan/excel";
import { importable, STATUS, summarize } from "../lib/gpuan/core";

async function main() {
  const [file, out] = process.argv.slice(2);
  const { rows, errors } = await readWorkbook(readFileSync(file));
  if (errors.length) throw new Error(errors.join("; "));
  const s = summarize(rows);
  const act = rows.filter((r) => r.record === "Aktif");
  const tried = act.filter((r) => r.attemptAt);
  const rated = act.filter((r) => r.rating != null);
  const withCount = rated.filter((r) => r.reviews != null);
  const by = (st: string) => tried.filter((r) => r.status === st);
  const closed = tried.filter((r) => /kalıcı olarak kapalı/.test(r.error));
  const hist = new Map<string, number>();
  for (const r of rated) { const b = r.rating! >= 4.5 ? "4,5–5,0" : r.rating! >= 4 ? "4,0–4,4" : r.rating! >= 3.5 ? "3,5–3,9" : "3,4 ve altı"; hist.set(b, (hist.get(b) ?? 0) + 1); }
  const t = (xs: typeof rows, f: (r: (typeof rows)[number]) => string) => xs.map((r) => `| ${r.name} | ${r.district} | ${f(r)} |`).join("\n");
  const md = `# Google puan özeti

| | Sayı |
|---|---|
| Aktif mekân | ${s.active} |
| Place ID'si olan | ${s.withPlaceId} |
| Bu dosyada denenen | ${tried.length} |
| Gerçek Google puanı okunan | ${rated.length} |
| Değerlendirme sayısı da okunan | ${withCount.length} |
| Siteye aktarılabilir (onaylı/otomatik + kontrolleri geçen) | ${act.filter((r) => importable(r).ok).length} |
| Kalıcı kapalı | ${closed.length} |
| Şube uyuşmazlığı | ${by(STATUS.branch).length} |
| Tür uyuşmazlığı | ${by(STATUS.typeMismatch).length} |
| Diğer hata | ${by(STATUS.error).length - closed.length} |
| Erişim engeli | ${by(STATUS.blocked).length} |
| Ertelenen | ${by(STATUS.deferred).length} |

**Puan dağılımı:** ${[...hist].sort().reverse().map(([k, v]) => `${k}: ${v}`).join(" · ")}

## Google'da kalıcı kapalı görünen mekânlar
| Mekân | İlçe | Google'daki ad |
|---|---|---|
${t(closed, (r) => r.seenName)}

## Tür uyuşmazlığı (eşleşme yönetimde gözden geçirilmeli)
| Mekân | İlçe | Açıklama |
|---|---|---|
${t(by(STATUS.typeMismatch), (r) => r.error)}

## Şube uyuşmazlığı (puan aktarılmadı)
| Mekân | İlçe | Neden · Google'daki ad |
|---|---|---|
${t(by(STATUS.branch), (r) => `${r.error} · ${r.seenName}`)}

## Diğer hatalar
| Mekân | İlçe | Hata |
|---|---|---|
${t(by(STATUS.error).filter((r) => !closed.includes(r)), (r) => r.error)}
`;
  if (out) writeFileSync(out, md); else console.log(md);
  console.log(JSON.stringify({ tried: tried.length, rated: rated.length, withCount: withCount.length, closed: closed.length, branch: by(STATUS.branch).length, type: by(STATUS.typeMismatch).length, blocked: by(STATUS.blocked).length }));
}
main().catch((e) => { console.error(e); process.exit(1); });
