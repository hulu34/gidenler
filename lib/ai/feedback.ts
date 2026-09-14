import type { FeedbackEvent } from "./schema";

/* ──────────────────────────────────────────────────────────────────────────
   GERİ BİLDİRİM + DEĞERLENDİRME SİNYALLERİ — anonim.
   Kaydedilen: requestId (rastgele), olay türü, entityId, mod, zaman. Kullanıcı kimliği, IP, sorgu metni YOK.
   Bu kayıtlar değerlendirme hattını (eval) besler: tıklama / kaydetme / başka seçme / yararlı-değil / yanlış bilgi.
   Yazma yalnızca bu deftere yapılır: üretim veritabanı, puanlar, kullanıcı verisi DEĞİŞMEZ.
   ────────────────────────────────────────────────────────────────────────── */

export interface FeedbackRecord extends FeedbackEvent { ts: number }

/** Sorgu meta kaydı (eval için sınıflandırma; metin yok). */
export interface QueryRecord {
  ts: number; requestId: string; mode: "llm" | "deterministic" | "cached"; fallbackReason?: string;
  latencyMs: number; results: number; overallConfidence: "low" | "medium" | "high";
  /** Sorgu sınıfı: kategori + niteleyici anahtarları (ör. "kahve|quiet") — metin değil. */
  queryClass: string; injectionHits: number; toolCalls: number;
}

export interface FeedbackStore {
  addFeedback(r: FeedbackRecord): Promise<void>;
  addQuery(r: QueryRecord): Promise<void>;
  feedback(): Promise<FeedbackRecord[]>;
  queries(): Promise<QueryRecord[]>;
  reset(): Promise<void>;
}

class MemoryFeedback implements FeedbackStore {
  private f: FeedbackRecord[] = []; private q: QueryRecord[] = [];
  async addFeedback(r: FeedbackRecord) { this.f.push(r); if (this.f.length > 20000) this.f.splice(0, 5000); }
  async addQuery(r: QueryRecord) { this.q.push(r); if (this.q.length > 20000) this.q.splice(0, 5000); }
  async feedback() { return this.f; }
  async queries() { return this.q; }
  async reset() { this.f = []; this.q = []; }
}

let store: FeedbackStore | null = null;
export const feedbackStore = () => (store ??= new MemoryFeedback());
export function setFeedbackStore(s: FeedbackStore) { store = s; }

/* ───── admin gözlemlenebilirlik veri modeli ───── */
export interface AIObservability {
  totalQueries: number;
  successRate: number;          // sonuç dönen / toplam
  fallbackRate: number;         // deterministic / toplam
  cacheHitRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  modeDistribution: Record<string, number>;
  fallbackReasons: Record<string, number>;
  topQueryClasses: Array<{ queryClass: string; count: number }>;
  noResultQueries: number;
  lowConfidenceQueries: number;
  injectionAttempts: number;
  feedback: Record<string, number>;
  negativeFeedbackRate: number; // (unhelpful+wrong_info) / (helpful+unhelpful+wrong_info)
}

export async function observability(): Promise<AIObservability> {
  const s = feedbackStore(); const qs = await s.queries(); const fs = await s.feedback();
  const n = qs.length || 1;
  const lat = qs.map((q) => q.latencyMs).sort((a, b) => a - b);
  const count = <T,>(arr: T[], key: (x: T) => string) => { const m: Record<string, number> = {}; for (const x of arr) { const k = key(x); m[k] = (m[k] ?? 0) + 1; } return m; };
  const modes = count(qs, (q) => q.mode); const reasons = count(qs.filter((q) => q.fallbackReason), (q) => q.fallbackReason!);
  const classes = count(qs, (q) => q.queryClass); const fb = count(fs, (f) => f.event);
  const neg = (fb.unhelpful ?? 0) + (fb.wrong_info ?? 0); const rated = neg + (fb.helpful ?? 0);
  return {
    totalQueries: qs.length,
    successRate: qs.filter((q) => q.results > 0).length / n,
    fallbackRate: (modes.deterministic ?? 0) / n,
    cacheHitRate: (modes.cached ?? 0) / n,
    avgLatencyMs: Math.round(lat.reduce((a, b) => a + b, 0) / n),
    p95LatencyMs: lat.length ? lat[Math.min(lat.length - 1, Math.floor(lat.length * 0.95))] : 0,
    modeDistribution: modes, fallbackReasons: reasons,
    topQueryClasses: Object.entries(classes).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([queryClass, c]) => ({ queryClass, count: c })),
    noResultQueries: qs.filter((q) => q.results === 0).length,
    lowConfidenceQueries: qs.filter((q) => q.overallConfidence === "low").length,
    injectionAttempts: qs.filter((q) => q.injectionHits > 0).length,
    feedback: fb, negativeFeedbackRate: rated ? neg / rated : 0,
  };
}
