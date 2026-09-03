import type { AppointmentKind, ClientPriority } from "@/lib/domain";

/** Cor forte de cada tipo: bolinha dos filtros, borda dos blocos, pílulas do mês. */
export const KIND_DOT: Record<AppointmentKind, string> = {
  visita: "bg-accent",
  reuniao: "bg-sky-ink",
  ligacao: "bg-lime-strong",
  retorno: "bg-sun-strong",
};

export const KIND_BORDER: Record<AppointmentKind, string> = {
  visita: "border-l-accent",
  reuniao: "border-l-sky-ink",
  ligacao: "border-l-lime-strong",
  retorno: "border-l-sun-strong",
};

/** Na agenda, a borda do card responde à urgência; o tipo continua no chip/bolinha. */
export const PRIORITY_BORDER: Record<ClientPriority, string> = {
  adiavel: "border-l-line-strong",
  normal: "border-l-accent",
  alta: "border-l-sun-strong",
  urgente: "border-l-rose-ink",
};

export const PRIORITY_DOT: Record<ClientPriority, string> = {
  adiavel: "bg-line-strong",
  normal: "bg-accent",
  alta: "bg-sun-strong",
  urgente: "bg-rose-ink",
};
