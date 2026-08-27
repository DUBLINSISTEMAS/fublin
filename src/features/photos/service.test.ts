import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { createLeader, listLeaders } from "@/features/leaders/service";
import { getSetting } from "@/features/settings/service";
import { createMemoryStorage } from "@/lib/storage";
import { removePhoto, savePhoto } from "./service";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const pdf = new TextEncoder().encode("%PDF-1.4 fake");

let db: Db;
let storage: ReturnType<typeof createMemoryStorage>;
beforeEach(async () => {
  db = await createTestDb();
  storage = createMemoryStorage();
});

describe("photos", () => {
  it("stores a leader photo under a fresh key and removes the previous file on replace", async () => {
    const leader = await createLeader(db, { name: "Carlos", phone: undefined });
    const first = await savePhoto(db, storage, { kind: "lider", id: leader.id, bytes: png });
    expect(first).toMatch(new RegExp(`^lideres/${leader.id}-[0-9a-f]{8}\\.png$`));
    expect(storage.files.has(first)).toBe(true);
    expect((await listLeaders(db))[0].photoKey).toBe(first);

    const second = await savePhoto(db, storage, { kind: "lider", id: leader.id, bytes: png });
    expect(second).not.toBe(first);
    expect(storage.files.has(first)).toBe(false);
    expect(storage.files.has(second)).toBe(true);

    await removePhoto(db, storage, "lider", leader.id);
    expect((await listLeaders(db))[0].photoKey).toBeNull();
    expect(storage.files.size).toBe(0);
  });

  it("stores the profile photo in settings and never leaves old files behind", async () => {
    const key = await savePhoto(db, storage, { kind: "perfil", bytes: png });
    expect(key).toMatch(/^perfil\/avatar-[0-9a-f]{8}\.png$/);
    expect((await getSetting(db, "profile")).photoKey).toBe(key);

    const replaced = await savePhoto(db, storage, { kind: "perfil", bytes: png });
    expect(replaced).not.toBe(key);
    expect([...storage.files.keys()]).toEqual([replaced]);

    await removePhoto(db, storage, "perfil");
    expect((await getSetting(db, "profile")).photoKey).toBeNull();
    expect(storage.files.size).toBe(0);
  });

  it("rejects non-images, empty files and unknown leaders", async () => {
    await expect(savePhoto(db, storage, { kind: "perfil", bytes: pdf })).rejects.toThrow("Envie uma foto");
    await expect(savePhoto(db, storage, { kind: "perfil", bytes: new Uint8Array(0) })).rejects.toThrow("vazio");
    await expect(savePhoto(db, storage, { kind: "lider", id: "nope", bytes: png })).rejects.toThrow("Líder não encontrado");
    await expect(savePhoto(db, storage, { kind: "lider", bytes: png })).rejects.toThrow("Líder não informado");
    expect(storage.files.size).toBe(0);
  });
});
