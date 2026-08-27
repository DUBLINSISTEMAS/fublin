import Link from "next/link";
import { CalendarDays, MoreHorizontal, Phone } from "lucide-react";
import { InterestChip } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatDayShort, formatRelativeDay, fromIso } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { initials } from "@/lib/text";
import type { ClientListItem } from "../queries";

type Props = { client: ClientListItem; now: Date; highlight?: boolean };

/** Card do funil: chip de interesse, nome, contexto, líder, próximo agendamento. */
export function ClientCard({ client, now, highlight = false }: Props) {
  const next = client.nextAppointment ? fromIso(client.nextAppointment.scheduledAt) : null;
  const description = client.interestNotes ?? client.notes;
  return (
    <article className={cn("rounded-card p-4 shadow-card transition-shadow hover:shadow-float", highlight ? "bg-sky" : "bg-surface")}>
      <div className="flex items-start justify-between gap-2">
        <InterestChip interest={client.interest} className={cn(highlight && client.interest === "servicos" && "bg-white/70")} />
        <Link href={`/clientes/${client.id}/editar`} className="icon-btn -mt-1 -mr-1 size-8" aria-label={`Editar ${client.name}`}>
          <MoreHorizontal className="size-4" aria-hidden />
        </Link>
      </div>
      <Link href={`/clientes/${client.id}`} className="mt-3 block text-[17px] font-medium leading-tight text-ink hover:underline">
        {client.name}
      </Link>
      {description ? <p className={cn("mt-1 line-clamp-2 text-[13px] leading-snug", highlight ? "text-ink-2" : "text-muted")}>{description}</p> : null}
      <div className="mt-3 flex items-center gap-2.5">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold", highlight ? "bg-white/70 text-accent-ink" : "bg-accent-soft text-accent-ink")}>
          {initials(client.leader?.name ?? client.name)}
        </span>
        <div className="min-w-0 text-[12px] leading-tight">
          <p className="truncate text-ink">{client.leader?.name ?? "Sem líder"}</p>
          <p className={highlight ? "text-ink-2" : "text-muted"}>{client.leader ? "Líder de vendas" : "Definir na loja"}</p>
        </div>
      </div>
      <div className={cn("mt-3 flex items-center justify-between gap-2 border-t pt-3 text-[12px] whitespace-nowrap", highlight ? "border-ink/10 text-ink-2" : "border-line text-ink-2")}>
        <span className="inline-flex min-w-0 items-center gap-1.5 tabular-nums" title={next ? "Próximo agendamento" : client.firstVisitAt ? "Veio à loja em" : undefined}>
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{next ? formatRelativeDay(next, now) : client.firstVisitAt ? formatDayShort(fromIso(client.firstVisitAt)) : "Sem data"}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Phone className="size-4 shrink-0" aria-hidden />
          {formatPhone(client.phone).replace(/^\(\d+\)\s/, "")}
        </span>
      </div>
    </article>
  );
}
