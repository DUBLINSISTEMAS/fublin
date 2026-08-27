import { createDb, migrateDb, type Db } from "./client";

/** Banco SQLite em memória, migrado, para testes de integração. */
export async function createTestDb(): Promise<Db> {
  const db = createDb(":memory:");
  await migrateDb(db);
  return db;
}
