import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "./client";
import { leaders } from "./schema";

const globalRef = globalThis as unknown as { __relacionadorDb?: unknown };

describe("getDb", () => {
  afterEach(() => {
    globalRef.__relacionadorDb = undefined;
    delete process.env.DATABASE_URL;
  });

  it("honours DATABASE_URL, migrates once and memoizes the connection", async () => {
    process.env.DATABASE_URL = ":memory:";
    const [a, b] = await Promise.all([getDb(), getDb()]);
    expect(a).toBe(b);
    expect(await a.select().from(leaders)).toEqual([]);
  });

  it("drops the cached promise when bootstrap fails so the next call can retry", async () => {
    process.env.DATABASE_URL = "file:/definitely/not/a/dir/x.db?mode=ro";
    await expect(getDb()).rejects.toThrow();
    expect(globalRef.__relacionadorDb).toBeUndefined();
  });
});
