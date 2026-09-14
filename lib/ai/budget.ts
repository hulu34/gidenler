import { aiConfig } from "./config";
import type { CallRecord } from "./types";

/* ──────────────────────────────────────────────────────────────────────────
   BÜTÇE DEFTERİ + TELEMETRİ — her model çağrısı kaydedilir (provider, model, token, maliyet, gecikme, sonuç).
   Kişisel veri, sorgu metni ya da yanıt metni ASLA kaydedilmez.
   Depo: bellek (varsayılan) + isteğe bağlı JSON dosyası (AI_LEDGER_FILE). Vercel'de FS geçicidir;
   çok örnekli üretim için `LedgerStore` arayüzünü KV/Upstash ile uygulayın — geri kalan kod değişmez.
   ────────────────────────────────────────────────────────────────────────── */

export type BudgetLevel = "normal" | "warning" | "degraded" | "critical";

export interface LedgerStore {
  append(rec: CallRecord): Promise<void>;
  /** Bu ayın kayıtları (UTC ay). */
  month(): Promise<CallRecord[]>;
  /** Testler için. */
  reset(): Promise<void>;
}

const monthKey = (ts: number) => new Date(ts).toISOString().slice(0, 7);

class MemoryStore implements LedgerStore {
  private recs: CallRecord[] = [];
  async append(rec: CallRecord) { this.recs.push(rec); if (this.recs.length > 20000) this.recs.splice(0, this.recs.length - 20000); }
  async month() { const k = monthKey(Date.now()); return this.recs.filter((r) => monthKey(r.ts) === k); }
  async reset() { this.recs = []; }
}

class FileStore extends MemoryStore {
  constructor(private file: string) { super(); this.load(); }
  private async load() {
    try { const fs = await import("node:fs/promises"); const raw = await fs.readFile(this.file, "utf8"); for (const line of raw.split("\n")) if (line.trim()) await super.append(JSON.parse(line) as CallRecord); } catch { /* yok: yeni dosya */ }
  }
  async append(rec: CallRecord) {
    await super.append(rec);
    try { const fs = await import("node:fs/promises"); await fs.appendFile(this.file, JSON.stringify(rec) + "\n", "utf8"); } catch { /* salt okunur FS: bellekte devam */ }
  }
}

let store: LedgerStore | null = null;
export function ledger(): LedgerStore {
  if (store) return store;
  const f = aiConfig().ledgerFile;
  store = f ? new FileStore(f) : new MemoryStore();
  return store;
}
/** Testlerde farklı depo takmak için. */
export function setLedger(s: LedgerStore) { store = s; }

export interface BudgetStatus {
  level: BudgetLevel;
  spentUsd: number;
  budgetUsd: number;
  ratio: number;
  calls: number;
  failures: number;
}

export async function budgetStatus(): Promise<BudgetStatus> {
  const cfg = aiConfig();
  const recs = await ledger().month();
  const spent = recs.reduce((a, r) => a + r.costUsd, 0);
  const ratio = cfg.budgetUsd > 0 ? spent / cfg.budgetUsd : 0;
  const level: BudgetLevel = ratio >= cfg.hardRatio ? "critical" : ratio >= cfg.degradeRatio ? "degraded" : ratio >= cfg.warnRatio ? "warning" : "normal";
  return { level, spentUsd: round4(spent), budgetUsd: cfg.budgetUsd, ratio: round4(ratio), calls: recs.length, failures: recs.filter((r) => !r.ok).length };
}

export const record = (rec: CallRecord) => ledger().append(rec);
const round4 = (n: number) => Math.round(n * 10000) / 10000;

/* ───── admin analitiği (kişisel veri yok) ───── */
export interface AIAnalytics {
  budget: BudgetStatus;
  byProviderModel: Array<{ provider: string; model: string; calls: number; costUsd: number; avgLatencyMs: number; failures: number }>;
  byKind: Array<{ kind: string; calls: number; costUsd: number }>;
  projectedMonthUsd: number;
}
export async function analytics(): Promise<AIAnalytics> {
  const recs = await ledger().month();
  const b = await budgetStatus();
  const pm = new Map<string, { calls: number; cost: number; lat: number; fail: number }>();
  const bk = new Map<string, { calls: number; cost: number }>();
  for (const r of recs) {
    const k = `${r.provider}|${r.model}`; const v = pm.get(k) ?? { calls: 0, cost: 0, lat: 0, fail: 0 };
    v.calls++; v.cost += r.costUsd; v.lat += r.latencyMs; if (!r.ok) v.fail++; pm.set(k, v);
    const kk = bk.get(r.kind) ?? { calls: 0, cost: 0 }; kk.calls++; kk.cost += r.costUsd; bk.set(r.kind, kk);
  }
  const day = new Date().getUTCDate(); const daysInMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0)).getUTCDate();
  return {
    budget: b,
    byProviderModel: [...pm].map(([k, v]) => { const [provider, model] = k.split("|"); return { provider, model, calls: v.calls, costUsd: round4(v.cost), avgLatencyMs: Math.round(v.lat / Math.max(1, v.calls)), failures: v.fail }; }),
    byKind: [...bk].map(([kind, v]) => ({ kind, calls: v.calls, costUsd: round4(v.cost) })),
    projectedMonthUsd: round4(day > 0 ? (b.spentUsd / day) * daysInMonth : 0),
  };
}
