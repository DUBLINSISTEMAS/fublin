import { z } from "zod";
import { DEFAULT_REMINDER_MINUTES } from "@/lib/domain";
import { DEFAULT_CUTS, type PeriodCuts } from "@/lib/quinzena";
import { DEFAULT_SOUND, SOUND_IDS } from "@/lib/sounds";
import { moneyField, optionalString } from "@/lib/validation";

/** Quem usa o app: nome e foto no topo da sidebar. */
export const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(60, "Nome muito longo"),
  photoKey: z.string().max(200).nullable().default(null),
});
export type ProfileSettings = z.output<typeof profileSchema>;

/** Dias de corte das quinzenas (a 1ª começa no 1º corte, a 2ª no 2º). Guardado assim; o formulário fala em "do dia X ao dia Y". */
export const periodSettingsSchema = z
  .object({
    firstCutDay: z.coerce.number().int().min(1).max(28),
    secondCutDay: z.coerce.number().int().min(1).max(28),
  })
  .refine((v) => v.firstCutDay < v.secondCutDay, { message: "O 1º corte precisa vir antes do 2º dentro do mês", path: ["secondCutDay"] });
export type PeriodSettings = z.output<typeof periodSettingsSchema>;

/** Formulário: "1ª quinzena do dia X ao dia Y" → a 2ª vai de Y+1 até X−1 do mês seguinte. */
export const periodFormSchema = z
  .object({
    firstStart: z.coerce.number({ error: "Informe o dia" }).int().min(1, "Entre 1 e 27").max(27, "Entre 1 e 27"),
    firstEnd: z.coerce.number({ error: "Informe o dia" }).int().min(2, "Entre 2 e 27").max(27, "Entre 2 e 27"),
  })
  .refine((v) => v.firstStart < v.firstEnd, { message: "A 1ª quinzena precisa terminar depois de começar", path: ["firstEnd"] })
  .transform((v) => cutsFromRange(v.firstStart, v.firstEnd));

export function cutsFromRange(firstStart: number, firstEnd: number): PeriodCuts {
  return { firstCutDay: firstStart, secondCutDay: firstEnd + 1 };
}

/** Inverso: cortes → "do dia X ao dia Y" da 1ª quinzena. */
export function rangeFromCuts(cuts: PeriodCuts): { firstStart: number; firstEnd: number } {
  return { firstStart: cuts.firstCutDay, firstEnd: cuts.secondCutDay - 1 };
}

/** Valores antigos (`true`/`false`) viram o som padrão / "off". */
const soundField = z.preprocess((v) => (v === true || v === "on" ? DEFAULT_SOUND : v === false ? "off" : v), z.enum(SOUND_IDS));

/** Alertas de agendamento: antecedência padrão, repetição e som. */
export const alertSettingsSchema = z.object({
  leadMinutes: z.coerce.number().int().min(0).max(1440).default(DEFAULT_REMINDER_MINUTES),
  /** 0 = avisa uma vez; senão repete a cada N minutos até você dispensar. */
  repeatMinutes: z.coerce.number().int().min(0).max(60).default(2),
  sound: soundField.default(DEFAULT_SOUND),
});
export type AlertSettings = z.output<typeof alertSettingsSchema>;

/** Meta padrão para quinzenas sem meta própria. */
export const goalSettingsSchema = z.object({
  defaultTargetCents: moneyField,
});
export type GoalSettings = z.output<typeof goalSettingsSchema>;

/** Formulário da meta padrão usa o nome de campo "defaultTarget". */
export const goalSettingsFormSchema = z.object({ defaultTarget: moneyField }).transform((v) => ({ defaultTargetCents: v.defaultTarget }));

export const DEFAULT_COMMISSION_PERCENT = 0.4;

/** Comissão do relacionador sobre cada carta fechada, em % (0,4 = 0,4%). */
export const commissionSettingsSchema = z.object({
  ratePercent: z.number().min(0).max(10).default(DEFAULT_COMMISSION_PERCENT),
});
export type CommissionSettings = z.output<typeof commissionSettingsSchema>;

/** Formulário aceita "0,4" ou "0.4". */
export const commissionFormSchema = z.object({
  ratePercent: z
    .string()
    .trim()
    .min(1, "Informe a porcentagem")
    .transform((v) => Number(v.replace(",", ".")))
    .refine((n) => Number.isFinite(n) && n >= 0 && n <= 10, "Use um valor entre 0 e 10"),
});

export const SETTINGS_SCHEMAS = {
  profile: profileSchema,
  period: periodSettingsSchema,
  alerts: alertSettingsSchema,
  goals: goalSettingsSchema,
  commission: commissionSettingsSchema,
} as const;
export type SettingsKey = keyof typeof SETTINGS_SCHEMAS;

export type AppSettings = {
  profile: ProfileSettings;
  period: PeriodSettings;
  alerts: AlertSettings;
  goals: GoalSettings;
  commission: CommissionSettings;
};

export const DEFAULT_SETTINGS: AppSettings = {
  profile: { name: "Relacionador", photoKey: null },
  period: { ...DEFAULT_CUTS },
  alerts: { leadMinutes: DEFAULT_REMINDER_MINUTES, repeatMinutes: 2, sound: DEFAULT_SOUND },
  goals: { defaultTargetCents: null },
  commission: { ratePercent: DEFAULT_COMMISSION_PERCENT },
};

/** Só o nome vem do formulário; a foto é trocada pelo upload. */
export const profileFormSchema = z.object({ name: profileSchema.shape.name, photoKey: optionalString(z.string().max(200)) });
