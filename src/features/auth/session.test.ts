import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { createClient } from "@/features/clients/service";
import { clientInputSchema } from "@/features/clients/schema";
import { createLeader } from "@/features/leaders/service";
import { assertClientAccess, canAccessClient } from "./session";
import { createUser } from "./service";

const base = clientInputSchema.parse({ name: "Ana Souza", phone: "11987654321", interest: "imovel" });

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe("canAccessClient", () => {
  it("lets the admin see everyone and a leader only their own clients", async () => {
    const carlos = await createLeader(db, { name: "Carlos", phone: undefined });
    const bia = await createLeader(db, { name: "Bia", phone: undefined });
    const admin = await createUser(db, { name: "Anderson", login: "anderson", password: "segredo123", role: "admin", leaderId: undefined });
    const leader = await createUser(db, { name: "Carlos", login: "carlos", password: "segredo123", role: "leader", leaderId: carlos.id });
    expect(canAccessClient(admin, bia.id)).toBe(true);
    expect(canAccessClient(admin, null)).toBe(true);
    expect(canAccessClient(leader, carlos.id)).toBe(true);
    expect(canAccessClient(leader, bia.id)).toBe(false);
    expect(canAccessClient(leader, null)).toBe(false);
  });
});

describe("assertClientAccess", () => {
  it("throws for another leader's client and for a missing client, and passes for the owner", async () => {
    const carlos = await createLeader(db, { name: "Carlos", phone: undefined });
    const bia = await createLeader(db, { name: "Bia", phone: undefined });
    const leader = await createUser(db, { name: "Carlos", login: "carlos", password: "segredo123", role: "leader", leaderId: carlos.id });
    const mine = await createClient(db, { ...base, leaderId: carlos.id });
    const theirs = await createClient(db, { ...base, phone: "11987654322", leaderId: bia.id });
    await expect(assertClientAccess(db, leader, mine.id)).resolves.toBeUndefined();
    await expect(assertClientAccess(db, leader, theirs.id)).rejects.toThrow("Você não tem acesso a este cliente.");
    await expect(assertClientAccess(db, leader, "nope")).rejects.toThrow("Você não tem acesso a este cliente.");
  });
});
