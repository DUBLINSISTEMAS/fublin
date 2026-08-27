import Link from "next/link";
import { cn } from "@/lib/cn";
import { CLIENT_STATUS_LABELS, CLIENT_STATUSES, OPEN_CLIENT_STATUSES, type ClientStatus } from "@/lib/domain";
import type { ClientFilters } from "../queries";

type Props = {
  filters: ClientFilters;
  counts: Record<ClientStatus, number>;
  params: Record<string, string | string[] | undefined>;
};

function hrefWithStatus(params: Props["params"], status: string | undefined): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "status") continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (v) next.set(key, v);
  }
  if (status) next.set("status", status);
  const query = next.toString();
  return query ? `/clientes?${query}` : "/clientes";
}

/** Chips de status com contagem; o filtro ativo fica escuro. */
export function StatusChips({ filters, counts, params }: Props) {
  const total = CLIENT_STATUSES.reduce((sum, s) => sum + counts[s], 0);
  const open = OPEN_CLIENT_STATUSES.reduce((sum, s) => sum + counts[s], 0);
  const chips: { value: string | undefined; label: string; count: number }[] = [
    { value: undefined, label: "Todos", count: total },
    { value: "abertos", label: "Abertos", count: open },
    ...CLIENT_STATUSES.map((s) => ({ value: s, label: CLIENT_STATUS_LABELS[s], count: counts[s] })),
  ];
  return (
    <div className="-mx-4 min-w-0 overflow-x-auto px-4 no-scrollbar sm:-mx-5 sm:px-5 md:mx-0 md:px-0">
      <ul className="flex w-max gap-1.5">
        {chips.map((chip) => {
          const active = (filters.status ?? undefined) === chip.value;
          return (
            <li key={chip.label}>
              <Link
                href={hrefWithStatus(params, chip.value)}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150",
                  active ? "bg-dark text-white" : "bg-surface text-ink-2 shadow-card hover:bg-surface-2",
                )}
              >
                {chip.label}
                <span className={cn("tabular-nums", active ? "text-white/70" : "text-faint")}>{chip.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
