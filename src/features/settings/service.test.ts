import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { settings } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { DEFAULT_SETTINGS } from "./schema";
import { getSetting, getSettings, patchSetting, resetSetting, saveSetting } from "./service";

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe("settings", () => {
  it("returns defaults when nothing was saved", async () => {
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
  });

  it("saves, patches and resets a key", async () => {
    await saveSetting(db, "period", { firstCutDay: 1, secondCutDay: 16 });
    await patchSetting(db, "profile", { name: "Anderson" });
    const all = await getSettings(db);
    expect(all.period).toEqual({ firstCutDay: 1, secondCutDay: 16 });
    expect(all.profile).toEqual({ name: "Anderson", photoKey: null });
    expect(all.alerts).toEqual(DEFAULT_SETTINGS.alerts);
    // Formato antigo gravado antes das metas por quinzena continua valendo.
    await db.insert(settings).values({ key: "goals", value: JSON.stringify({ defaultTargetCents: 5000 }), updatedAt: "x" });
    expect((await getSettings(db)).goals).toEqual({ defaultFirstCents: 5000, defaultSecondCents: 5000, appointmentsPerWeek: null });
    await resetSetting(db, "goals");

    await patchSetting(db, "profile", { photoKey: "perfil/avatar-abc.jpg" });
    expect(await getSetting(db, "profile")).toEqual({ name: "Anderson", photoKey: "perfil/avatar-abc.jpg" });

    await resetSetting(db, "period");
    expect((await getSettings(db)).period).toEqual(DEFAULT_SETTINGS.period);
  });

  it("ignores corrupted or invalid rows instead of crashing", async () => {
    await db.insert(settings).values({ key: "period", value: "{not json", updatedAt: "x" });
    await db.insert(settings).values({ key: "alerts", value: JSON.stringify({ leadMinutes: "muitos" }), updatedAt: "x" });
    await db.insert(settings).values({ key: "unknown", value: "{}", updatedAt: "x" });
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
  });
});
