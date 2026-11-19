import { dbFingerprint, previewWriteGuard } from "./db/fingerprint";
import type { Executor } from "./db/migrate";
import { catalogPreviewEnabled } from "./catalogRegion";

/** No migrationStatus(): it contains CREATE TABLE. Only one read query, no rows/PII. */
export async function readKibrisPreviewEvidence(x: Pick<Executor, "query">, appDatabaseUrl: string) {
  if (!catalogPreviewEnabled()) throw new Error("preview_not_enabled");
  // Reuse the existing production fingerprint/pooled-host guard before even reading counts.
  if (!previewWriteGuard(appDatabaseUrl).ok) throw new Error("preview_database_not_isolated");
  const rows = await x.query<{ branch_id: string | null; places: number; users: number; accounts: number; experiences: number; ratings: number; pilot_rows: number }>(`
    SELECT current_setting('neon.branch_id', true) AS branch_id,
      (SELECT count(*)::int FROM places) AS places,
      (SELECT count(*)::int FROM public."user") AS users,
      (SELECT count(*)::int FROM account) AS accounts,
      (SELECT count(*)::int FROM reviews) AS experiences,
      (SELECT count(*)::int FROM google_ratings) AS ratings,
      (SELECT count(*)::int FROM places WHERE slug='masamoro-lefkosa-guney-kibris') AS pilot_rows
  `);
  if (!rows[0] || !dbFingerprint(appDatabaseUrl)) throw new Error("invalid_preview_evidence");
  const { branch_id, ...counts } = rows[0];
  return { fingerprint: dbFingerprint(appDatabaseUrl), branchId: branch_id, counts };
}
