"use client";

import Link from "next/link";
import { CalendarDays, MessagesSquare, Store, Video } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ClientPriorityBadge, InterestChip } from "@/components/ui/badge";
import type { Leader } from "@/db/schema";
import { APPOINTMENT_KIND_ICON } from "@/features/appointments/components/kind-icon";
import { meetingLabel, meetingOrdinal } from "@/features/appointments/sequence";
import { cn } from "@/lib/cn";
import { formatDayShort, formatSchedule, formatScheduleDay, formatTime, fromIso, isSoon } from "@/lib/dates";
import { APPOINTMENT_KIND_LABELS, CLIENT_STATUS_LABELS, type ClientStatus } from "@/lib/domain";
import { formatBRLCompact } from "@/lib/money";
import { differenceInCalendarDays } from "date-fns";
import { buildConfirmationMessage } from "../confirmation";
import type { ClientListItem, NextAppointment } from "../queries";
import { valuesLine } from "../values";
import { CardMenu } from "./card-menu";

type Props = {
  client: ClientListItem;
  now: Date;
  leaders: Pick<Leader, "id" | "name" | "photoKey">[];
  onMove: (status: ClientStatus) => void;
  highlight?: boolean;
  dragging?: boolean;
  /** Cor da borda enquanto arrasta (a da coluna sob o card). */
  ringClass?: string;
  canManage?: boolean;
};

/** O último fato relevante do cliente (rodapé do card), do mais urgente ao mais antigo. */
export function cardFooter(client: ClientListItem): { label: string; title?: string } {
  // Com agendamento à vista, a faixa acima já diz o dia e a hora; aqui fica só o tipo.
  if (client.nextAppointment) return { label: APPOINTMENT_KIND_LABELS[client.nextAppointment.kind], title: "Tipo do próximo agendamento" };
  if (client.status === "fechou" && client.closedAt) return { label: `Fechou ${formatDayShort(fromIso(client.closedAt))}`, title: "Fechamento" };
  if (client.status === "aprovado" && client.approvedAt) return { label: `Aprovado ${formatDayShort(fromIso(client.approvedAt))}`, title: "Aprovação" };
  if (client.firstVisitAt) return { label: `Atendido ${formatDayShort(fromIso(client.firstVisitAt))}`, title: "Primeiro atendimento" };
  return { label: "Sem agendamento" };
}

/**
 * Faixa "quando o cliente vem": dia da semana, data e hora, com o ícone do tipo
 * (loja, online, ligação, retorno) e o número do encontro. Hoje e amanhã ganham
 * fundo escuro — é o que precisa saltar aos olhos ao bater o olho no quadro.
 */
function NextMeeting({ next, now, tinted }: { next: NextAppointment; now: Date; tinted: boolean }) {
  const when = fromIso(next.scheduledAt);
  const past = when < now;
  const urgent = !past && isSoon(when, now);
  const Icon = APPOINTMENT_KIND_ICON[next.kind];
  return (
    <div
      className={cn(
        "mt-3 flex items-stretch gap-2 rounded-control p-2.5",
        past ? "bg-sun text-sun-ink" : urgent ? "bg-dark text-white" : tinted ? "bg-white/70 text-ink" : "bg-surface-2 text-ink",
      )}
      title={`${APPOINTMENT_KIND_LABELS[next.kind]} — ${formatSchedule(when, now)}`}
    >
      <span className={cn("grid size-9 shrink-0 place-items-center self-center rounded-full", urgent ? "bg-white/15" : past ? "bg-white/45 text-sun-ink" : "bg-accent-soft text-accent-ink")}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 border-r border-current/15 pr-2">
        <span className={cn("block text-[10px] font-semibold uppercase tracking-[0.12em]", urgent ? "text-white/65" : past ? "text-sun-ink/70" : "text-muted")}>{past ? "Atrasado" : "Dia"}</span>
        <span className="block truncate text-[14px] font-semibold leading-tight">{formatScheduleDay(when, now)}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className={cn("block text-[10px] font-semibold uppercase tracking-[0.12em]", urgent ? "text-white/65" : "text-muted")}>Horário</span>
        <span className="block text-[19px] font-semibold leading-tight tabular-nums tracking-tight">{formatTime(when)}</span>
      </span>
      {next.meetingNumber ? (
        <span
          className={cn("hidden shrink-0 self-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums min-[340px]:inline", urgent ? "bg-white/20" : "bg-ink/10")}
          title={meetingLabel(next.meetingNumber, next.kind)}
        >
          {meetingOrdinal(next.meetingNumber)}
        </span>
      ) : null}
    </div>
  );
}

/** Card do funil: chip de interesse, nome, carta, líder, quando o cliente vem e atendimentos. */
export function ClientCard({ client, now, leaders, onMove, highlight = false, dragging = false, ringClass = "ring-accent", canManage = true }: Props) {
  // Com "Outro", o detalhe já é o chip; repetir embaixo só ocuparia espaço.
  const description = client.interest === "outro" ? client.notes : (client.interestNotes ?? client.notes);
  const AttendanceIcon = client.attendance === "online" ? Video : Store;
  const footer = cardFooter(client);
  const values = valuesLine(client);
  const meetingsTitle = `${client.meetingsCount} de ${client.meetingsTotal} ${client.meetingsTotal === 1 ? "encontro marcado" : "encontros marcados"} já realizados`;
  const daysInStage = Math.max(0, differenceInCalendarDays(now, fromIso(client.statusSince)));
  const confirmation = client.nextAppointment
    ? buildConfirmationMessage({
        clientName: client.name,
        attendance: client.attendance,
        when: fromIso(client.nextAppointment.scheduledAt),
        interest: client.interest,
        interestNotes: client.interestNotes,
        leaderName: client.leader?.name,
      })
    : null;

  return (
    <article
      className={cn(
        "rounded-card p-4 shadow-card transition-[box-shadow,--tw-ring-color] duration-200",
        highlight ? "bg-sky" : "bg-surface",
        dragging ? cn("rotate-2 shadow-float ring-[3px]", ringClass) : "hover:shadow-float",
      )}
      aria-label={`${client.name}, ${CLIENT_STATUS_LABELS[client.status]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1.5">
          <InterestChip interest={client.interest} notes={client.interestNotes} />
          <ClientPriorityBadge priority={client.priority} />
          <span
            className={cn("inline-flex h-7 items-center gap-1 rounded-chip px-2 text-[12px]", highlight ? "bg-white/60 text-ink-2" : "bg-surface-2 text-muted")}
            title={client.attendance === "online" ? "Atendimento online" : "Atendimento presencial"}
          >
            <AttendanceIcon className="size-3.5" aria-hidden />
            {client.attendance === "online" ? "Online" : "Loja"}
          </span>
          {daysInStage > 0 ? (
            <span className={cn("inline-flex h-7 items-center rounded-chip px-2 text-[11px] font-medium", daysInStage >= 5 ? "bg-sun text-sun-ink" : highlight ? "bg-white/60 text-ink-2" : "bg-surface-2 text-muted")} title="Tempo na etapa atual">
              {daysInStage}d na etapa
            </span>
          ) : null}
        </span>
        <CardMenu clientId={client.id} status={client.status} priority={client.priority} leaderId={client.leaderId} leaders={leaders} onMove={onMove} tinted={highlight} canManage={canManage} confirmation={confirmation} phone={client.phone} />
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
      {values ? (
        <p className={cn("mt-1 text-[12px] font-medium tabular-nums", highlight ? "text-ink-2" : "text-ink-2")} title="Adesão (entrada) e parcela que cabe no bolso">
          {values}
        </p>
      ) : client.status !== "fechou" && client.status !== "perdido" ? (
        <p className="mt-1 text-[12px] text-sun-ink" title="Combine a adesão (entrada) com o cliente">Sem adesão combinada</p>
      ) : null}

      {client.nextAppointment ? <NextMeeting next={client.nextAppointment} now={now} tinted={highlight} /> : null}

      <div className="mt-3 flex items-center gap-2.5">
        <Avatar name={client.leader?.name ?? client.name} photoKey={client.leader?.photoKey} size={32} tone={highlight ? "white" : "accent"} />
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
        <span className="inline-flex items-center gap-1.5 tabular-nums" title={meetingsTitle}>
          <MessagesSquare className="size-4 shrink-0" aria-hidden />
          {client.meetingsCount}
          {client.meetingsTotal > client.meetingsCount ? <span className="text-faint">/{client.meetingsTotal}</span> : null}
        </span>
      </div>
    </article>
  );
}
