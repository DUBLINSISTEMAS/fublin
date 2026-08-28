import { z } from "zod";
import { DEFAULT_REMINDER_MINUTES } from "@/lib/domain";
import { DEFAULT_CUTS, type PeriodCuts } from "@/lib/quinzena";
import { DEFAULT_SOUND, SOUND_IDS } from "@/lib/sounds";
import { checkboxField, moneyField, optionalString } from "@/lib/validation";

/** Quem usa o app: nome e foto no topo da sidebar. */
export const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(60, "Nome muito longo"),
  photoKey: z.string().max(200).nullable().default(null),
});
export type ProfileSettings = z.output<typeof profileSchema>;

/** Dias de corte das quinzenas (a 1ª começa no 1º corte, a 2ª no 2º), em qualquer ordem. */
export const periodSettingsSchema = z
  .object({
    firstCutDay: z.coerce.number().int().min(1).max(31),
    secondCutDay: z.coerce.number().int().min(1).max(31),
  })
  .refine((v) => v.firstCutDay !== v.secondCutDay, { message: "Os dois cortes precisam ser dias diferentes", path: ["secondCutDay"] });
export type PeriodSettings = z.output<typeof periodSettingsSchema>;

const DAY = z.coerce.number({ error: "Informe o dia" }).int().min(1, "Entre 1 e 31").max(31, "Entre 1 e 31");

/** "1ª quinzena do dia X ao dia Y" (fim inclusivo) → cortes. A 2ª é o resto: de Y+1 até X−1. */
export function cutsFromRange(firstStart: number, firstEnd: number): PeriodCuts {
  return { firstCutDay: firstStart, secondCutDay: firstEnd >= 31 ? 1 : firstEnd + 1 };
}

/** Inverso: cortes → "do dia X ao dia Y" da 1ª quinzena. */
export function rangeFromCuts(cuts: PeriodCuts): { firstStart: number; firstEnd: number } {
  return { firstStart: cuts.firstCutDay, firstEnd: cuts.secondCutDay === 1 ? 31 : cuts.secondCutDay - 1 };
}

/** Formulário das quinzenas: aceita qualquer ordem (5→19, 20→4, 1→15…). */
export const periodFormSchema = z
  .object({ firstStart: DAY, firstEnd: DAY })
  .refine((v) => v.firstStart !== v.firstEnd, { message: "A quinzena precisa ter mais de um dia", path: ["firstEnd"] })
  .refine((v) => cutsFromRange(v.firstStart, v.firstEnd).secondCutDay !== v.firstStart, { message: "Assim a 2ª quinzena ficaria vazia", path: ["firstEnd"] })
  .transform((v) => cutsFromRange(v.firstStart, v.firstEnd));

/** Valores antigos (`true`/`false`) viram o som padrão / "off". */
const soundField = z.preprocess((v) => (v === true || v === "on" ? DEFAULT_SOUND : v === false ? "off" : v), z.enum(SOUND_IDS));

/** Alertas de agendamento: antecedência padrão, repetição, som e o "pop" do kanban. */
export const alertSettingsSchema = z.object({
  leadMinutes: z.coerce.number().int().min(0).max(1440).default(DEFAULT_REMINDER_MINUTES),
  /** 0 = avisa uma vez; senão repete a cada N minutos até você dispensar. */
  repeatMinutes: z.coerce.number().int().min(0).max(60).default(2),
  sound: soundField.default(DEFAULT_SOUND),
  /** Sonzinho ao mover um card de etapa no funil. */
  kanbanSound: checkboxField.default(true),
});
export type AlertSettings = z.output<typeof alertSettingsSchema>;

/**
 * Metas padrão: uma para cada quinzena (a 1ª e a 2ª costumam ser diferentes) e a de
 * agendamentos por semana. Valores antigos com `defaultTargetCents` valem para as duas.
 */
export const goalSettingsSchema = z.preprocess(
  (v) => {
    if (v && typeof v === "object" && "defaultTargetCents" in v && !("defaultFirstCents" in v)) {
      const legacy = (v as { defaultTargetCents: number | null }).defaultTargetCents;
      return { ...v, defaultFirstCents: legacy, defaultSecondCents: legacy };
    }
    return v;
  },
  z.object({
    defaultFirstCents: z.number().int().nullable().default(null),
    defaultSecondCents: z.number().int().nullable().default(null),
    appointmentsPerWeek: z.number().int().min(0).max(500).nullable().default(null),
  }),
);
export type GoalSettings = z.output<typeof goalSettingsSchema>;

/** Formulário das metas padrão. */
export const goalSettingsFormSchema = z
  .object({
    defaultFirst: moneyField,
    defaultSecond: moneyField,
    appointmentsPerWeek: optionalString(z.coerce.number({ error: "Informe um número" }).int().min(0, "Mínimo 0").max(500, "Máximo 500")),
  })
  .transform((v) => ({ defaultFirstCents: v.defaultFirst, defaultSecondCents: v.defaultSecond, appointmentsPerWeek: v.appointmentsPerWeek ?? null }));

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
  alerts: { leadMinutes: DEFAULT_REMINDER_MINUTES, repeatMinutes: 2, sound: DEFAULT_SOUND, kanbanSound: true },
  goals: { defaultFirstCents: null, defaultSecondCents: null, appointmentsPerWeek: null },
  commission: { ratePercent: DEFAULT_COMMISSION_PERCENT },
};

/** Só o nome vem do formulário; a foto é trocada pelo upload. */
export const profileFormSchema = z.object({ name: profileSchema.shape.name, photoKey: optionalString(z.string().max(200)) });
