import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

/** Cria uma conexão Drizzle sobre libsql (arquivo ou `:memory:`). */
export function createDb(url: string, authToken?: string) {
  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

/** Aplica as migrações versionadas em `drizzle/` e liga FKs. Idempotente. */
export async function migrateDb(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await db.run(sql`PRAGMA foreign_keys = ON`);
}

function resolveDatabaseConfig(): { url: string; authToken?: string } {
  const fromEnv = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN;
  if (process.env.VERCEL && !fromEnv) {
    throw new Error("Banco não configurado: defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN na Vercel.");
  }
  if (process.env.VERCEL && fromEnv && !/^(libsql|https):\/\//i.test(fromEnv)) {
    throw new Error("Na Vercel, TURSO_DATABASE_URL precisa apontar para um banco libSQL remoto.");
  }
  if (fromEnv) return { url: fromEnv, authToken };
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "app.db").split(path.sep).join("/");
  return { url: `file:${file}` };
}

type Cached = { db: Promise<Db>; schema: typeof schema };
const globalForDb = globalThis as unknown as { __relacionadorDb?: Cached };

/**
 * Singleton por processo (sobrevive ao HMR do Next). Migra na primeira chamada.
 * Se o módulo de schema mudou (nova migração com o `next dev` aberto), a conexão
 * é recriada com o schema novo em vez de servir `db.query.<tabela nova>` indefinido.
 */
export function getDb(): Promise<Db> {
  const cached = globalForDb.__relacionadorDb;
  if (cached && cached.schema === schema) return cached.db;
  const db = (async () => {
    const config = resolveDatabaseConfig();
    const fresh = createDb(config.url, config.authToken);
    // Em serverless, migração é uma etapa explícita do deploy para evitar corrida entre cold starts.
    if (!process.env.VERCEL || process.env.AUTO_MIGRATE_DB === "true") await migrateDb(fresh);
    return fresh;
  })().catch((error: unknown) => {
    globalForDb.__relacionadorDb = undefined;
    throw error;
  });
  globalForDb.__relacionadorDb = { db, schema };
  return db;
}
