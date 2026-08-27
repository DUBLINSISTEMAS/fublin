import { CountBadge } from "@/components/ui/badge";
import { dayKey, fromIso } from "@/lib/dates";
import { CLIENT_STATUS_LABELS, type ClientStatus } from "@/lib/domain";
import type { ClientListItem } from "../queries";
import { ClientCard } from "./client-card";

const COLUMNS: ClientStatus[] = ["novo", "agendado", "visitou", "negociando", "fechou"];

type Props = { items: ClientListItem[]; now: Date };

/** Kanban do funil: uma coluna por status, cards de cliente; rola na horizontal em telas menores. */
export function Pipeline({ items, now }: Props) {
  // Destaque azul-claro: quem tem agendamento hoje.
  const today = dayKey(now);
  const soon = new Set(items.filter((c) => c.nextAppointment && dayKey(fromIso(c.nextAppointment.scheduledAt)) === today).map((c) => c.id));
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 no-scrollbar scroll-pl-4 sm:-mx-5 sm:px-5 sm:scroll-pl-5 md:mx-0 md:px-0 md:scroll-pl-0 xl:grid xl:grid-cols-5 xl:overflow-visible">
      {COLUMNS.map((status) => {
        const column = items.filter((c) => c.status === status);
        return (
          <section key={status} className="w-[82vw] shrink-0 snap-start space-y-3 sm:w-[60vw] md:w-[280px] xl:w-auto">
            <h2 className="flex items-center gap-2.5 text-[19px] font-normal text-ink">
              {CLIENT_STATUS_LABELS[status]}
              <CountBadge value={column.length} />
            </h2>
            {column.length === 0 ? (
              <p className="rounded-card border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-muted">Ninguém aqui.</p>
            ) : (
              column.map((c) => <ClientCard key={c.id} client={c} now={now} highlight={soon.has(c.id)} />)
            )}
          </section>
        );
      })}
    </div>
  );
}
