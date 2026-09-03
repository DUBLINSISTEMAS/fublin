import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { createLeader } from "@/features/leaders/service";
import { authenticate, changePassword, createFirstAdmin, createSession, createUser, deleteSession, hasUsers, isLocked, listUsers, resetUserPassword, safeUser, setUserActive, unlockUser, userFromSession } from "./service";

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

  it("exposes only the fields the interface needs", async () => {
    const admin = await createFirstAdmin(db, { name: "Anderson", login: "anderson", password: "segredo123" }, now);
    expect(Object.keys(safeUser({ ...admin, passwordHash: "x", failedLoginCount: 3, lockedUntil: "2026-09-02" })).sort()).toEqual(
      ["active", "createdAt", "id", "leaderId", "login", "name", "role", "updatedAt"],
    );
  });
});

describe("password management", () => {
  const senha = (password: string) => ({ currentPassword: "segredo123", password, confirmPassword: password });

  it("changes the own password, keeps the current session and drops the others", async () => {
    const admin = await createFirstAdmin(db, { name: "Anderson", login: "anderson", password: "segredo123" }, now);
    const mine = await createSession(db, admin.id, now);
    const other = await createSession(db, admin.id, now);
    await changePassword(db, admin.id, senha("novasenha1"), mine.token, now);
    expect((await userFromSession(db, mine.token, now))?.id).toBe(admin.id);
    expect(await userFromSession(db, other.token, now)).toBeNull();
    expect(await authenticate(db, { login: "anderson", password: "segredo123" }, now)).toBeNull();
    expect((await authenticate(db, { login: "anderson", password: "novasenha1" }, now))?.id).toBe(admin.id);
  });

  it("refuses to change the password without the current one", async () => {
    const admin = await createFirstAdmin(db, { name: "Anderson", login: "anderson", password: "segredo123" }, now);
    await expect(changePassword(db, admin.id, { ...senha("novasenha1"), currentPassword: "chutei" }, null, now)).rejects.toThrow("senha atual está incorreta");
    expect((await authenticate(db, { login: "anderson", password: "segredo123" }, now))?.id).toBe(admin.id);
  });

  it("lets the administrator reset someone else's password and revoke their sessions", async () => {
    const admin = await createFirstAdmin(db, { name: "Anderson", login: "anderson", password: "segredo123" }, now);
    const leader = await createLeader(db, { name: "Carlos", phone: undefined }, now);
    const user = await createUser(db, { name: "Carlos", login: "carlos", password: "segredo123", role: "leader", leaderId: leader.id }, now);
    const session = await createSession(db, user.id, now);
    await resetUserPassword(db, { id: user.id, password: "outrasenha1", confirmPassword: "outrasenha1" }, admin.id, now);
    expect(await userFromSession(db, session.token, now)).toBeNull();
    expect((await authenticate(db, { login: "carlos", password: "outrasenha1" }, now))?.id).toBe(user.id);
    await expect(resetUserPassword(db, { id: admin.id, password: "outrasenha1", confirmPassword: "outrasenha1" }, admin.id, now)).rejects.toThrow("Sua conta");
    await expect(resetUserPassword(db, { id: "nao-existe", password: "outrasenha1", confirmPassword: "outrasenha1" }, admin.id, now)).rejects.toThrow("não encontrado");
  });

  it("unlocks an account that hit the failure limit, without waiting out the lock", async () => {
    const admin = await createFirstAdmin(db, { name: "Anderson", login: "anderson", password: "segredo123" }, now);
    const leader = await createLeader(db, { name: "Carlos", phone: undefined }, now);
    const user = await createUser(db, { name: "Carlos", login: "carlos", password: "segredo123", role: "leader", leaderId: leader.id }, now);
    for (let attempt = 0; attempt < 5; attempt++) await authenticate(db, { login: "carlos", password: "incorreta" }, now);
    expect(await authenticate(db, { login: "carlos", password: "segredo123" }, now)).toBeNull();

    const locked = (await listUsers(db)).find((row) => row.id === user.id);
    expect(isLocked(locked?.lockedUntil ?? null, now)).toBe(true);
    expect(isLocked((await listUsers(db)).find((row) => row.id === admin.id)?.lockedUntil ?? null, now)).toBe(false);

    await unlockUser(db, user.id, now);
    expect((await listUsers(db)).find((row) => row.id === user.id)?.lockedUntil).toBeNull();
    expect((await authenticate(db, { login: "carlos", password: "segredo123" }, now))?.id).toBe(user.id);
    await expect(unlockUser(db, "nao-existe", now)).rejects.toThrow("não encontrado");
  });
});
