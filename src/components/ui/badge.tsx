import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONE,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_TONE,
  type AppointmentStatus,
  type ClientStatus,
  type Tone,
} from "@/lib/domain";

const TONES: Record<Tone, string> = {
  neutral: "bg-stone-100 text-stone-700",
  info: "bg-sky-50 text-sky-800",
  accent: "bg-accent-soft text-accent-ink",
  warning: "bg-amber-50 text-amber-800",
  success: "bg-emerald-50 text-emerald-800",
  danger: "bg-rose-50 text-rose-800",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-stone-400",
  info: "bg-sky-500",
  accent: "bg-accent",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  danger: "bg-rose-500",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap", TONES[tone], className)}>
      <span className={cn("size-1.5 rounded-full", DOTS[tone])} aria-hidden />
      {children}
    </span>
  );
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
