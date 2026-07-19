import { defineConfig } from "drizzle-kit";

/**
 * Drizzle-Kit-Konfiguration. `npm run db:generate` erzeugt SQL-Migrationen
 * aus drizzle/schema.ts, ohne dass eine Verbindung zu einer laufenden
 * Datenbank nötig ist. `npm run db:push`/`db:migrate` benötigen die echte
 * Supabase-Connection-String (SUPABASE_DB_URL, s. .env.example).
 */
export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.SUPABASE_DB_URL ?? "postgresql://placeholder",
  },
});
