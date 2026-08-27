import type { AppointmentKind } from "@/lib/domain";

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
