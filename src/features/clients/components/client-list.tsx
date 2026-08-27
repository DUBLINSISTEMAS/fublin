import Link from "next/link";
import { ChevronRight, Clock, UserPlus, Users } from "lucide-react";
import { ClientStatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatWhen, fromIso } from "@/lib/dates";
import { INTEREST_LABELS } from "@/lib/domain";
import { formatPhone } from "@/lib/phone";
import { initials } from "@/lib/text";
import type { ClientListItem } from "../queries";

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
          const meta = [INTEREST_LABELS[c.interest], c.interestNotes, c.leader?.name].filter(Boolean).join(" · ");
          return (
            <li key={c.id}>
              <Link href={`/clientes/${c.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-2 sm:gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-[13px] font-semibold text-ink-2">{initials(c.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-[15px] font-medium text-ink">{c.name}</span>
                    <ClientStatusBadge status={c.status} />
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-muted">{meta}</span>
                  {c.nextAppointment ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-accent-ink">
                      <Clock className="size-3.5" aria-hidden />
                      {formatWhen(fromIso(c.nextAppointment.scheduledAt), now)}
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
