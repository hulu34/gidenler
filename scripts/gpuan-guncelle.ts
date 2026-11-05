/* GÜNLÜK GOOGLE PUAN GÜNCELLEYİCİSİ (GitHub Actions'ta çalışır).
   Ortam: HOST (korumalı dağıtım/dal adresi), VERCEL_BYPASS, HEDEF (production|preview), MAX (varsayılan 500),
          SLUGS (virgüllü; pilot için), BEKLEME_MS (varsayılan 5000), CIKTI (yerel kopya klasörü), KAYNAK (maps-sayfa).
   Herkese açık loga yalnız sayılar yazılır; mekân bazlı ayrıntı CIKTI klasöründeki (şifrelenerek saklanan) dosyadadır. */
import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { runDaily, type RunnerApi } from "../lib/gpuan/runner";
import { sheetVenues } from "../lib/gpuan/venues";
import { mapsPageSource } from "../lib/gpuan/sources/mapsPage";
import type { GoogleId } from "../lib/gpuan/core";

async function main() {
  const HOST = process.env.HOST!, TARGET = process.env.HEDEF ?? "preview";
  const base = `https://${HOST}/api/admin/google-puan/`;
  const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS ?? "", "sec-fetch-site": "same-origin", "content-type": "application/json" };
  const run = `gh-${new Date().toISOString().slice(0, 10)}-${randomBytes(4).toString("hex")}`;
  const post = async (op: string, extra: object = {}) => {
    const r = await fetch(base, { method: "POST", headers: H, body: JSON.stringify({ target: TARGET, confirm: "EVET", op, holder: run, ...extra }) });
    return { status: r.status, j: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  };
  const api: RunnerApi = {
    async lock(op, ttl) { const r = await post(op === "al" ? "kilit-al" : "kilit-birak", { ttl }); return r.status === 200 && r.j.ok === true; },
    async latest() { const r = await fetch(`${base}?dosya=en-yeni`, { headers: H }); if (r.status === 404) return null; if (!r.ok) throw new Error(`Son Excel indirilemedi: ${r.status}`); return Buffer.from(await r.arrayBuffer()); },
    async ids() { const r = await fetch(`${base}?rapor=kimlik`, { headers: H }); if (!r.ok) throw new Error(`Kimlikler alınamadı: ${r.status}`); return ((await r.json()) as { ids: Record<string, GoogleId[]> }).ids; },
    async upload(buf, kind) { const r = await post("dosya-yukle", { kind, data: buf.toString("base64") }); return { ok: r.status === 200, id: r.j.id as string | undefined, errors: (r.j.errors as string[]) ?? [String(r.j.error ?? r.status)] }; },
    async importFile(fileId) { const r = await post("aktar", { fileId }); return { ...(r.j as object), status: String(r.j.status ?? `http_${r.status}`) }; },
  };
  const source = await mapsPageSource();
  const only = (process.env.SLUGS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const { report, workbook } = await runDaily(run, sheetVenues(), api, source, {
    max: Number(process.env.MAX) || 500, only: only.length ? only : undefined, delayMs: Number(process.env.BEKLEME_MS ?? 5000),
    log: (s) => console.log(`[gpuan] ${s}`),
  });
  const out = process.env.CIKTI ?? "out/gpuan";
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/gidenler-mekan-puanlari.xlsx`, workbook);
  writeFileSync(`${out}/rapor.json`, JSON.stringify(report, null, 1));
  const imp = report.import as { status?: string; written?: number; changed?: number; kept?: number; errors?: string[] } | null;
  console.log(`[gpuan] denenen ${report.attempted} · güncel ${report.fresh} · değişmedi ${report.same} · hata ${report.failed} · engel ${report.blocked} · şube ${report.branch} · ertelenen ${report.deferred}`);
  console.log(`[gpuan] aktarım ${imp?.status} · yazılan ${imp?.written ?? 0} · değişen ${imp?.changed ?? 0} · korunan ${imp?.kept ?? 0}${imp?.errors?.length ? ` · ret nedeni sayısı ${imp.errors.length}` : ""}`);
  if (report.stoppedEarly) console.log(`[gpuan] erken durdu: ${report.stoppedEarly}`);
  /* gerçek puan alınamadıysa iş başarılı görünmez */
  if (report.attempted > 0 && report.fresh + report.same === 0) { console.log("[gpuan] HİÇBİR mekândan puan alınamadı"); process.exit(2); }
  if (imp?.status !== "applied") process.exit(3);
}
main().catch((e) => { console.error(`[gpuan] HATA: ${e instanceof Error ? e.message : e}`); process.exit(1); });
