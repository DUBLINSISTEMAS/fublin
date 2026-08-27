import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { leaderInputSchema } from "./schema";
import { createLeader, listLeaders, setLeaderActive, updateLeader } from "./service";

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe("leaders", () => {
  it("validates name", () => {
    expect(leaderInputSchema.safeParse({ name: " " }).success).toBe(false);
    expect(leaderInputSchema.parse({ name: " Carlos ", phone: "" })).toEqual({ name: "Carlos", phone: undefined });
  });
  it("creates, updates, deactivates and lists sorted", async () => {
    const z = await createLeader(db, { name: "Zeca", phone: undefined });
    await createLeader(db, { name: "Ana", phone: "11 9999" });
    expect((await listLeaders(db)).map((l) => l.name)).toEqual(["Ana", "Zeca"]);
    await updateLeader(db, z.id, { name: "Zé", phone: undefined });
    await setLeaderActive(db, z.id, false);
    expect((await listLeaders(db)).map((l) => l.name)).toEqual(["Ana"]);
    expect((await listLeaders(db, { includeInactive: true })).map((l) => l.name)).toEqual(["Ana", "Zé"]);
    await expect(updateLeader(db, "nope", { name: "X", phone: undefined })).rejects.toThrow("Líder não encontrado");
  });
});
