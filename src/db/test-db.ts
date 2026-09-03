import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createDb, migrateDb, type Db } from "./client";

/**
 * Banco SQLite migrado, num arquivo temporário descartável (um por chamada).
 *
 * Não é `:memory:` de propósito: o @libsql/client abre cada transação numa conexão
 * nova e, em memória, conexão nova = banco vazio — `db.transaction(...)`, que os
 * serviços usam para gravar registro + timeline juntos, não enxergaria as tabelas.
 * Com arquivo a transação é real (commit e rollback de verdade).
 */
const root = path.join(os.tmpdir(), `relacionador-tests-${process.pid}`);
let cleanupArmed = false;
let counter = 0;

/** Melhor esforço: no Windows o libsql segura o arquivo até o processo morrer, então o %TEMP% limpa o resto. */
function armCleanup(): void {
  if (cleanupArmed) return;
  cleanupArmed = true;
  process.on("exit", () => {
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch {
      /* arquivo ainda travado: fica para a limpeza do sistema */
    }
  });
}

export async function createTestDb(): Promise<Db> {
  fs.mkdirSync(root, { recursive: true });
  armCleanup();
  const file = path.join(root, `db-${counter++}.db`).split(path.sep).join("/");
  const db = createDb(`file:${file}`);
  await migrateDb(db);
  return db;
}
