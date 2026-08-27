import { z } from "zod";
import { DEFAULT_REMINDER_MINUTES } from "@/lib/domain";
import { DEFAULT_CUTS } from "@/lib/quinzena";
import { checkboxField, moneyField, optionalString } from "@/lib/validation";

/** Quem usa o app: nome e foto no topo da sidebar. */
export const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(60, "Nome muito longo"),
  photoKey: z.string().max(200).nullable().default(null),
});
export type ProfileSettings = z.output<typeof profileSchema>;

/** Dias de corte das quinzenas (a 1ª começa no 1º corte, a 2ª no 2º). */
export const periodSettingsSchema = z
  .object({
    firstCutDay: z.coerce.number({ error: "Informe o dia" }).int().min(1, "Entre 1 e 28").max(28, "Entre 1 e 28"),
    secondCutDay: z.coerce.number({ error: "Informe o dia" }).int().min(1, "Entre 1 e 28").max(28, "Entre 1 e 28"),
  })
  .refine((v) => v.firstCutDay < v.secondCutDay, { message: "O 1º corte precisa vir antes do 2º dentro do mês", path: ["secondCutDay"] });
export type PeriodSettings = z.output<typeof periodSettingsSchema>;

/** Alertas de agendamento: antecedência padrão, repetição e som. */
export const alertSettingsSchema = z.object({
  leadMinutes: z.coerce.number().int().min(0).max(1440).default(DEFAULT_REMINDER_MINUTES),
  /** 0 = avisa uma vez; senão repete a cada N minutos até você dispensar. */
  repeatMinutes: z.coerce.number().int().min(0).max(60).default(2),
  sound: checkboxField.default(true),
});
export type AlertSettings = z.output<typeof alertSettingsSchema>;

/** Meta padrão para quinzenas sem meta própria. */
export const goalSettingsSchema = z.object({
  defaultTargetCents: moneyField,
});
export type GoalSettings = z.output<typeof goalSettingsSchema>;

/** Formulário da meta padrão usa o nome de campo "defaultTarget". */
export const goalSettingsFormSchema = z.object({ defaultTarget: moneyField }).transform((v) => ({ defaultTargetCents: v.defaultTarget }));

export const SETTINGS_SCHEMAS = {
  profile: profileSchema,
  period: periodSettingsSchema,
  alerts: alertSettingsSchema,
  goals: goalSettingsSchema,
} as const;
export type SettingsKey = keyof typeof SETTINGS_SCHEMAS;

export type AppSettings = {
  profile: ProfileSettings;
  period: PeriodSettings;
  alerts: AlertSettings;
  goals: GoalSettings;
};

export const DEFAULT_SETTINGS: AppSettings = {
  profile: { name: "Relacionador", photoKey: null },
  period: { ...DEFAULT_CUTS },
  alerts: { leadMinutes: DEFAULT_REMINDER_MINUTES, repeatMinutes: 2, sound: true },
  goals: { defaultTargetCents: null },
};

/** Só o nome vem do formulário; a foto é trocada pelo upload. */
export const profileFormSchema = z.object({ name: profileSchema.shape.name, photoKey: optionalString(z.string().max(200)) });
