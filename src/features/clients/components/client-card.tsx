"use client";

import Link from "next/link";
import { CalendarDays, MessagesSquare, Store, Video } from "lucide-react";
import { InterestChip } from "@/components/ui/badge";
import type { Leader } from "@/db/schema";
import { cn } from "@/lib/cn";
import { formatDayShort, formatRelativeDay, fromIso } from "@/lib/dates";
import { CLIENT_STATUS_LABELS, type ClientStatus } from "@/lib/domain";
import { formatBRLCompact } from "@/lib/money";
import { initials } from "@/lib/text";
import type { ClientListItem } from "../queries";
import { CardMenu } from "./card-menu";

type Props = {
  client: ClientListItem;
  now: Date;
  leaders: Pick<Leader, "id" | "name">[];
  onMove: (status: ClientStatus) => void;
  highlight?: boolean;
  dragging?: boolean;
};

/** O que vem a seguir para este cliente (rodapé do card), do mais urgente ao mais antigo. */
export function cardFooter(client: ClientListItem, now: Date): { label: string; title?: string } {
  if (client.nextAppointment) return { label: formatRelativeDay(fromIso(client.nextAppointment.scheduledAt), now), title: "Próximo agendamento" };
  if (client.status === "fechou" && client.closedAt) return { label: `Fechou ${formatDayShort(fromIso(client.closedAt))}`, title: "Fechamento" };
  if (client.status === "aprovado" && client.approvedAt) return { label: `Aprovado ${formatDayShort(fromIso(client.approvedAt))}`, title: "Aprovação" };
  if (client.firstVisitAt) return { label: `Atendido ${formatDayShort(fromIso(client.firstVisitAt))}`, title: "Primeiro atendimento" };
  return { label: "Sem agendamento" };
}

/** Card do funil: chip de interesse, nome, carta, líder, atendimentos e o que vem a seguir. */
export function ClientCard({ client, now, leaders, onMove, highlight = false, dragging = false }: Props) {
  const description = client.interestNotes ?? client.notes;
  const AttendanceIcon = client.attendance === "online" ? Video : Store;
  const footer = cardFooter(client, now);

  return (
    <article
      className={cn(
        "rounded-card p-4 shadow-card transition-shadow",
        highlight ? "bg-sky" : "bg-surface",
        dragging ? "rotate-2 shadow-float ring-2 ring-accent/40" : "hover:shadow-float",
      )}
      aria-label={`${client.name}, ${CLIENT_STATUS_LABELS[client.status]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1.5">
          <InterestChip interest={client.interest} />
          <span
            className={cn("inline-flex h-7 items-center gap-1 rounded-chip px-2 text-[12px]", highlight ? "bg-white/60 text-ink-2" : "bg-surface-2 text-muted")}
            title={client.attendance === "online" ? "Atendimento online" : "Atendimento presencial"}
          >
            <AttendanceIcon className="size-3.5" aria-hidden />
            {client.attendance === "online" ? "Online" : "Loja"}
          </span>
        </span>
        <CardMenu clientId={client.id} status={client.status} leaderId={client.leaderId} leaders={leaders} onMove={onMove} tinted={highlight} />
      </div>

      <Link href={`/clientes/${client.id}`} className="mt-3 block text-[17px] font-medium leading-tight text-ink hover:underline" onPointerDown={(e) => e.stopPropagation()}>
        {client.name}
      </Link>
      {client.creditCents || description ? (
        <p className={cn("mt-0.5 line-clamp-2 text-[13px] leading-snug", highlight ? "text-ink-2" : "text-muted")}>
          {client.creditCents ? <span className="font-medium text-ink">{formatBRLCompact(client.creditCents)}</span> : null}
          {client.creditCents && description ? " · " : null}
          {description}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-2.5">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold", highlight ? "bg-white/70 text-accent-ink" : "bg-accent-soft text-accent-ink")}>
          {initials(client.leader?.name ?? client.name)}
        </span>
        <div className="min-w-0 text-[12px] leading-tight">
          <p className="truncate text-ink">{client.leader?.name ?? "Sem líder"}</p>
          <p className={highlight ? "text-ink-2" : "text-muted"}>{client.leader ? "Líder de vendas" : "Atribuir no menu"}</p>
        </div>
      </div>

      <div className={cn("mt-3 flex items-center justify-between gap-2 border-t pt-3 text-[12px] whitespace-nowrap", highlight ? "border-ink/10 text-ink-2" : "border-line text-ink-2")}>
        <span className="inline-flex min-w-0 items-center gap-1.5 tabular-nums" title={footer.title}>
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{footer.label}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums" title="Atendimentos realizados com o líder">
          <MessagesSquare className="size-4 shrink-0" aria-hidden />
          {client.meetingsCount}
        </span>
      </div>
    </article>
  );
}
