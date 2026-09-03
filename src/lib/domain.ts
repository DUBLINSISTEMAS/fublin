/**
 * Vocabulário do domínio: enums, rótulos em pt-BR e tons visuais.
 * Única fonte de verdade — DB, validação e UI importam daqui.
 */

export type Tone = "neutral" | "info" | "accent" | "warning" | "success" | "danger";

export const INTERESTS = ["imovel", "automovel", "moto", "reforma", "servicos", "pesados", "outro"] as const;
export type Interest = (typeof INTERESTS)[number];
export const INTEREST_LABELS: Record<Interest, string> = {
  imovel: "Imóvel",
  automovel: "Automóvel",
  moto: "Moto",
  reforma: "Reforma",
  servicos: "Serviços",
  pesados: "Pesados",
  outro: "Outro",
};
/** Interesse personalizado: "Outro" com detalhe vira o próprio detalhe ("Investimento", "Terreno"). */
export function describeInterest(interest: Interest, notes: string | null | undefined): string {
  const custom = notes?.trim();
  return interest === "outro" && custom ? custom : INTEREST_LABELS[interest];
}

/**
 * Funil do cliente, na ordem da rotina do relacionador:
 * cadastra → marca → o líder atende (presencial ou online) → pode voltar para
 * novas reuniões → a proposta vai para análise → aprova → fecha (ou perde).
 */
export const CLIENT_STATUSES = ["novo", "agendado", "atendido", "negociando", "analise", "aprovado", "fechou", "perdido"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  novo: "Novo",
  agendado: "Agendado",
  atendido: "Atendido",
  negociando: "Em negociação",
  analise: "Em análise",
  aprovado: "Aprovado",
  fechou: "Fechou",
  perdido: "Perdido",
};
export const CLIENT_STATUS_HINTS: Record<ClientStatus, string> = {
  novo: "Cadastrado, ainda sem agendamento.",
  agendado: "Visita ou reunião marcada.",
  atendido: "Já conversou com o líder de vendas.",
  negociando: "Voltou para nova reunião ou ajuste de proposta.",
  analise: "Documentação enviada para análise.",
  aprovado: "Crédito aprovado — informe a adesão.",
  fechou: "Contrato fechado.",
  perdido: "Desistiu ou foi reprovado.",
};
export const CLIENT_STATUS_TONE: Record<ClientStatus, Tone> = {
  novo: "neutral",
  agendado: "info",
  atendido: "accent",
  negociando: "warning",
  analise: "warning",
  aprovado: "success",
  fechou: "success",
  perdido: "danger",
};
/** Status considerados "em aberto" (ainda podem virar venda). */
export const OPEN_CLIENT_STATUSES: readonly ClientStatus[] = ["novo", "agendado", "atendido", "negociando", "analise", "aprovado"];
/** Colunas do kanban (perdido fica fora, como zona de descarte). */
export const PIPELINE_STATUSES: readonly ClientStatus[] = ["novo", "agendado", "atendido", "negociando", "analise", "aprovado", "fechou"];
/** Ordem numérica do funil, para saber se um status é "depois" de outro. */
export const STATUS_RANK: Record<ClientStatus, number> = Object.fromEntries(CLIENT_STATUSES.map((s, i) => [s, i])) as Record<ClientStatus, number>;

export const ATTENDANCES = ["presencial", "online"] as const;
export type Attendance = (typeof ATTENDANCES)[number];
export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  presencial: "Presencial",
  online: "Online",
};
/** Agendar no cadastro: presencial marca visita à loja, online marca reunião online. */
export const ATTENDANCE_APPOINTMENT_KIND: Record<Attendance, AppointmentKind> = {
  presencial: "visita",
  online: "reuniao",
};

export const SOURCES = ["indicacao", "redes_sociais", "telefone", "abordagem", "outro"] as const;
export type Source = (typeof SOURCES)[number];
export const SOURCE_LABELS: Record<Source, string> = {
  indicacao: "Indicação",
  redes_sociais: "Redes sociais",
  telefone: "Telefone",
  abordagem: "Abordagem",
  outro: "Outro",
};

export const APPOINTMENT_KINDS = ["visita", "reuniao", "ligacao", "retorno"] as const;
export type AppointmentKind = (typeof APPOINTMENT_KINDS)[number];
export const APPOINTMENT_KIND_LABELS: Record<AppointmentKind, string> = {
  visita: "Visita à loja",
  reuniao: "Reunião online",
  ligacao: "Ligação",
  retorno: "Retorno",
};
/** Versão curta para colunas estreitas. */
export const APPOINTMENT_KIND_SHORT: Record<AppointmentKind, string> = {
  visita: "Visita",
  reuniao: "Online",
  ligacao: "Ligação",
  retorno: "Retorno",
};
/** Tipos que contam como "o líder atendeu o cliente". */
export const ATTENDANCE_KINDS: readonly AppointmentKind[] = ["visita", "reuniao"];
/** Cor de cada tipo (chips, blocos da agenda, filtros). */
export const APPOINTMENT_KIND_TONE: Record<AppointmentKind, Tone> = {
  visita: "accent",
  reuniao: "info",
  ligacao: "success",
  retorno: "warning",
};

/** Duração prevista do agendamento (bloco na grade da agenda). */
export const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 horas" },
] as const;
export const DEFAULT_DURATION_MINUTES = 60;
/** Duração sugerida por tipo, quando o usuário não escolhe. */
export const DEFAULT_DURATION_BY_KIND: Record<AppointmentKind, number> = {
  visita: 60,
  reuniao: 45,
  ligacao: 15,
  retorno: 30,
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

export const ACTIVITY_TYPES = ["nota", "status", "agendamento", "cliente", "anexo", "lider"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/**
 * Quem entra no sistema: o dono (administrador) vê tudo; o líder vê somente
 * os clientes atribuídos a ele. Única fonte — DB, Zod e navegação importam daqui.
 */
export const USER_ROLES = ["admin", "leader"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  leader: "Líder",
};

export const ATTACHMENT_KINDS = ["proposta", "documento", "comprovante", "outro"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];
export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
  proposta: "Proposta",
  documento: "Documento",
  comprovante: "Comprovante",
  outro: "Outro",
};

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
