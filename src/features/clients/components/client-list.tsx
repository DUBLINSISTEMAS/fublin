import Link from "next/link";
import { ChevronRight, UserPlus, Users } from "lucide-react";
import { ClientStatusBadge, InterestChip } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { APPOINTMENT_KIND_ICON } from "@/features/appointments/components/kind-icon";
import { meetingLabel } from "@/features/appointments/sequence";
import { formatSchedule, fromIso } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { initials } from "@/lib/text";
import type { ClientListItem } from "../queries";
import { valuesLine } from "../values";

type Props = { items: ClientListItem[]; now: Date; hasFilters: boolean };

export function ClientList({ items, now, hasFilters }: Props) {
  if (items.length === 0) {
    return hasFilters ? (
      <EmptyState icon={Users} title="Nenhum cliente com esses filtros" description="Tente outra busca ou limpe os filtros." action={<ButtonLink href="/clientes" variant="secondary">Limpar filtros</ButtonLink>} />
    ) : (
      <EmptyState
        icon={UserPlus}
        title="Cadastre seu primeiro cliente"
        description="Nome, telefone e interesse bastam para começar. O resto você completa depois."
        action={<ButtonLink href="/clientes/novo">Novo cliente</ButtonLink>}
      />
    );
  }

  return (
    <Card>
      <ul className="divide-y divide-line">
        {items.map((c) => {
          const meta = [c.interest === "outro" ? null : c.interestNotes, c.leader?.name, valuesLine(c)].filter(Boolean).join(" · ");
          const next = c.nextAppointment;
          const NextIcon = next ? APPOINTMENT_KIND_ICON[next.kind] : null;
          return (
            <li key={c.id}>
              <Link href={`/clientes/${c.id}`} className="flex items-center gap-3 px-4 py-4 transition-colors duration-150 hover:bg-surface-2 sm:gap-4 sm:px-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-ink">{initials(c.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-[16px] font-medium text-ink">{c.name}</span>
                    <InterestChip interest={c.interest} notes={c.interestNotes} className="h-6 text-[12px]" />
                    <ClientStatusBadge status={c.status} className="h-6 text-[12px]" />
                  </span>
                  {meta ? <span className="mt-0.5 block truncate text-[13px] text-muted">{meta}</span> : null}
                  {next && NextIcon ? (
                    <span className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-ink">
                      <NextIcon className="size-3.5" aria-hidden />
                      <span className="tabular-nums">{formatSchedule(fromIso(next.scheduledAt), now)}</span>
                      {next.meetingNumber ? <span className="text-muted">· {meetingLabel(next.meetingNumber, next.kind)}</span> : null}
                    </span>
                  ) : null}
                </span>
                <span className="hidden text-[13px] tabular-nums text-muted sm:block">{formatPhone(c.phone)}</span>
                <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
