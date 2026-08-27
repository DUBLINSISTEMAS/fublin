import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { IDLE } from "@/lib/result";
import { listLeaders } from "./service";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db/client")>();
  return { ...actual, getDb: async () => state.db as Db };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createLeaderAction, toggleLeaderAction, updateLeaderAction } from "./actions";

function fd(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  state.db = db;
});

describe("leader actions", () => {
  it("creates, updates and toggles", async () => {
    expect((await createLeaderAction(IDLE, fd({ name: " " }))).status).toBe("error");
    expect((await createLeaderAction(IDLE, fd({ name: "Carlos", phone: "" }))).status).toBe("success");
    const [carlos] = await listLeaders(db);

    expect((await updateLeaderAction(carlos.id, IDLE, fd({ name: "Carlos M.", phone: "11 9" }))).status).toBe("success");
    expect((await updateLeaderAction("nope", IDLE, fd({ name: "X" }))).status).toBe("error");

    await toggleLeaderAction(fd({ id: carlos.id, active: "false" }));
    expect(await listLeaders(db)).toHaveLength(0);
    await toggleLeaderAction(fd({ id: carlos.id, active: "maybe" })); // ignorado
    await toggleLeaderAction(fd({ id: carlos.id, active: "true" }));
    expect((await listLeaders(db)).map((l) => l.name)).toEqual(["Carlos M."]);
  });
});
