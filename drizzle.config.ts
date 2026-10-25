import { defineConfig } from "drizzle-kit";

/* Geçiş dosyaları (SQL) depoda tutulur; üretimde Vercel derlemesi sırasında uygulanır (scripts/db-migrate.ts). */
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  strict: true,
});
