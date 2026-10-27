import type { Executor } from "./migrate";
import { MIGRATIONS } from "./migrations.generated";

/* ──────────────────────────────────────────────────────────────────────────
   GERİ DÖNÜŞ — iki ayrı düzey:
   1. Tohum geri alma: yalnız 148 OSM mekânını (legacy_id 'ent.r.%') ve onlara bağlı kayıtları siler.
      Gerçek kullanıcı verisi (deneyim, liste, Gittim) bu mekânlara bağlıysa DURUR.
   2. Geçiş geri alma (0000_faz0_init): tüm Faz 0 tablolarını kaldırır. Herhangi bir gerçek kullanıcı
      (user) ya da deneyim (reviews) varsa DURUR — veri kaybı olmaz.
   Her ikisi de tek işlemde; yarım kalırsa hiçbir şey değişmez. Asıl güvence Neon'daki yedek daldır.
   ────────────────────────────────────────────────────────────────────────── */

const FAZ0_TABLES = [
  "ranking_entries", "rankings", "follows", "list_items", "lists", "user_place_status", "rating_history",
  "reviewer_expertise", "visit_verifications", "review_dishes", "reviews", "dish_media", "media_places",
  "media_items", "creator_accounts", "creators", "place_dishes", "menu_items", "dishes", "vertical_restaurant",
  "field_provenance", "place_identifiers", "sponsored_placements", "business_accounts", "moderation_queue",
  "audit_log", "places", "session", "account", "verification", "user",
];

async function count(x: Executor, sql: string) {
  const [r] = await x.query<{ n: number }>(sql);
  return Number(r?.n ?? 0);
}

export async function rollbackSeedPreview(x: Executor) {
  const linked = await count(x, `
    SELECT count(*)::int AS n FROM (
      SELECT place_id FROM reviews UNION ALL SELECT place_id FROM user_place_status
      UNION ALL SELECT place_id FROM list_items WHERE place_id IS NOT NULL
    ) t JOIN places p ON p.id = t.place_id WHERE p.legacy_id LIKE 'ent.r.%'`);
  const places = await count(x, `SELECT count(*)::int AS n FROM places WHERE legacy_id LIKE 'ent.r.%'`);
  return { places, linkedUserRows: linked, safe: linked === 0 };
}

export async function rollbackSeed(x: Executor) {
  const p = await rollbackSeedPreview(x);
  if (!p.safe) throw new Error(`Bu mekânlara bağlı ${p.linkedUserRows} kullanıcı kaydı var — tohum geri alma durduruldu.`);
  await x.transaction([`DELETE FROM places WHERE legacy_id LIKE 'ent.r.%'`, ORPHAN_MEDIA]);
  return { removedPlaces: p.places };
}

/** Otomatik eklenmiş, artık hiçbir mekâna bağlı olmayan açık lisanslı fotoğraflar. */
const ORPHAN_MEDIA = `DELETE FROM media_items m WHERE m.source = 'auto' AND m.platform = 'commons'
  AND NOT EXISTS (SELECT 1 FROM media_places mp WHERE mp.media_id = m.id)`;

const legacyList = (slugs: string[]) => slugs.map((s) => `'ent.r.${s.replace(/'/g, "''")}'`).join(",");

/** Yalnız bir dalganın mekânları (ör. Dalga 1'in yeni restoranları). Önceki dalgalara ve
    kullanıcı verisine dokunmaz; bu mekânlara bağlı kullanıcı kaydı varsa DURUR. */
export async function rollbackWavePreview(x: Executor, slugs: string[]) {
  if (!slugs.length) return { places: 0, linkedUserRows: 0, safe: true };
  const L = legacyList(slugs);
  const linked = await count(x, `
    SELECT count(*)::int AS n FROM (
      SELECT place_id FROM reviews UNION ALL SELECT place_id FROM user_place_status
      UNION ALL SELECT place_id FROM list_items WHERE place_id IS NOT NULL
    ) t JOIN places p ON p.id = t.place_id WHERE p.legacy_id IN (${L})`);
  const places = await count(x, `SELECT count(*)::int AS n FROM places WHERE legacy_id IN (${L})`);
  return { places, linkedUserRows: linked, safe: linked === 0 };
}

export async function rollbackWave(x: Executor, slugs: string[]) {
  const p = await rollbackWavePreview(x, slugs);
  if (!p.safe) throw new Error(`Bu dalganın mekânlarına bağlı ${p.linkedUserRows} kullanıcı kaydı var — dalga geri alma durduruldu.`);
  if (!slugs.length) return { removedPlaces: 0 };
  await x.transaction([`DELETE FROM places WHERE legacy_id IN (${legacyList(slugs)})`, ORPHAN_MEDIA]);
  return { removedPlaces: p.places };
}

export async function rollbackMigrationPreview(x: Executor) {
  const exists = await count(x, `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user'`);
  if (!exists) return { users: 0, reviews: 0, safe: true, tables: 0 };
  const users = await count(x, `SELECT count(*)::int AS n FROM "user"`);
  const reviews = await count(x, `SELECT count(*)::int AS n FROM reviews`);
  return { users, reviews, safe: users === 0 && reviews === 0, tables: FAZ0_TABLES.length };
}

export async function rollbackMigration(x: Executor) {
  const p = await rollbackMigrationPreview(x);
  if (!p.safe) throw new Error(`Gerçek kullanıcı (${p.users}) ya da deneyim (${p.reviews}) var — geçiş geri alma durduruldu. Neon yedek dalından geri yükleyin.`);
  const tag = MIGRATIONS[0].tag.replace(/'/g, "''");
  await x.transaction([
    "SELECT pg_advisory_xact_lock(7302610)",
    ...FAZ0_TABLES.map((t) => `DROP TABLE IF EXISTS "${t}" CASCADE`),
    `DELETE FROM "_gidenler_migrations" WHERE tag = '${tag}'`,
  ]);
  return { droppedTables: FAZ0_TABLES.length };
}
