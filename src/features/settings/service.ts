import { eq } from "drizzle-orm";
import { settings } from "@/db/schema";
import type { DbOrTx } from "@/features/activities/service";
import { toIso } from "@/lib/dates";
import { DEFAULT_SETTINGS, SETTINGS_SCHEMAS, type AppSettings, type SettingsKey } from "./schema";

/** Preferências lidas + as chaves que estavam corrompidas e caíram no padrão. */
export type SettingsWithIssues = { settings: AppSettings; invalidKeys: SettingsKey[] };

/**
 * Lê todas as preferências. Linha ausente ou inválida cai no padrão — uma
 * preferência corrompida nunca derruba o app —, mas nunca em silêncio: o que não
 * pôde ser lido vai para o log do servidor e para `invalidKeys`.
 */
export async function getSettingsWithIssues(db: DbOrTx): Promise<SettingsWithIssues> {
  const rows = await db.select().from(settings);
  const out: AppSettings = structuredClone(DEFAULT_SETTINGS);
  const invalidKeys: SettingsKey[] = [];
  for (const row of rows) {
    const key = row.key as SettingsKey;
    const schema = SETTINGS_SCHEMAS[key];
    if (!schema) {
      console.error(`[settings] chave desconhecida "${row.key}" no banco; ignorada.`);
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.value);
    } catch (error) {
      console.error(`[settings] "${key}" não é JSON válido; usando o padrão.`, error);
      invalidKeys.push(key);
      continue;
    }
    const result = schema.safeParse(parsed);
    if (result.success) {
      Object.assign(out, { [key]: { ...out[key], ...result.data } });
      continue;
    }
    console.error(`[settings] "${key}" não passou na validação; usando o padrão.`, result.error.issues);
    invalidKeys.push(key);
  }
  return { settings: out, invalidKeys };
}

export async function getSettings(db: DbOrTx): Promise<AppSettings> {
  return (await getSettingsWithIssues(db)).settings;
}

export async function getSetting<K extends SettingsKey>(db: DbOrTx, key: K): Promise<AppSettings[K]> {
  return (await getSettings(db))[key];
}

/** Grava uma preferência inteira (upsert). */
export async function saveSetting<K extends SettingsKey>(db: DbOrTx, key: K, value: AppSettings[K], now: Date = new Date()): Promise<void> {
  const row = { key, value: JSON.stringify(value), updatedAt: toIso(now) };
  await db
    .insert(settings)
    .values(row)
    .onConflictDoUpdate({ target: settings.key, set: { value: row.value, updatedAt: row.updatedAt } });
}

/**
 * Atualiza só alguns campos de uma preferência. É um leia-altere-grave: quem
 * precisa dele atômico (a troca de foto do perfil) chama dentro de `db.transaction`.
 */
export async function patchSetting<K extends SettingsKey>(db: DbOrTx, key: K, patch: Partial<AppSettings[K]>, now: Date = new Date()): Promise<AppSettings[K]> {
  const current = await getSetting(db, key);
  const next = { ...current, ...patch };
  await saveSetting(db, key, next, now);
  return next;
}

export async function resetSetting(db: DbOrTx, key: SettingsKey): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}
