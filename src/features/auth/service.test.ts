import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { createLeader } from "@/features/leaders/service";
import { authenticate, createFirstAdmin, createSession, createUser, deleteSession, hasUsers, setUserActive, userFromSession } from "./service";

let db: Db;
const now = new Date(2026, 8, 2, 10);

beforeEach(async () => { db = await createTestDb(); });

describe("authentication", () => {
  it("bootstraps only one administrator and never exposes the password hash", async () => {
    expect(await hasUsers(db)).toBe(false);
    const admin = await createFirstAdmin(db, { name: "Anderson", login: "anderson", password: "segredo123" }, now);
    expect(admin).not.toHaveProperty("passwordHash");
    expect(await hasUsers(db)).toBe(true);
    await expect(createFirstAdmin(db, { name: "Outro", login: "outro", password: "segredo123" }, now)).rejects.toThrow("já foi criado");
  });

  it("authenticates, creates an opaque session and invalidates it on logout", async () => {
    const admin = await createFirstAdmin(db, { name: "Anderson", login: "ANDERSON", password: "segredo123" }, now);
    expect((await authenticate(db, { login: "anderson", password: "segredo123" }))?.id).toBe(admin.id);
    expect(await authenticate(db, { login: "anderson", password: "errada123" })).toBeNull();
    const session = await createSession(db, admin.id, now);
    expect(session.token.length).toBeGreaterThan(30);
    expect((await userFromSession(db, session.token, now))?.name).toBe("Anderson");
    await deleteSession(db, session.token);
    expect(await userFromSession(db, session.token, now)).toBeNull();
  });

  it("temporarily locks an account after repeated invalid passwords", async () => {
    await createFirstAdmin(db, { name: "Anderson", login: "anderson", password: "segredo123" }, now);
    for (let attempt = 0; attempt < 5; attempt++) {
      expect(await authenticate(db, { login: "anderson", password: "incorreta" }, now)).toBeNull();
    }
    expect(await authenticate(db, { login: "anderson", password: "segredo123" }, now)).toBeNull();
    const later = new Date(now.getTime() + 16 * 60_000);
    expect((await authenticate(db, { login: "anderson", password: "segredo123" }, later))?.login).toBe("anderson");
  });

  it("links a leader account and revokes every session when it is disabled", async () => {
    const admin = await createFirstAdmin(db, { name: "Anderson", login: "anderson", password: "segredo123" }, now);
    const leader = await createLeader(db, { name: "Carlos", phone: undefined }, now);
    const user = await createUser(db, { name: "Carlos", login: "carlos", password: "segredo123", role: "leader", leaderId: leader.id }, now);
    const session = await createSession(db, user.id, now);
    await setUserActive(db, user.id, false, admin.id, now);
    expect(await userFromSession(db, session.token, now)).toBeNull();
    await expect(setUserActive(db, admin.id, false, admin.id, now)).rejects.toThrow("próprio acesso");
  });
});
