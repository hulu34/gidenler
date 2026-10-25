import { MIGRATIONS } from "./migrations.generated";

/* ──────────────────────────────────────────────────────────────────────────
   KONTROLLÜ GEÇİŞ (migration) — derleme sırasında ÇALIŞMAZ.
   · Elle tetiklenir: yönetim ucu (yalnız Preview, Vercel girişiyle korunan adres) ya da yerel komut.
   · Tekrar çalıştırılabilir: uygulanmış geçişler `_gidenler_migrations` tablosunda; tekrar uygulanmaz.
   · Uygulanmış bir geçişin dosyası sonradan değiştiyse (karma uyuşmazlığı) DURUR.
   · Her geçiş tek işlem (transaction) içinde ve danışma kilidiyle: yarım kalırsa geri alınır,
     aynı anda iki çalıştırma olamaz.
   ────────────────────────────────────────────────────────────────────────── */

export interface Executor {
  /** Satır döndüren tek sorgu. */
  query<T = Record<string, unknown>>(text: string): Promise<T[]>;
  /** Verilen ifadeleri tek işlemde çalıştırır (hepsi ya da hiçbiri). */
  transaction(statements: string[]): Promise<void>;
}

const LOCK = "SELECT pg_advisory_xact_lock(7302610)";
const TABLE = `CREATE TABLE IF NOT EXISTS "_gidenler_migrations" ("tag" text PRIMARY KEY, "hash" text NOT NULL, "applied_at" timestamptz NOT NULL DEFAULT now())`;
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

export async function migrationStatus(x: Executor) {
  await x.transaction([TABLE]);
  const applied = await x.query<{ tag: string; hash: string; applied_at: string }>(`SELECT tag, hash, applied_at FROM "_gidenler_migrations" ORDER BY tag`);
  const byTag = new Map(applied.map((a) => [a.tag, a]));
  const drift = MIGRATIONS.filter((m) => byTag.has(m.tag) && byTag.get(m.tag)!.hash !== m.hash).map((m) => m.tag);
  const unknown = applied.filter((a) => !MIGRATIONS.some((m) => m.tag === a.tag)).map((a) => a.tag);
  const pending = MIGRATIONS.filter((m) => !byTag.has(m.tag)).map((m) => m.tag);
  return { applied: applied.map((a) => ({ tag: a.tag, at: a.applied_at })), pending, drift, unknown };
}

export async function applyMigrations(x: Executor) {
  const st = await migrationStatus(x);
  if (st.drift.length) throw new Error(`Uygulanmış geçiş değişmiş: ${st.drift.join(", ")} — durduruldu.`);
  const done: string[] = [];
  for (const m of MIGRATIONS.filter((mm) => st.pending.includes(mm.tag))) {
    await x.transaction([
      LOCK,
      ...m.statements,
      `INSERT INTO "_gidenler_migrations" (tag, hash) VALUES (${q(m.tag)}, ${q(m.hash)})`,
    ]);
    done.push(m.tag);
  }
  return { applied: done, status: await migrationStatus(x) };
}
