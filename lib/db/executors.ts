import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import type { Executor } from "./migrate";

/* Neon HTTP üzerinden geçiş yürütücüsü (yönetim ucu). transaction() tek HTTP isteğinde, tek işlemde çalışır. */
export function neonExecutor(url: string): Executor {
  const sql = neon(url);
  return {
    async query<T>(text: string) { return (await sql.query(text)) as T[]; },
    async transaction(statements: string[]) { await sql.transaction(statements.map((s) => sql.query(s))); },
  };
}

/* Yerel test yürütücüsü (DB_DRIVER=pg). */
export function pgExecutor(url: string): Executor {
  const pool = new Pool({ connectionString: url, max: 1 });
  return {
    async query<T>(text: string) { return (await pool.query(text)).rows as T[]; },
    async transaction(stmts: string[]) {
      const c = await pool.connect();
      try { await c.query("BEGIN"); for (const s of stmts) await c.query(s); await c.query("COMMIT"); }
      catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
    },
  };
}

export function executorFor(url: string): Executor {
  return process.env.DB_DRIVER === "pg" && !process.env.VERCEL ? pgExecutor(url) : neonExecutor(url);
}
