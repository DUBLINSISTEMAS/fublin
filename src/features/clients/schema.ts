import { z } from "zod";
import { isValidDayKey, isValidTime } from "@/lib/dates";
import { ATTENDANCES, CLIENT_PRIORITIES, CLIENT_STATUSES, INTERESTS, SOURCES } from "@/lib/domain";
import { digitsOnly } from "@/lib/phone";
import { moneyField as money, optionalString } from "@/lib/validation";

const dayField = optionalString(z.string().refine(isValidDayKey, "Data inválida"));
const timeField = optionalString(z.string().refine(isValidTime, "Horário inválido"));

/**
 * Comissão desta venda em % ("0,5" ou "0.5"). "" = volta ao padrão das configurações (null);
 * ausente (importação, seed) = não mexe. Mesma distinção de `clearableDay`.
 */
const clearablePercent = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = Number(v.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 10) {
      ctx.addIssue({ code: "custom", message: "Use um valor entre 0 e 10" });
      return z.NEVER;
    }
    return n;
  })
  .optional();

export const clientInputSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome do cliente").max(120, "Nome muito longo"),
    phone: z
      .string()
      .trim()
      .max(30, "Telefone muito longo")
      .refine((v) => digitsOnly(v).length >= 10, "Informe DDD + número"),
    email: optionalString(z.email("E-mail inválido").max(120)),
    interest: z.enum(INTERESTS, { error: "Escolha o interesse" }),
    interestNotes: optionalString(z.string().trim().max(200, "Máximo de 200 caracteres")),
    credit: money,
    /** Adesão (entrada) combinada com o cliente. */
    adesao: money,
    /** Faixa de parcela que cabe no bolso: "de" e "até" (só o "até" = parcela fixa). */
    installmentMin: money,
    installmentMax: money,
    /** Comissão própria desta venda (%); "" = padrão das configurações. */
    commissionRate: clearablePercent,
    attendance: z.enum(ATTENDANCES).default("presencial"),
    status: z.enum(CLIENT_STATUSES).default("novo"),
    priority: z.enum(CLIENT_PRIORITIES).default("normal"),
    source: optionalString(z.enum(SOURCES, { error: "Origem inválida" })),
    leaderId: optionalString(z.string().max(64)),
    firstVisitDay: optionalString(z.string().refine(isValidDayKey, "Data inválida")),
    /** Quando o cliente vem: dia + hora criam (ou remarcam) o agendamento na agenda. */
    scheduleDay: dayField,
    scheduleTime: timeField,
    notes: optionalString(z.string().trim().max(2000, "Máximo de 2000 caracteres")),
  })
  .superRefine((value, ctx) => {
    if (value.interest === "outro" && !value.interestNotes) {
      ctx.addIssue({ code: "custom", path: ["interestNotes"], message: "Descreva o interesse" });
    }
    if (value.installmentMin !== null && value.installmentMax !== null && value.installmentMax < value.installmentMin) {
      ctx.addIssue({ code: "custom", path: ["installmentMax"], message: "O “até” precisa ser maior ou igual ao “de”" });
    }
    if (Boolean(value.scheduleDay) !== Boolean(value.scheduleTime)) {
      ctx.addIssue({ code: "custom", path: [value.scheduleDay ? "scheduleTime" : "scheduleDay"], message: "Informe dia e horário" });
    }
  });

export type ClientInput = z.output<typeof clientInputSchema>;

export const clientStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(CLIENT_STATUSES, { error: "Status inválido" }),
  lostReason: optionalString(z.string().trim().max(200)),
});

export const clientNoteSchema = z.object({
  id: z.string().min(1),
  content: z.string().trim().min(1, "Escreva a nota").max(2000, "Máximo de 2000 caracteres"),
});

export const clientContactSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["whatsapp", "ligacao", "email", "outro"]),
  summary: z.string().trim().min(2, "Resuma o contato").max(500, "Máximo de 500 caracteres"),
});

export const assignLeaderSchema = z.object({
  id: z.string().min(1),
  leaderId: optionalString(z.string().max(64)),
});

export const clientPrioritySchema = z.object({
  id: z.string().min(1),
  priority: z.enum(CLIENT_PRIORITIES, { error: "Prioridade inválida" }),
});

/**
 * Campo de data que o formulário sempre envia: "" (limpo pelo dono) precisa ser
 * distinguido de ausente (chamada que nem mexe na data), por isso não é `optionalString`.
 */
const clearableDay = z
  .string()
  .trim()
  .refine((v) => v === "" || isValidDayKey(v), "Data inválida")
  .optional();

/** Dados da aprovação/fechamento editados na página do cliente. */
export const approvalSchema = z.object({
  id: z.string().min(1),
  credit: money,
  adesao: money,
  approvedDay: clearableDay,
  closedDay: clearableDay,
  commissionRate: clearablePercent,
});
export type ApprovalInput = z.output<typeof approvalSchema>;
