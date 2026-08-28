"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CalendarClock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCountdown, formatWhen, fromIso } from "@/lib/dates";
import { APPOINTMENT_KIND_LABELS, type AppointmentKind } from "@/lib/domain";

const STORAGE_KEY = "relacionador:nextup";
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const readCollapsed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "collapsed";
  } catch {
    return false;
  }
};
function setCollapsed(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "collapsed" : "open");
  } catch {
    /* sem armazenamento: só nesta visita */
  }
  listeners.forEach((l) => l());
}

export type NextUp = { clientId: string; clientName: string; kind: AppointmentKind; scheduledAt: string };

type Props = { next: NextUp | null; nowIso: string };

/**
 * "Próximo" na sidebar: amarelo para chamar atenção, com contagem regressiva, e um
 * botão para recolher — quando recolhido vira uma faixa de uma linha, lembrada pelo navegador.
 */
export function NextUpCard({ next, nowIso }: Props) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [now, setNow] = useState(() => new Date(nowIso));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!next) {
    return (
      <div className="rounded-card bg-surface-2 p-4">
        <p className="text-[15px] font-medium text-ink">Agenda livre</p>
        <p className="mt-1 text-[13px] leading-snug text-muted">Nada marcado nas próximas 48 h. Que tal ligar para um cliente em aberto?</p>
        <Link href="/agenda/novo" className="mt-3 flex h-10 items-center justify-center rounded-control bg-dark text-[13px] font-medium text-white transition-colors hover:bg-dark-2">
          Agendar
        </Link>
      </div>
    );
  }

  const when = fromIso(next.scheduledAt);
  const label = `${APPOINTMENT_KIND_LABELS[next.kind]} com ${next.clientName}`;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-expanded={false}
        className="flex w-full cursor-pointer items-center gap-2 rounded-card bg-sun px-3 py-2.5 text-left text-[13px] text-sun-ink transition-colors hover:bg-sun-strong/70"
      >
        <CalendarClock className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{formatCountdown(when, now)}</span> · {next.clientName}
        </span>
        <ChevronUp className="size-4 shrink-0" aria-hidden />
      </button>
    );
  }

  return (
    <div className={cn("rounded-card bg-sun p-4 text-sun-ink")}>
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide">
          <CalendarClock className="size-4" aria-hidden />
          Próximo · {formatCountdown(when, now)}
        </p>
        <button type="button" onClick={() => setCollapsed(true)} aria-label="Recolher o próximo agendamento" aria-expanded className="-mt-1 -mr-1 grid size-7 cursor-pointer place-items-center rounded-full transition-colors hover:bg-sun-strong/70">
          <ChevronDown className="size-4" aria-hidden />
        </button>
      </div>
      <p className="mt-2 text-[15px] font-medium leading-snug">{label}</p>
      <p className="mt-0.5 text-[13px]">{formatWhen(when, now)}</p>
      <Link href={`/clientes/${next.clientId}`} className="mt-3 flex h-10 items-center justify-center rounded-control bg-dark text-[13px] font-medium text-white transition-colors hover:bg-dark-2">
        Ver cliente
      </Link>
    </div>
  );
}
