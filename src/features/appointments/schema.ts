import { z } from "zod";
import { isValidDayKey, isValidTime } from "@/lib/dates";
import { APPOINTMENT_KINDS, APPOINTMENT_STATUSES, DEFAULT_DURATION_MINUTES, DEFAULT_REMINDER_MINUTES } from "@/lib/domain";
import { optionalString } from "@/lib/validation";

export const appointmentInputSchema = z.object({
  clientId: z.string().min(1, "Escolha o cliente"),
  day: z.string().refine(isValidDayKey, "Data inválida"),
  time: z.string().refine(isValidTime, "Horário inválido"),
  kind: z.enum(APPOINTMENT_KINDS, { error: "Escolha o tipo" }),
  durationMinutes: z.coerce.number().int().min(5, "Mínimo de 5 minutos").max(480, "Máximo de 8 horas").default(DEFAULT_DURATION_MINUTES),
  reminderMinutes: z.coerce.number().int().min(0).max(10080).default(DEFAULT_REMINDER_MINUTES),
  notes: optionalString(z.string().trim().max(500, "Máximo de 500 caracteres")),
});

export type AppointmentInput = z.output<typeof appointmentInputSchema>;

export const appointmentStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(APPOINTMENT_STATUSES, { error: "Status inválido" }),
});
