import { z } from "zod";
import { isValidDayKey } from "@/lib/dates";
import { ATTENDANCES, CLIENT_STATUSES, INTERESTS, SOURCES } from "@/lib/domain";
import { digitsOnly } from "@/lib/phone";
import { moneyField as money, optionalString } from "@/lib/validation";

export const clientInputSchema = z.object({
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
  attendance: z.enum(ATTENDANCES).default("presencial"),
  status: z.enum(CLIENT_STATUSES).default("novo"),
  source: optionalString(z.enum(SOURCES, { error: "Origem inválida" })),
  leaderId: optionalString(z.string().max(64)),
  firstVisitDay: optionalString(z.string().refine(isValidDayKey, "Data inválida")),
  notes: optionalString(z.string().trim().max(2000, "Máximo de 2000 caracteres")),
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

export const assignLeaderSchema = z.object({
  id: z.string().min(1),
  leaderId: optionalString(z.string().max(64)),
});

/** Dados da aprovação/fechamento editados na página do cliente. */
export const approvalSchema = z.object({
  id: z.string().min(1),
  credit: money,
  adesao: money,
  approvedDay: optionalString(z.string().refine(isValidDayKey, "Data inválida")),
  closedDay: optionalString(z.string().refine(isValidDayKey, "Data inválida")),
});
export type ApprovalInput = z.output<typeof approvalSchema>;
