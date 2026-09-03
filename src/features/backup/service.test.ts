import { sql } from "drizzle-orm";
import { unzipSync, zipSync } from "fflate";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDb, migrateDb, type Db } from "@/db/client";
import { goals, leaders } from "@/db/schema";
import { createLeader, listLeaders } from "@/features/leaders/service";
import { DomainError } from "@/lib/result";
import { createBackup, exportBackupZip, importBackupZip, listBackups, pruneBackups, restoreBackup, runScheduledBackupIfDue } from "./service";

const NOW = new Date(2026, 7, 27, 14, 30);
const LATER = new Date(2026, 7, 27, 15, 0);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const SQLITE_HEADER = new TextEncoder().encode("SQLite format 3\0");
const GOAL = { periodKey: "2026-09-1", targetCents: 70_000_000, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() };

let tmp: string;
let dataDir: string;
let backupDir: string;
let db: Db;
const opened: Db[] = [];

function openDb(file: string): Db {
  const handle = createDb(`file:${file.split(path.sep).join("/")}`);
  opened.push(handle);
  return handle;
}

const uploadsFile = (...parts: string[]) => path.join(dataDir, "uploads", ...parts);
const leaderNames = async (handle: Db) => (await listLeaders(handle)).map((l) => l.name);
const ids = async () => (await listBackups(backupDir)).map((b) => b.id);

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "relacionador-backup-"));
  dataDir = path.join(tmp, "data");
  backupDir = path.join(tmp, "backups");
  await fs.mkdir(uploadsFile("lideres"), { recursive: true });
  await fs.writeFile(uploadsFile("lideres", "carlos.png"), PNG);
  db = openDb(path.join(dataDir, "app.db"));
  await migrateDb(db);
  await createLeader(db, { name: "Carlos", phone: undefined }, NOW);
});

afterEach(async () => {
  vi.restoreAllMocks();
  for (const handle of opened.splice(0)) handle.$client.close();
  // Melhor esforço, sem retries: no Windows o libsql segura o app.db aberto até o fim do processo,
  // então apagamos o que dá (backups, uploads) e deixamos o resto para a limpeza do %TEMP%.
  for (const dir of [backupDir, uploadsFile(), tmp]) await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
});

describe("createBackup / listBackups", () => {
  it("snapshots the database, copies uploads and writes a manifest", async () => {
    const info = await createBackup({ db, dataDir, backupDir, now: NOW });
    expect(info.id).toBe("2026-08-27_1430");
    expect(info.kind).toBe("manual");

    const dir = path.join(backupDir, info.id);
    const manifest = JSON.parse(await fs.readFile(path.join(dir, "manifest.json"), "utf8"));
    expect(manifest).toMatchObject({ version: 1, createdAt: NOW.toISOString(), kind: "manual", uploadsBytes: PNG.byteLength });
    expect(manifest.appDbBytes).toBeGreaterThan(0);
    expect(info.sizeBytes).toBe(manifest.appDbBytes + manifest.uploadsBytes);
    expect(await fs.readFile(path.join(dir, "uploads", "lideres", "carlos.png"))).toEqual(Buffer.from(PNG));
    expect(await leaderNames(openDb(path.join(dir, "app.db")))).toEqual(["Carlos"]);
    expect(await listBackups(backupDir)).toEqual([info]);
  });

  it("falls back to copying the file when VACUUM INTO fails and marks the backup as degraded", async () => {
    const broken = { run: vi.fn().mockRejectedValue(new Error("no vacuum")) } as unknown as Db;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const info = await createBackup({ db: broken, dataDir, backupDir, now: NOW });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(await leaderNames(openDb(path.join(backupDir, info.id, "app.db")))).toEqual(["Carlos"]);
    // O aviso precisa sobreviver ao manifest: é o que a tela mostra para o dono.
    expect(info.degraded).toBe(true);
    expect(JSON.parse(await fs.readFile(path.join(backupDir, info.id, "manifest.json"), "utf8"))).toMatchObject({ degraded: true });
    expect((await listBackups(backupDir))[0].degraded).toBe(true);
  });

  it("a clean snapshot is never marked as degraded", async () => {
    const info = await createBackup({ db, dataDir, backupDir, now: NOW });
    expect(info.degraded).toBe(false);
    expect(JSON.parse(await fs.readFile(path.join(backupDir, info.id, "manifest.json"), "utf8"))).toMatchObject({ degraded: false });
  });

  it("never overwrites a backup made in the same minute", async () => {
    await createBackup({ db, dataDir, backupDir, now: NOW });
    await createBackup({ db, dataDir, backupDir, now: NOW });
    expect(await ids()).toEqual(["2026-08-27_1430-2", "2026-08-27_1430"]);
  });

  it("lists newest first, repairs a broken manifest when app.db exists and skips folders that are not backups", async () => {
    expect(await listBackups(path.join(tmp, "nope"))).toEqual([]);
    await createBackup({ db, dataDir, backupDir, now: new Date(2026, 7, 26, 0, 0) });
    const damaged = await createBackup({ db, dataDir, backupDir, now: NOW });
    await fs.writeFile(path.join(backupDir, damaged.id, "manifest.json"), "{ nope");
    await fs.mkdir(path.join(backupDir, "2026-01-01_0000"));
    await fs.writeFile(path.join(backupDir, "2026-01-01_0000", "manifest.json"), "{ nope");
    await fs.mkdir(path.join(backupDir, "sem-nada"));

    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const list = await listBackups(backupDir);
    expect(list.map((b) => b.id)).toEqual(["2026-08-27_1430", "2026-08-26_0000"]);
    expect(list[0]).toMatchObject({ kind: "manual", sizeBytes: damaged.sizeBytes });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(await fs.readFile(path.join(backupDir, damaged.id, "manifest.json"), "utf8"))).toMatchObject({ version: 1, kind: "manual" });
    // Reparado uma vez, não avisa de novo.
    await listBackups(backupDir);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("restoreBackup", () => {
  it("brings rows and uploads back, keeps a safety copy and re-enables foreign keys", async () => {
    const backup = await createBackup({ db, dataDir, backupDir, now: NOW });

    await db.delete(leaders);
    await db.insert(goals).values(GOAL);
    await fs.rm(uploadsFile(), { recursive: true });
    await fs.mkdir(uploadsFile("novo"), { recursive: true });
    await fs.writeFile(uploadsFile("novo", "extra.png"), PNG);

    const safetyId = await restoreBackup({ db, dataDir, backupDir, id: backup.id, now: LATER });
    expect(safetyId).toBe("2026-08-27_1500-seguranca");
    expect(await leaderNames(db)).toEqual(["Carlos"]);
    expect(await db.select().from(goals)).toEqual([]);
    expect(await fs.readFile(uploadsFile("lideres", "carlos.png"))).toEqual(Buffer.from(PNG));
    await expect(fs.access(uploadsFile("novo", "extra.png"))).rejects.toThrow();
    expect((await db.all<{ foreign_keys: number }>(sql`PRAGMA foreign_keys`))[0].foreign_keys).toBe(1);

    const safety = await listBackups(backupDir).then((list) => list.find((b) => b.id === safetyId));
    expect(safety?.kind).toBe("seguranca");
    expect(await leaderNames(openDb(path.join(backupDir, safetyId, "app.db")))).toEqual([]);
    expect(await fs.readFile(path.join(backupDir, safetyId, "uploads", "novo", "extra.png"))).toEqual(Buffer.from(PNG));
    // A troca por rename não deixa pastas temporárias para trás.
    expect(await fs.readdir(dataDir)).toEqual(["app.db", "uploads"]);
  });

  it("keeps the current uploads untouched and points at the safety backup when the copy fails", async () => {
    const backup = await createBackup({ db, dataDir, backupDir, now: NOW });
    await fs.writeFile(uploadsFile("lideres", "novo.png"), PNG);
    const realCp = fs.cp;
    vi.spyOn(fs, "cp").mockImplementation((src, dest, options) => (String(dest).endsWith(".novo") ? Promise.reject(new Error("disco cheio")) : realCp(src, dest, options)));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    // As tabelas já foram trocadas quando os anexos falham: a mensagem diz qual backup desfaz isso.
    await expect(restoreBackup({ db, dataDir, backupDir, id: backup.id, now: LATER })).rejects.toThrow(/2026-08-27_1500-seguranca/);
    await expect(restoreBackup({ db, dataDir, backupDir, id: backup.id, now: LATER })).rejects.toThrow(DomainError);
    expect(error).toHaveBeenCalled();
    expect(await fs.readFile(uploadsFile("lideres", "novo.png"))).toEqual(Buffer.from(PNG));
    expect(await fs.readFile(uploadsFile("lideres", "carlos.png"))).toEqual(Buffer.from(PNG));
    expect(await fs.readdir(dataDir)).toEqual(["app.db", "uploads"]);
  });

  it("skips tables and columns the backup does not have (older versions)", async () => {
    const backup = await createBackup({ db, dataDir, backupDir, now: NOW });
    const old = openDb(path.join(backupDir, backup.id, "app.db"));
    await old.run(sql`DROP TABLE goals`);
    await old.run(sql`ALTER TABLE leaders DROP COLUMN photo_key`);
    old.$client.close();

    await db.delete(leaders);
    await db.insert(goals).values(GOAL);
    await restoreBackup({ db, dataDir, backupDir, id: backup.id, now: LATER });
    expect(await listLeaders(db)).toMatchObject([{ name: "Carlos", photoKey: null }]);
    expect(await db.select().from(goals)).toMatchObject([{ periodKey: "2026-09-1" }]);
  });

  it("rejects invalid, unknown and foreign backups without touching anything", async () => {
    await expect(restoreBackup({ db, dataDir, backupDir, id: "../x", now: LATER })).rejects.toThrow(DomainError);
    await expect(restoreBackup({ db, dataDir, backupDir, id: "2099-01-01_0000", now: LATER })).rejects.toThrow("Backup não encontrado.");
    await expect(exportBackupZip({ backupDir, id: "2099-01-01_0000" })).rejects.toThrow("Backup não encontrado.");

    const foreign = path.join(backupDir, "2026-08-27_0900");
    await fs.mkdir(foreign, { recursive: true });
    const other = openDb(path.join(foreign, "app.db"));
    await other.run(sql`CREATE TABLE notas (id integer primary key)`);
    other.$client.close();
    await expect(restoreBackup({ db, dataDir, backupDir, id: "2026-08-27_0900", now: LATER })).rejects.toThrow("não tem dados do Relacionador");
    // Nenhum backup de segurança foi criado (a pasta estranha aparece porque tem app.db e ganha manifest).
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await ids()).toEqual(["2026-08-27_0900"]);
    expect(await leaderNames(db)).toEqual(["Carlos"]);
  });
});

describe("exportBackupZip / importBackupZip", () => {
  it("round-trips a backup through a zip that can then be restored", async () => {
    const backup = await createBackup({ db, dataDir, backupDir, now: NOW });
    const zip = await exportBackupZip({ backupDir, id: backup.id });
    expect(String.fromCharCode(zip[0], zip[1])).toBe("PK");
    expect(Object.keys(unzipSync(zip)).sort()).toEqual(["app.db", "manifest.json", "uploads/lideres/carlos.png"]);

    const importedId = await importBackupZip({ backupDir, bytes: zip, now: LATER });
    expect(importedId).toBe("2026-08-27_1500-importado");
    const imported = (await listBackups(backupDir)).find((b) => b.id === importedId);
    expect(imported).toMatchObject({ kind: "importado", createdAt: NOW.toISOString(), sizeBytes: backup.sizeBytes });

    await db.delete(leaders);
    await restoreBackup({ db, dataDir, backupDir, id: importedId, now: new Date(2026, 7, 27, 16, 0) });
    expect(await leaderNames(db)).toEqual(["Carlos"]);
  });

  it("accepts a zip made from the folder itself and stamps it with the import time", async () => {
    const backup = await createBackup({ db, dataDir, backupDir, now: NOW });
    const dbBytes = await fs.readFile(path.join(backupDir, backup.id, "app.db"));
    const zip = zipSync({ [`${backup.id}/app.db`]: dbBytes, [`${backup.id}/uploads/a.png`]: PNG });
    const id = await importBackupZip({ backupDir, bytes: zip, now: LATER });
    expect(await fs.readFile(path.join(backupDir, id, "app.db"))).toEqual(dbBytes);
    expect(await fs.readFile(path.join(backupDir, id, "uploads", "a.png"))).toEqual(Buffer.from(PNG));
    expect((await listBackups(backupDir)).find((b) => b.id === id)).toMatchObject({ createdAt: LATER.toISOString(), sizeBytes: dbBytes.byteLength + PNG.byteLength });
  });

  it("rejects files that are not a backup zip", async () => {
    const attempt = (bytes: Uint8Array) => importBackupZip({ backupDir, bytes, now: LATER });
    await expect(attempt(new Uint8Array([1, 2, 3, 4, 5]))).rejects.toThrow("não é um .zip");
    await expect(attempt(new TextEncoder().encode("PK\x03\x04 lixo"))).rejects.toThrow("não é um .zip");
    await expect(attempt(zipSync({ "leia-me.txt": PNG }))).rejects.toThrow("app.db");
    await expect(attempt(zipSync({ "app.db": new TextEncoder().encode("not sqlite") }))).rejects.toThrow("app.db");
    await expect(attempt(zipSync({ "app.db": SQLITE_HEADER, "../fora.txt": PNG }))).rejects.toThrow("caminhos inválidos");
    expect(await ids()).toEqual([]);
  });

  it("rejects a zip whose declared contents exceed the unzipped ceiling before inflating it", async () => {
    const big = zipSync({ "app.db": SQLITE_HEADER, "uploads/zeros.bin": new Uint8Array(10_000) });
    await expect(importBackupZip({ backupDir, bytes: big, now: LATER, maxUnzippedBytes: 1_000 })).rejects.toThrow("grande demais");
    expect(await ids()).toEqual([]);
    await expect(importBackupZip({ backupDir, bytes: big, now: LATER })).resolves.toBe("2026-08-27_1500-importado");
  });
});

describe("runScheduledBackupIfDue / pruneBackups", () => {
  it("creates one backup per day and prunes the oldest", async () => {
    expect(await runScheduledBackupIfDue({ db, dataDir, backupDir, now: NOW })).toBe("2026-08-27_1430");
    expect(await fs.readFile(path.join(backupDir, ".last"), "utf8")).toBe("2026-08-27");
    expect(await runScheduledBackupIfDue({ db, dataDir, backupDir, now: new Date(2026, 7, 27, 23, 59) })).toBeNull();

    const next = await runScheduledBackupIfDue({ db, dataDir, backupDir, now: new Date(2026, 7, 28, 0, 1), keep: 1 });
    expect(next).toBe("2026-08-28_0001");
    expect(await listBackups(backupDir)).toMatchObject([{ id: next, kind: "auto" }]);
  });

  it("treats only a missing marker as 'never ran' and lets other read errors surface", async () => {
    const marker = path.join(backupDir, ".last");
    // Sem marcador: é o primeiro backup do dia.
    expect(await runScheduledBackupIfDue({ db, dataDir, backupDir, now: NOW })).toBe("2026-08-27_1430");

    // Marcador ilegível (aqui, uma pasta no lugar do arquivo): parar é melhor do que
    // refazer o backup a cada checagem sem ninguém ficar sabendo.
    await fs.rm(marker);
    await fs.mkdir(marker);
    await expect(runScheduledBackupIfDue({ db, dataDir, backupDir, now: new Date(2026, 7, 28, 0, 1) })).rejects.toThrow(/EISDIR|EACCES|EPERM/);
    expect(await ids()).toEqual(["2026-08-27_1430"]);
  });

  it("pruneBackups keeps the newest N", async () => {
    for (const hour of [10, 11, 12]) await createBackup({ db, dataDir, backupDir, now: new Date(2026, 7, 27, hour, 0) });
    expect(await pruneBackups(backupDir, 2)).toEqual(["2026-08-27_1000"]);
    expect(await ids()).toEqual(["2026-08-27_1200", "2026-08-27_1100"]);
    expect(await pruneBackups(backupDir, 0)).toEqual(["2026-08-27_1100"]);
  });
});
