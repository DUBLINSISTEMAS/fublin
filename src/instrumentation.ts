/**
 * Agendador do backup diário (convenção `instrumentation.ts` do Next: `register()` roda
 * uma vez quando o servidor sobe). 30 s depois de subir e a cada 5 min, confere se o backup
 * de hoje já existe e, se não, cria e limpa os antigos. Só no runtime Node, fora dos testes;
 * `DISABLE_BACKUP_SCHEDULER=1` desliga.
 */
const START_DELAY_MS = 30_000;
const INTERVAL_MS = 5 * 60_000;

const globalForScheduler = globalThis as unknown as { __relacionadorBackupScheduler?: boolean };

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV === "test" || process.env.DISABLE_BACKUP_SCHEDULER) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  // O HMR do `next dev` reavalia este módulo; a flag global evita dois agendadores.
  if (globalForScheduler.__relacionadorBackupScheduler) return;
  globalForScheduler.__relacionadorBackupScheduler = true;

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      // Imports dinâmicos: libsql/fs só carregam aqui, nunca no bundle edge.
      const [{ getDb }, { resolveBackupDir, resolveDataDir, runScheduledBackupIfDue }] = await Promise.all([import("./db/client"), import("./features/backup/service")]);
      const id = await runScheduledBackupIfDue({ db: await getDb(), dataDir: resolveDataDir(), backupDir: resolveBackupDir() });
      if (id) console.info(`[backup] Backup automático criado: ${id}`);
    } catch (error) {
      console.error("[backup]", error);
    } finally {
      running = false;
    }
  };

  // `unref` para os timers não segurarem o processo vivo (ex.: `next build` chamando `register`).
  const first = setTimeout(() => {
    void tick();
    setInterval(() => void tick(), INTERVAL_MS).unref();
  }, START_DELAY_MS);
  first.unref();
}
