import { format } from "date-fns";
import { getTableName, sql } from "drizzle-orm";
import { unzipSync, zipSync, type Zippable } from "fflate";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDb, type Db } from "@/db/client";
import { activities, appointments, attachments, clients, goals, leaders, settings } from "@/db/schema";
import { dayKey, toIso } from "@/lib/dates";
import { DomainError } from "@/lib/result";
import { BACKUP_ID_RE, DEFAULT_KEEP, MANIFEST_VERSION, MAX_IMPORT_UNZIPPED_BYTES, manifestSchema, type BackupInfo, type BackupKind, type BackupManifest } from "./schema";

const APP_DB = "app.db";
const UPLOADS = "uploads";
const MANIFEST = "manifest.json";
const LAST_MARKER = ".last";
const SQLITE_HEADER = "SQLite format 3\0";
/** Ordem de restauração: pais antes dos filhos. Tabelas que o backup não tiver são puladas. */
const TABLES_IN_ORDER = [leaders, clients, appointments, activities, attachments, settings, goals].map(getTableName);
const BATCH_ROWS = 500;
/** Folga abaixo do SQLITE_MAX_VARIABLE_NUMBER (32766) para linhas com muitas colunas. */
const MAX_BATCH_PARAMS = 30_000;

export function resolveBackupDir(): string {
  return process.env.BACKUP_DIR ?? path.join(process.cwd(), "data", "backups");
}

/** Pasta com `app.db` e `uploads/` (a mesma de `db/client.ts` e `lib/storage.ts`). */
export function resolveDataDir(): string {
  return path.join(process.cwd(), "data");
}

/* ---------- utilidades de arquivo ---------- */

const posixPath = (p: string) => p.split(path.sep).join("/");
const stamp = (date: Date) => format(date, "yyyy-MM-dd_HHmm");

async function exists(p: string): Promise<boolean> {
  return fs.access(p).then(() => true, () => false);
}

async function dirSize(dir: string): Promise<number> {
  if (!(await exists(dir))) return 0;
  let total = 0;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? await dirSize(full) : (await fs.stat(full)).size;
  }
  return total;
}

/** Caminhos relativos (com "/") de todos os arquivos abaixo de `root`. */
async function listFiles(root: string, rel = ""): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await fs.readdir(path.join(root, rel), { withFileTypes: true })) {
    const child = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await listFiles(root, child)));
    else out.push(child);
  }
  return out;
}

async function uniqueBackupId(backupDir: string, base: string): Promise<string> {
  let id = base;
  for (let n = 2; await exists(path.join(backupDir, id)); n++) id = `${base}-${n}`;
  return id;
}

/** Pasta de um backup existente; valida o id (nada de `..`) e exige o `app.db`. */
async function backupFolder(backupDir: string, id: string): Promise<string> {
  if (!BACKUP_ID_RE.test(id)) throw new DomainError("Backup inválido.");
  const dir = path.join(backupDir, id);
  if (!(await exists(path.join(dir, APP_DB)))) throw new DomainError("Backup não encontrado.");
  return dir;
}

/* ---------- manifest ---------- */

const toInfo = (id: string, m: BackupManifest): BackupInfo => ({ id, createdAt: m.createdAt, sizeBytes: m.appDbBytes + m.uploadsBytes, kind: m.kind, degraded: m.degraded });

async function writeManifest(dir: string, id: string, meta: { createdAt: string; kind: BackupKind; degraded?: boolean }): Promise<BackupInfo> {
  const manifest: BackupManifest = {
    version: MANIFEST_VERSION,
    degraded: false,
    ...meta,
    appDbBytes: (await fs.stat(path.join(dir, APP_DB))).size,
    uploadsBytes: await dirSize(path.join(dir, UPLOADS)),
  };
  await fs.writeFile(path.join(dir, MANIFEST), JSON.stringify(manifest, null, 2));
  return toInfo(id, manifest);
}

function parseManifest(raw: string | Uint8Array | undefined): BackupManifest | null {
  if (raw === undefined) return null;
  try {
    const parsed = manifestSchema.safeParse(JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/* ---------- criar / listar / limpar ---------- */

export type CreateBackupInput = { db: Db; dataDir: string; backupDir: string; now?: Date; kind?: BackupKind };

/** Snapshot consistente do banco (VACUUM INTO; cópia do arquivo se falhar) + cópia de `uploads/` + manifest. */
export async function createBackup({ db, dataDir, backupDir, now = new Date(), kind = "manual" }: CreateBackupInput): Promise<BackupInfo> {
  await fs.mkdir(backupDir, { recursive: true });
  const id = await uniqueBackupId(backupDir, kind === "seguranca" ? `${stamp(now)}-seguranca` : stamp(now));
  const dir = path.join(backupDir, id);
  await fs.mkdir(dir);
  const degraded = await snapshotDatabase(db, path.join(dataDir, APP_DB), path.join(dir, APP_DB));
  const uploads = path.join(dataDir, UPLOADS);
  if (await exists(uploads)) await fs.cp(uploads, path.join(dir, UPLOADS), { recursive: true });
  return writeManifest(dir, id, { createdAt: toIso(now), kind, degraded });
}

/** `true` quando caiu na cópia bruta do arquivo: o snapshot pode ter pegado o banco no meio de uma escrita. */
async function snapshotDatabase(db: Db, sourceFile: string, target: string): Promise<boolean> {
  try {
    const literal = posixPath(path.resolve(target)).replace(/'/g, "''");
    await db.run(sql.raw(`VACUUM INTO '${literal}'`));
    return false;
  } catch (error) {
    console.warn("[backup] VACUUM INTO falhou; copiando o arquivo do banco.", error);
    await fs.copyFile(sourceFile, target);
    return true;
  }
}

/** Do mais novo ao mais antigo (o id começa pela data/hora local em que a pasta foi criada). */
export async function listBackups(backupDir: string = resolveBackupDir()): Promise<BackupInfo[]> {
  if (!(await exists(backupDir))) return [];
  const found: BackupInfo[] = [];
  for (const entry of await fs.readdir(backupDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !BACKUP_ID_RE.test(entry.name)) continue;
    const info = await readOrRepairManifest(path.join(backupDir, entry.name), entry.name);
    if (info) found.push(info);
  }
  return found.sort((a, b) => b.id.localeCompare(a.id));
}

/**
 * Manifest da pasta; se estiver ausente ou corrompido mas houver `app.db`, refaz a partir dos
 * arquivos (data = modificação do banco) para o backup continuar visível e entrar na limpeza.
 */
async function readOrRepairManifest(dir: string, id: string): Promise<BackupInfo | null> {
  const file = path.join(dir, MANIFEST);
  const manifest = (await exists(file)) ? parseManifest(await fs.readFile(file, "utf8")) : null;
  if (manifest) return toInfo(id, manifest);
  const appDb = path.join(dir, APP_DB);
  if (!(await exists(appDb))) return null; // não é uma pasta de backup
  console.warn(`[backup] manifest ausente ou inválido em ${dir}; refeito a partir dos arquivos.`);
  return writeManifest(dir, id, { createdAt: toIso((await fs.stat(appDb)).mtime), kind: "manual" });
}

/**
 * Apaga os backups além dos `keep` mais novos (sempre fica pelo menos um). Devolve os ids removidos.
 * Uma pasta que o Windows ainda segura (arquivo aberto) fica para a próxima limpeza, sem derrubar o agendador.
 */
export async function pruneBackups(backupDir: string, keep: number = DEFAULT_KEEP): Promise<string[]> {
  const removed: string[] = [];
  for (const backup of (await listBackups(backupDir)).slice(Math.max(keep, 1))) {
    try {
      await fs.rm(path.join(backupDir, backup.id), { recursive: true, force: true, maxRetries: 3 });
      removed.push(backup.id);
    } catch (error) {
      console.warn(`[backup] não foi possível apagar o backup antigo ${backup.id}; tento de novo na próxima limpeza.`, error);
    }
  }
  return removed;
}

/* ---------- restaurar ---------- */

type TableDump = { name: string; columns: string[]; rows: unknown[][] };

export type RestoreBackupInput = { db: Db; dataDir: string; backupDir: string; id: string; now?: Date };

/**
 * Copia as linhas do `app.db` do backup para o banco aberto pelo app (no Windows o arquivo
 * está travado, então nunca trocamos o arquivo) e substitui `uploads/`.
 * Antes disso guarda o estado atual num backup "seguranca". Devolve o id desse backup.
 */
export async function restoreBackup({ db, dataDir, backupDir, id, now = new Date() }: RestoreBackupInput): Promise<string> {
  const dir = await backupFolder(backupDir, id);
  const dumps = await readBackupTables(path.join(dir, APP_DB));
  if (dumps.length === 0) throw new DomainError("Este backup não tem dados do Relacionador.");
  const safety = await createBackup({ db, dataDir, backupDir, now, kind: "seguranca" });
  try {
    await replaceTables(db, dumps);
    await replaceUploads(dataDir, dir);
  } catch (error) {
    // A partir daqui os dados podem estar pela metade: a mensagem precisa dizer,
    // com nome e sobrenome, qual backup devolve o estado de antes.
    console.error("[backup] a restauração falhou depois de começar a trocar os dados", error);
    throw new DomainError(`A restauração parou no meio e os dados podem estar incompletos. O estado anterior está no backup de segurança "${safety.id}": restaure esse backup para voltar como estava.`);
  }
  return safety.id;
}

/**
 * Lê as tabelas de uma cópia temporária do `app.db`: no Windows o libsql segura o arquivo aberto
 * mesmo depois do `close()`, e assim a pasta do backup continua livre para apagar ou mover.
 */
async function readBackupTables(file: string): Promise<TableDump[]> {
  const copy = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "relacionador-restore-")), APP_DB);
  await fs.copyFile(file, copy);
  const source = openBackupDb(copy);
  try {
    return await readTables(source);
  } finally {
    source.$client.close();
    await fs.rm(path.dirname(copy), { recursive: true, force: true }).catch(() => undefined);
  }
}

function openBackupDb(file: string): Db {
  try {
    return createDb(`file:${posixPath(file)}`);
  } catch (error) {
    console.error("[backup]", error);
    throw new DomainError("O banco do backup não pôde ser aberto.");
  }
}

async function tableColumns(db: Db, table: string): Promise<string[]> {
  const info = await db.all<{ name: string }>(sql.raw(`PRAGMA table_info("${table}")`));
  return info.map((c) => c.name);
}

async function readTables(source: Db): Promise<TableDump[]> {
  const dumps: TableDump[] = [];
  for (const name of TABLES_IN_ORDER) {
    const columns = await tableColumns(source, name);
    if (columns.length === 0) continue; // a tabela não existia nessa versão
    const rows = await source.all<Record<string, unknown>>(sql.raw(`SELECT * FROM "${name}"`));
    dumps.push({ name, columns, rows: rows.map((row) => columns.map((c) => row[c] ?? null)) });
  }
  return dumps;
}

/** Mantém só as colunas que existem no banco atual; colunas novas ficam com o padrão do schema. */
async function planInserts(db: Db, dumps: TableDump[]): Promise<TableDump[]> {
  const plans: TableDump[] = [];
  for (const dump of dumps) {
    const current = await tableColumns(db, dump.name);
    const shared = dump.columns.map((name, index) => ({ name, index })).filter((c) => current.includes(c.name));
    plans.push({ name: dump.name, columns: shared.map((c) => c.name), rows: dump.rows.map((row) => shared.map((c) => row[c.index])) });
  }
  return plans;
}

async function replaceTables(db: Db, dumps: TableDump[]): Promise<void> {
  const plans = await planInserts(db, dumps);
  // O PRAGMA é ignorado dentro de uma transação, por isso vem antes do BEGIN (mesma conexão).
  await db.run(sql`PRAGMA foreign_keys = OFF`);
  try {
    await db.transaction(async (tx) => {
      for (const plan of plans) {
        await tx.run(sql.raw(`DELETE FROM "${plan.name}"`));
        const size = Math.max(1, Math.min(BATCH_ROWS, Math.floor(MAX_BATCH_PARAMS / Math.max(plan.columns.length, 1))));
        for (let i = 0; i < plan.rows.length; i += size) await tx.run(insertStatement(plan.name, plan.columns, plan.rows.slice(i, i + size)));
      }
    });
  } finally {
    await db.run(sql`PRAGMA foreign_keys = ON`);
  }
}

function insertStatement(table: string, columns: string[], rows: unknown[][]) {
  const cols = sql.raw(columns.map((c) => `"${c}"`).join(", "));
  const values = sql.join(
    rows.map((row) => sql`(${sql.join(row.map((v) => sql`${v}`), sql`, `)})`),
    sql`, `,
  );
  return sql`INSERT INTO ${sql.raw(`"${table}"`)} (${cols}) VALUES ${values}`;
}

/**
 * Troca `uploads/` sem janela de perda: copia o backup para uma pasta irmã e só então faz a
 * troca por `rename` (atômico no mesmo disco). Se a cópia falhar, os anexos atuais ficam como estão.
 */
async function replaceUploads(dataDir: string, backupDir: string): Promise<void> {
  const target = path.join(dataDir, UPLOADS);
  const token = Date.now().toString(36);
  const fresh = path.join(dataDir, `${UPLOADS}.${token}.novo`);
  const old = path.join(dataDir, `${UPLOADS}.${token}.antigo`);

  const source = path.join(backupDir, UPLOADS);
  if (await exists(source)) await fs.cp(source, fresh, { recursive: true });
  else await fs.mkdir(fresh, { recursive: true });

  try {
    if (await exists(target)) await fs.rename(target, old);
  } catch (error) {
    await fs.rm(fresh, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
  try {
    await fs.rename(fresh, target);
  } catch (error) {
    await fs.rename(old, target).catch((rollback) => console.error(`[backup] anexos ficaram em ${old}; mova de volta para ${target}.`, rollback));
    throw error;
  }
  await fs.rm(old, { recursive: true, force: true, maxRetries: 3 }).catch((error) => console.warn(`[backup] pasta antiga de anexos ficou em ${old}; apague quando puder.`, error));
}

/* ---------- zip: exportar / importar ---------- */

export async function exportBackupZip({ backupDir, id }: { backupDir: string; id: string }): Promise<Uint8Array> {
  const dir = await backupFolder(backupDir, id);
  const files: Zippable = {};
  for (const rel of await listFiles(dir)) {
    const bytes = new Uint8Array(await fs.readFile(path.join(dir, rel)));
    // Fotos e PDFs já vêm comprimidos: guardar sem recomprimir poupa tempo.
    files[rel] = rel.startsWith(`${UPLOADS}/`) ? [bytes, { level: 0 }] : bytes;
  }
  return zipSync(files, { level: 6 });
}

export type ImportBackupInput = { backupDir: string; bytes: Uint8Array; now?: Date; maxUnzippedBytes?: number };

/** Descompacta um zip de backup numa pasta nova `<data_hora>-importado` e devolve o id (restaurar é o passo seguinte). */
export async function importBackupZip({ backupDir, bytes, now = new Date(), maxUnzippedBytes = MAX_IMPORT_UNZIPPED_BYTES }: ImportBackupInput): Promise<string> {
  const entries = unzipEntries(bytes, maxUnzippedBytes);
  const appDb = entries.get(APP_DB);
  if (!appDb || !isSqliteFile(appDb)) throw new DomainError("O zip não contém um banco válido (app.db).");

  await fs.mkdir(backupDir, { recursive: true });
  const id = await uniqueBackupId(backupDir, `${stamp(now)}-importado`);
  const dir = path.join(backupDir, id);
  for (const [rel, data] of entries) {
    const file = path.join(dir, ...rel.split("/"));
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  }
  const original = parseManifest(entries.get(MANIFEST));
  await writeManifest(dir, id, { createdAt: original?.createdAt ?? toIso(now), kind: "importado" });
  return id;
}

function unzipEntries(bytes: Uint8Array, maxUnzippedBytes: number): Map<string, Uint8Array> {
  if (bytes.byteLength < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new DomainError("O arquivo não é um .zip válido.");
  let unzipped: Record<string, Uint8Array>;
  let total = 0;
  try {
    // O filtro roda antes de inflar cada entrada: um zip-bomb é barrado pelo tamanho declarado.
    unzipped = unzipSync(bytes, {
      filter: (file) => {
        total += file.originalSize;
        if (total > maxUnzippedBytes) throw new DomainError("O backup é grande demais para importar por aqui; copie a pasta direto para a pasta de backups.");
        return true;
      },
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("O arquivo não é um .zip válido.");
  }
  const names = Object.keys(unzipped).filter((name) => !name.endsWith("/"));
  const prefix = rootPrefix(names);
  const entries = new Map<string, Uint8Array>();
  for (const name of names) {
    const rel = name.slice(prefix.length);
    if (!isSafeRelativePath(rel)) throw new DomainError("O zip tem caminhos inválidos.");
    entries.set(rel, unzipped[name]);
  }
  return entries;
}

/** Zip feito da pasta no Explorer vem como "pasta/app.db": tiramos esse prefixo. */
function rootPrefix(names: string[]): string {
  if (names.includes(APP_DB)) return "";
  const nested = names.filter((name) => name.endsWith(`/${APP_DB}`) && name.split("/").length === 2);
  return nested.length === 1 ? nested[0].slice(0, -APP_DB.length) : "";
}

function isSafeRelativePath(rel: string): boolean {
  if (!rel || rel.includes("\\") || rel.includes(":") || rel.startsWith("/")) return false;
  return rel.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function isSqliteFile(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.subarray(0, SQLITE_HEADER.length)) === SQLITE_HEADER;
}

/* ---------- agendado ---------- */

export type ScheduledBackupInput = { db: Db; dataDir: string; backupDir: string; now?: Date; keep?: number };

/** Garante um backup por dia (marcador `.last` com a data local) e limpa os antigos. Devolve o id criado ou null. */
export async function runScheduledBackupIfDue({ db, dataDir, backupDir, now = new Date(), keep = DEFAULT_KEEP }: ScheduledBackupInput): Promise<string | null> {
  const today = dayKey(now);
  const marker = path.join(backupDir, LAST_MARKER);
  const last = await readDayMarker(marker);
  if (last === today) return null;
  const { id } = await createBackup({ db, dataDir, backupDir, now, kind: "auto" });
  await fs.writeFile(marker, today);
  await pruneBackups(backupDir, keep);
  return id;
}

const isNotFound = (error: unknown) => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/**
 * Data do último backup automático. Arquivo ausente = ainda não houve nenhum.
 * Qualquer outro erro (permissão, disco) sobe: dizer "não tem marcador" nesse caso
 * faria o agendador refazer o backup em toda checagem, sem ninguém ficar sabendo.
 */
async function readDayMarker(marker: string): Promise<string | null> {
  try {
    return (await fs.readFile(marker, "utf8")).trim();
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}
