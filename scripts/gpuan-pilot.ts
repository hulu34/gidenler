/* PİLOT (kuru çalışma): seçilen mekânlarda gerçek kaynak adaptörü çalışır; hiçbir veritabanına yazılmaz.
   Kimlikler canlı yönetim raporundan YALNIZ OKUNUR (Google'a ücretli istek yok). Çıktı: CIKTI klasöründe Excel + rapor.
   Ortam: KIMLIK_HOST (korumalı canlı dağıtım), VERCEL_BYPASS, SLUGS, BEKLEME_MS, CIKTI */
import { mkdirSync, writeFileSync } from "node:fs";
import { runDaily, type RunnerApi } from "../lib/gpuan/runner";
import { sheetVenues } from "../lib/gpuan/venues";
import { mapsPageSource } from "../lib/gpuan/sources/mapsPage";
import type { GoogleId } from "../lib/gpuan/core";

async function main() {
  const slugs = (process.env.SLUGS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS ?? "" };
  const ids: Record<string, GoogleId[]> = {};
  for (const slug of slugs) {
    const r = await fetch(`https://${process.env.KIMLIK_HOST}/api/admin/db/?rapor=profil&slug=${encodeURIComponent(slug)}`, { headers: H });
    if (!r.ok) throw new Error(`kimlik ${r.status}`);
    ids[slug] = ((await r.json()) as { google?: { identifiers?: GoogleId[] } }).google?.identifiers ?? [];
  }
  const files: Buffer[] = [];
  const api: RunnerApi = {
    lock: async () => true, latest: async () => null, ids: async () => ids,
    upload: async (b) => { files.push(b); return { ok: true, id: `kuru-${files.length}` }; },
    importFile: async () => ({ status: "kuru-calisma" }),
  };
  const { report, workbook } = await runDaily("pilot", sheetVenues(), api, await mapsPageSource(), { max: slugs.length, only: slugs, delayMs: Number(process.env.BEKLEME_MS ?? 5000), log: (s) => console.log(`[pilot] ${s}`) });
  const out = process.env.CIKTI ?? "out/gpuan";
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/pilot.xlsx`, workbook);
  writeFileSync(`${out}/pilot-rapor.json`, JSON.stringify(report, null, 1));
  console.log(`[pilot] denenen ${report.attempted} · puan alınan ${report.fresh + report.same} · hata ${report.failed} · engel ${report.blocked} · şube ${report.branch} · ertelenen ${report.deferred}${report.stoppedEarly ? " · erken durdu" : ""}`);
}
main().catch((e) => { console.error(`[pilot] HATA: ${e instanceof Error ? e.message : e}`); process.exit(1); });
