import { beforeEach, describe, expect, it } from "vitest";
import { count } from "drizzle-orm";
import type { Db } from "@/db/client";
import { loginAttempts } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { ATTEMPT_WINDOW_MINUTES, clearLoginAttempts, isThrottled, LOGIN_ATTEMPT_LIMITS, loginAttemptKeys, registerLoginAttempt } from "./throttle";

let db: Db;
const now = new Date(2026, 8, 2, 10);
const later = (minutes: number) => new Date(now.getTime() + minutes * 60_000);
const rows = async () => (await db.select({ total: count() }).from(loginAttempts))[0].total;
const storedKeys = async () => (await db.select({ key: loginAttempts.key }).from(loginAttempts)).map((row) => row.key).sort();

beforeEach(async () => {
  db = await createTestDb();
});

describe("loginAttemptKeys", () => {
  it("separates the address from the login and normalizes the login", () => {
    expect(loginAttemptKeys("189.1.2.3", " ANDERSON ")).toEqual(["ip:189.1.2.3", "login:anderson"]);
  });
});

describe("login throttling", () => {
  it("lets the first attempts through and blocks once the login limit is reached", async () => {
    const keys = loginAttemptKeys("189.1.2.3", "anderson");
    for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMITS.login; attempt++) {
      expect(await isThrottled(db, keys, now)).toBe(false);
      await registerLoginAttempt(db, keys, now);
    }
    expect(await isThrottled(db, keys, now)).toBe(true);
  });

  it("blocks an address that spreads the attempts across many logins", async () => {
    const address = "189.1.2.3";
    for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMITS.ip; attempt++) {
      await registerLoginAttempt(db, loginAttemptKeys(address, `pessoa${attempt}`), now);
    }
    // Nenhum login sozinho passou do limite, mas o endereço passou.
    expect(await isThrottled(db, loginAttemptKeys(address, "pessoa0"), now)).toBe(true);
    expect(await isThrottled(db, loginAttemptKeys("189.9.9.9", "pessoa0"), now)).toBe(false);
  });

  it("starts a new window after the old one expires", async () => {
    const keys = loginAttemptKeys("189.1.2.3", "anderson");
    for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMITS.login; attempt++) await registerLoginAttempt(db, keys, now);
    expect(await isThrottled(db, keys, now)).toBe(true);
    const after = later(ATTEMPT_WINDOW_MINUTES + 1);
    expect(await isThrottled(db, keys, after)).toBe(false);
    await registerLoginAttempt(db, keys, after);
    expect(await isThrottled(db, keys, after)).toBe(false);
  });

  it("forgets the counters of a successful login", async () => {
    const keys = loginAttemptKeys("189.1.2.3", "anderson");
    for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMITS.login; attempt++) await registerLoginAttempt(db, keys, now);
    await clearLoginAttempts(db, keys);
    expect(await isThrottled(db, keys, now)).toBe(false);
    expect(await rows()).toBe(0);
  });

  it("prunes stale counters instead of growing forever", async () => {
    const old = loginAttemptKeys("189.1.2.3", "antiga");
    await registerLoginAttempt(db, old, now);
    expect(await storedKeys()).toEqual([...old].sort());

    const fresh = loginAttemptKeys("200.0.0.1", "nova");
    await registerLoginAttempt(db, fresh, later(ATTEMPT_WINDOW_MINUTES + 1));
    expect(await storedKeys()).toEqual([...fresh].sort());
  });
});
