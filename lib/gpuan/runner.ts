import { applyResult, attemptedOn, dueRows, reconcile, STATUS, summarize, trDay, type GoogleId, type RatingSource, type Row, type Venue } from "./core";
import { readWorkbook, writeWorkbook, type Change } from "./excel";

/* ──────────────────────────────────────────────────────────────────────────
   GÜNLÜK GÜNCELLEYİCİ — işlem sırası (kaynaktan bağımsız):
   1 güncel mekân listesi · 2 Excel'deki kayıtlarla karşılaştırma · 3 yeni mekâna satır · 4 silinen/değişeni işaretleme
   5 Google verisini güncelleme · 6 değişen puanları kaydetme · 7 tarih işleme · 8 başarısız kayıt listesi
   9 Excel sağlamlık doğrulaması · 10 son sürümü güvenli depoya kaydetme · ardından Excel → veritabanı aktarımı.
   · Tek çalışma: sunucu kilidi alınamazsa hiç başlamaz; kilit her ara kayıtta uzatılır, kaybedilirse durur.
   · Kesinti: her CHECKPOINT satırda Excel "taslak" olarak kaydedilir; yeniden başlayınca bugün denenmiş satırlar atlanır.
   · Engel: CAPTCHA / olağandışı trafik / giriş isteği aşılmaya çalışılmaz; satır "Engellendi" olur, sonraki satıra geçilir.
     Arka arkaya BLOCK_STOP engelde çalışma nazikçe durur ve kalan satırlar "Ertelendi" olarak işaretlenir.
   ────────────────────────────────────────────────────────────────────────── */
export interface RunnerApi {
  lock(op: "al" | "birak", ttlSec?: number): Promise<boolean>;
  latest(): Promise<Buffer | null>;
  ids(): Promise<Record<string, GoogleId[]>>;
  upload(buf: Buffer, kind: "taslak" | "son"): Promise<{ ok: boolean; id?: string; errors?: string[] }>;
  importFile(fileId: string): Promise<Record<string, unknown> & { status: string }>;
}
export interface RunOptions { max: number; /** bugün denenmiş satırları da yeniden dene (elle tetikleme) */ force?: boolean; only?: string[]; checkpoint?: number; blockStop?: number; delayMs?: number; now?: () => Date; log?: (s: string) => void; sleep?: (ms: number) => Promise<void> }
export interface RunReport {
  run: string; startedAt: string; finishedAt: string; venues: number; rows: number; added: number; removed: number; changed: number;
  attempted: number; fresh: number; same: number; failed: number; blocked: number; branch: number; deferred: number; stoppedEarly: string | null;
  fileId: string | null; import: Record<string, unknown> | null; failures: Array<{ slug: string; status: string; error: string }>; summary: ReturnType<typeof summarize>;
}

export async function runDaily(run: string, venues: Venue[], api: RunnerApi, source: RatingSource, o: RunOptions): Promise<{ report: RunReport; workbook: Buffer }> {
  const now = o.now ?? (() => new Date());
  const log = o.log ?? (() => {});
  const sleep = o.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const startedAt = now().toISOString();
  if (!(await api.lock("al", 1800))) throw new Error("Başka bir güncelleme çalışıyor (kilit alınamadı)");
  try {
    const prevBuf = await api.latest();
    const prev = prevBuf ? await readWorkbook(prevBuf) : null;
    if (prev?.errors.length) throw new Error(`Son Excel okunamadı: ${prev.errors.join("; ")}`);
    const ids = new Map(Object.entries(await api.ids()));
    const rec = reconcile(prev?.rows ?? [], venues, ids);
    let rows = rec.rows;
    const changes: Change[] = [...(prev?.changes ?? [])];
    const byslug = new Map(venues.map((v) => [v.slug, v]));
    const today = trDay(now());
    let due = dueRows(rows, today, o.max, o.force);
    if (o.only?.length) { const s = new Set(o.only); due = rows.filter((r) => s.has(r.slug) && r.placeId && r.record === "Aktif" && !attemptedOn(r, today)).slice(0, o.max); }
    log(`liste ${venues.length} · satır ${rows.length} · yeni ${rec.added.length} · kaldırılan ${rec.removed.length} · değişen ${rec.changed.length} · bugün denenecek ${due.length}`);

    const idx = new Map(rows.map((r, i) => [r.slug, i]));
    let attempted = 0, consecutiveBlocks = 0, stoppedEarly: string | null = null;
    const checkpoint = o.checkpoint ?? 20;
    for (let k = 0; k < due.length; k++) {
      const row = rows[idx.get(due[k].slug)!];
      const at = now().toISOString();
      let res;
      try { res = await source.fetch({ placeId: row.placeId, name: row.name, mapsUrl: row.mapsUrl }); }
      catch (e) { res = { kind: "error" as const, reason: `Kaynak hatası: ${e instanceof Error ? e.message.slice(0, 120) : "bilinmiyor"}` }; }
      const next = applyResult(row, byslug.get(row.slug), res, at, source);
      if (next.status === STATUS.fresh && next.rating != null) changes.push({ at, slug: next.slug, name: next.name, from: row.rating, to: next.rating, fromN: row.reviews, toN: next.reviews });
      rows[idx.get(row.slug)!] = next; attempted++;
      consecutiveBlocks = res.kind === "blocked" ? consecutiveBlocks + 1 : 0;
      if (consecutiveBlocks >= (o.blockStop ?? 3)) {
        stoppedEarly = `Arka arkaya ${consecutiveBlocks} erişim engeli; güvenlik önlemi aşılmadan çalışma durduruldu`;
        for (const d of due.slice(k + 1)) { const i = idx.get(d.slug)!; rows[i] = { ...rows[i], status: STATUS.deferred, error: "Çalışma erişim engeli nedeniyle durduruldu; sonraki çalışmada denenecek" }; }
        break;
      }
      if (attempted % checkpoint === 0) {
        if (!(await api.lock("al", 1800))) { stoppedEarly = "Kilit kaybedildi; başka çalışmayla çakışmamak için durduruldu"; break; }
        const up = await api.upload(await writeWorkbook(rows, { generatedAt: now().toISOString(), run, note: `Ara kayıt: ${attempted}/${due.length}` }, changes.slice(-5000)), "taslak");
        if (!up.ok) throw new Error(`Ara kayıt yüklenemedi: ${(up.errors ?? []).join("; ")}`);
        log(`ara kayıt ${attempted}/${due.length}`);
      }
      if (k < due.length - 1 && o.delayMs) await sleep(o.delayMs);
    }

    /* 9 · sağlamlık: yazılan dosya geri okunup satır sayısı ve kimlikler karşılaştırılır */
    const workbook = await writeWorkbook(rows, { generatedAt: now().toISOString(), run }, changes.slice(-5000));
    const back = await readWorkbook(workbook);
    if (back.errors.length || back.rows.length !== rows.length || back.rows.some((r, i) => r.slug !== rows[i].slug || r.rating !== rows[i].rating))
      throw new Error("Excel sağlamlık kontrolü başarısız; dosya kaydedilmedi");
    /* 10 · son sürüm güvenli depoya, ardından aktarım */
    const up = await api.upload(workbook, "son");
    if (!up.ok || !up.id) throw new Error(`Son sürüm yüklenemedi: ${(up.errors ?? []).join("; ")}`);
    const imp = await api.importFile(up.id);

    const st = (s: string) => due.filter((d) => rows[idx.get(d.slug)!].status === s).length;
    const report: RunReport = {
      run, startedAt, finishedAt: now().toISOString(), venues: venues.length, rows: rows.length, added: rec.added.length, removed: rec.removed.length, changed: rec.changed.length,
      attempted, fresh: st(STATUS.fresh), same: st(STATUS.same), failed: st(STATUS.error), blocked: st(STATUS.blocked), branch: st(STATUS.branch), deferred: st(STATUS.deferred),
      stoppedEarly, fileId: up.id, import: imp,
      failures: due.map((d) => rows[idx.get(d.slug)!]).filter((r) => r.status !== STATUS.fresh && r.status !== STATUS.same).map((r) => ({ slug: r.slug, status: r.status, error: r.error })),
      summary: summarize(rows),
    };
    return { report, workbook };
  } finally { await api.lock("birak").catch(() => {}); await source.close?.().catch(() => {}); }
}

export type { Row };
