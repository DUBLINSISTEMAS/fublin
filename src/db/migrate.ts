/**
 * Aplica as migrações pendentes em `data/app.db` (ou `DATABASE_URL`): `npm run db:migrate`.
 * O app faz isso sozinho ao subir; use quando um `next dev` antigo continuar rodando
 * depois de uma migração nova, ou antes de publicar.
 */
import { getDb, migrateDb } from "./client";

getDb()
  .then(async (db) => {
    await migrateDb(db);
    console.log("Migrações aplicadas.");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
