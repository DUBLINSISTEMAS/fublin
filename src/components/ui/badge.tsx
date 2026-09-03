import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  APPOINTMENT_KIND_LABELS,
  APPOINTMENT_KIND_TONE,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONE,
  ATTACHMENT_KIND_LABELS,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_TONE,
  describeInterest,
  type AppointmentKind,
  type AppointmentStatus,
  type AttachmentKind,
  type ClientStatus,
  type Interest,
  type Tone,
} from "@/lib/domain";

/* Chips pastel com texto escuro (azul, limão, amarelo…), como na referência. */
const TONES: Record<Tone, string> = {
  neutral: "bg-surface-3 text-ink-2",
  info: "bg-sky text-sky-ink",
  accent: "bg-accent text-white",
  warning: "bg-sun text-sun-ink",
  success: "bg-lime text-lime-ink",
  danger: "bg-rose text-rose-ink",
};

const INTEREST_TONE: Record<Interest, string> = {
  imovel: "bg-accent text-white",
  automovel: "bg-lime text-lime-ink",
  moto: "bg-sun text-sun-ink",
  reforma: "bg-lime-soft text-lime-ink",
  servicos: "bg-sky text-sky-ink",
  pesados: "bg-dark text-white",
  outro: "bg-surface-3 text-ink-2",
};

const ATTACHMENT_KIND_TONE: Record<AttachmentKind, string> = {
  proposta: "bg-accent text-white",
  documento: "bg-sky text-sky-ink",
  comprovante: "bg-lime text-lime-ink",
  outro: "bg-surface-3 text-ink-2",
};

type ChipProps = { children: ReactNode; className?: string; /** Tooltip: o texto por extenso quando o chip mostra a forma curta. */ title?: string };

export function Chip({ className, children, title }: ChipProps) {
  return (
    <span className={cn("inline-flex h-7 items-center rounded-chip px-2.5 text-[13px] font-medium whitespace-nowrap", className)} title={title}>
      {children}
    </span>
  );
}

export function Badge({ tone = "neutral", children, className }: { tone?: Tone } & ChipProps) {
  return <Chip className={cn(TONES[tone], className)}>{children}</Chip>;
}

export function ClientStatusBadge({ status, className }: { status: ClientStatus; className?: string }) {
  return (
    <Badge tone={CLIENT_STATUS_TONE[status]} className={className}>
      {CLIENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function AppointmentStatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  return (
    <Badge tone={APPOINTMENT_STATUS_TONE[status]} className={className}>
      {APPOINTMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

/** `notes` deixa "Outro" mostrar o interesse personalizado ("Investimento"). */
export function InterestChip({ interest, notes, className }: { interest: Interest; notes?: string | null; className?: string }) {
  return <Chip className={cn(INTEREST_TONE[interest], "max-w-44 truncate", className)}>{describeInterest(interest, notes)}</Chip>;
}

export function AppointmentKindChip({ kind, className }: { kind: AppointmentKind; className?: string }) {
  return <Chip className={cn(TONES[APPOINTMENT_KIND_TONE[kind]], className)}>{APPOINTMENT_KIND_LABELS[kind]}</Chip>;
}

export function AttachmentKindChip({ kind, className }: { kind: AttachmentKind; className?: string }) {
  return <Chip className={cn(ATTACHMENT_KIND_TONE[kind], className)}>{ATTACHMENT_KIND_LABELS[kind]}</Chip>;
}

/** Contador redondo escuro ao lado de títulos de coluna. */
export function CountBadge({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-grid h-7 min-w-7 place-items-center rounded-full bg-dark px-2 text-[12px] font-medium tabular-nums text-white", className)}>
      {value}
    </span>
  );
}
