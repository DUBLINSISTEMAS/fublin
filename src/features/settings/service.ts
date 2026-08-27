import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { settings } from "@/db/schema";
import { toIso } from "@/lib/dates";
import { DEFAULT_SETTINGS, SETTINGS_SCHEMAS, type AppSettings, type SettingsKey } from "./schema";

/**
 * Lê todas as preferências. Linha ausente ou inválida cai no padrão — uma
 * preferência corrompida nunca derruba o app.
 */
export async function getSettings(db: Db): Promise<AppSettings> {
  const rows = await db.select().from(settings);
  const out: AppSettings = structuredClone(DEFAULT_SETTINGS);
  for (const row of rows) {
    const key = row.key as SettingsKey;
    const schema = SETTINGS_SCHEMAS[key];
    if (!schema) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.value);
    } catch {
      continue;
    }
    const result = schema.safeParse(parsed);
    if (result.success) Object.assign(out, { [key]: { ...out[key], ...result.data } });
  }
  return out;
}

export async function getSetting<K extends SettingsKey>(db: Db, key: K): Promise<AppSettings[K]> {
  return (await getSettings(db))[key];
}

/** Grava uma preferência inteira (upsert). */
export async function saveSetting<K extends SettingsKey>(db: Db, key: K, value: AppSettings[K], now: Date = new Date()): Promise<void> {
  const row = { key, value: JSON.stringify(value), updatedAt: toIso(now) };
  await db
    .insert(settings)
    .values(row)
    .onConflictDoUpdate({ target: settings.key, set: { value: row.value, updatedAt: row.updatedAt } });
}

/** Atualiza só alguns campos de uma preferência. */
export async function patchSetting<K extends SettingsKey>(db: Db, key: K, patch: Partial<AppSettings[K]>, now: Date = new Date()): Promise<AppSettings[K]> {
  const current = await getSetting(db, key);
  const next = { ...current, ...patch };
  await saveSetting(db, key, next, now);
  return next;
}

export async function resetSetting(db: Db, key: SettingsKey): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}
