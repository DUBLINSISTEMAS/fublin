/**
 * Faz um backup agora e limpa os antigos: `npm run backup` (ou `npx tsx src/db/backup-cli.ts`).
 * Mesma pasta e mesmo formato do backup automático (`data/backups/` ou `BACKUP_DIR`).
 */
import path from "node:path";
import { createBackup, pruneBackups, resolveBackupDir, resolveDataDir } from "@/features/backup/service";
import { formatBytes } from "@/lib/text";
import { getDb } from "./client";

async function main(): Promise<void> {
  const backupDir = resolveBackupDir();
  const backup = await createBackup({ db: await getDb(), dataDir: resolveDataDir(), backupDir, kind: "manual" });
  const removed = await pruneBackups(backupDir);
  console.log(`Backup criado: ${path.join(backupDir, backup.id)} (${formatBytes(backup.sizeBytes)})`);
  if (removed.length > 0) console.log(`Backups antigos apagados: ${removed.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
