import type { AppointmentStatus } from "@/lib/domain";

/** Como um agendamento é destacado: "agora" (azul-claro), atrasado, concluído ou normal. */
export type AppointmentVariant = "now" | "default" | "overdue" | "done";

/** Variante de um agendamento fora da janela "agora": concluído, atrasado ou normal. */
export function variantFor(status: AppointmentStatus, when: Date, now: Date): AppointmentVariant {
  if (status !== "agendado") return "done";
  return when < now ? "overdue" : "default";
}
