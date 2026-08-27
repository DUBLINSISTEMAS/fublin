import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

/** Cria uma conexão Drizzle sobre libsql (arquivo ou `:memory:`). */
export function createDb(url: string) {
  const client = createClient({ url });
  return drizzle(client, { schema });
}

/** Aplica as migrações versionadas em `drizzle/` e liga FKs. Idempotente. */
export async function migrateDb(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await db.run(sql`PRAGMA foreign_keys = ON`);
}

function resolveDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv) return fromEnv;
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "app.db").split(path.sep).join("/");
  return `file:${file}`;
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
    const fresh = createDb(resolveDatabaseUrl());
    await migrateDb(fresh);
    return fresh;
  })().catch((error: unknown) => {
    globalForDb.__relacionadorDb = undefined;
    throw error;
  });
  globalForDb.__relacionadorDb = { db, schema };
  return db;
}
