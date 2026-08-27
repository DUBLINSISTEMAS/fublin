/**
 * Vocabulário do domínio: enums, rótulos em pt-BR e tons visuais.
 * Única fonte de verdade — DB, validação e UI importam daqui.
 */

export type Tone = "neutral" | "info" | "accent" | "warning" | "success" | "danger";

export const INTERESTS = ["imovel", "automovel", "moto", "servicos", "pesados", "outro"] as const;
export type Interest = (typeof INTERESTS)[number];
export const INTEREST_LABELS: Record<Interest, string> = {
  imovel: "Imóvel",
  automovel: "Automóvel",
  moto: "Moto",
  servicos: "Serviços",
  pesados: "Pesados",
  outro: "Outro",
};

export const CLIENT_STATUSES = ["novo", "agendado", "visitou", "negociando", "fechou", "perdido"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  novo: "Novo",
  agendado: "Agendado",
  visitou: "Visitou a loja",
  negociando: "Em negociação",
  fechou: "Fechou",
  perdido: "Perdido",
};
export const CLIENT_STATUS_TONE: Record<ClientStatus, Tone> = {
  novo: "neutral",
  agendado: "info",
  visitou: "accent",
  negociando: "warning",
  fechou: "success",
  perdido: "danger",
};
/** Status considerados "em aberto" (ainda podem virar venda). */
export const OPEN_CLIENT_STATUSES: readonly ClientStatus[] = ["novo", "agendado", "visitou", "negociando"];

export const SOURCES = ["indicacao", "redes_sociais", "telefone", "abordagem", "outro"] as const;
export type Source = (typeof SOURCES)[number];
export const SOURCE_LABELS: Record<Source, string> = {
  indicacao: "Indicação",
  redes_sociais: "Redes sociais",
  telefone: "Telefone",
  abordagem: "Abordagem",
  outro: "Outro",
};

export const APPOINTMENT_KINDS = ["visita", "ligacao", "retorno"] as const;
export type AppointmentKind = (typeof APPOINTMENT_KINDS)[number];
export const APPOINTMENT_KIND_LABELS: Record<AppointmentKind, string> = {
  visita: "Visita à loja",
  ligacao: "Ligação",
  retorno: "Retorno",
};
/** Versão curta para colunas estreitas. */
export const APPOINTMENT_KIND_SHORT: Record<AppointmentKind, string> = {
  visita: "Visita",
  ligacao: "Ligação",
  retorno: "Retorno",
};

export const APPOINTMENT_STATUSES = ["agendado", "realizado", "faltou", "cancelado"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  agendado: "Agendado",
  realizado: "Realizado",
  faltou: "Faltou",
  cancelado: "Cancelado",
};
export const APPOINTMENT_STATUS_TONE: Record<AppointmentStatus, Tone> = {
  agendado: "info",
  realizado: "success",
  faltou: "danger",
  cancelado: "neutral",
};

export const ACTIVITY_TYPES = ["nota", "status", "agendamento", "cliente"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const REMINDER_OPTIONS = [
  { value: 0, label: "Na hora" },
  { value: 15, label: "15 min antes" },
  { value: 30, label: "30 min antes" },
  { value: 60, label: "1 hora antes" },
  { value: 120, label: "2 horas antes" },
  { value: 1440, label: "1 dia antes" },
] as const;
export const DEFAULT_REMINDER_MINUTES = 30;

export function labelOf<K extends string>(labels: Record<K, string>, value: K | null | undefined): string {
  return value ? labels[value] : "—";
}
