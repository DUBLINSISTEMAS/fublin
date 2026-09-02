"use client";

import { CalendarDays, CalendarRange, Columns3, List, Users } from "lucide-react";
import { Select } from "@/components/ui/field";
import { useUrlUpdate } from "@/components/ui/use-url-update";
import { cn } from "@/lib/cn";
import { INTEREST_LABELS, INTERESTS } from "@/lib/domain";
import type { ClientFilters as Filters } from "../queries";

type Props = { leaders: { id: string; name: string }[]; filters: Filters; showLeader?: boolean };

/** Filtros por interesse e líder; vivem na URL. */
export function ClientFilters({ leaders, filters, showLeader = true }: Props) {
  const update = useUrlUpdate();
  return (
    <div className="flex items-center gap-2">
      <div className="w-36 sm:w-40">
        <Select aria-label="Interesse" value={filters.interest ?? ""} onChange={(e) => update({ interesse: e.target.value || undefined })} className="h-10 bg-surface text-[14px] shadow-card">
          <option value="">Interesse</option>
          {INTERESTS.map((i) => (
            <option key={i} value={i}>
              {INTEREST_LABELS[i]}
            </option>
          ))}
        </Select>
      </div>
      {showLeader ? <div className="w-36 sm:w-44">
        <Select aria-label="Líder de vendas" value={filters.leaderId ?? ""} onChange={(e) => update({ lider: e.target.value || undefined })} className="h-10 bg-surface text-[14px] shadow-card">
          <option value="">Líder</option>
          {leaders.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </div> : null}
    </div>
  );
}

/** Recorte operacional do quadro: carteira inteira, compromissos de hoje ou da semana atual. */
export function ScheduleFilter({ value }: { value: Filters["schedule"] }) {
  const update = useUrlUpdate();
  const options = [
    { value: undefined, label: "Todos", icon: Users },
    { value: "today" as const, label: "Hoje", icon: CalendarDays },
    { value: "week" as const, label: "Esta semana", icon: CalendarRange },
  ];
  return (
    <div className="inline-flex rounded-control bg-surface p-1 shadow-card" role="group" aria-label="Período dos agendamentos">
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={active}
            onClick={() => update({ agenda: option.value, prioridade: undefined })}
            className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-medium transition-colors sm:px-3 sm:text-[13px]", active ? "bg-dark text-white" : "text-ink-2 hover:bg-surface-2")}
          >
            <Icon className="size-3.5" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Alternância funil / lista. */
export function ViewToggle({ view }: { view: "funil" | "lista" }) {
  const update = useUrlUpdate();
  return (
    <div className="inline-flex rounded-control bg-surface p-1 shadow-card" role="group" aria-label="Visualização">
      <ViewButton active={view === "funil"} onClick={() => update({ view: undefined })} icon={<Columns3 className="size-4" aria-hidden />} label="Funil" />
      <ViewButton active={view === "lista"} onClick={() => update({ view: "lista" })} icon={<List className="size-4" aria-hidden />} label="Lista" />
    </div>
  );
}

function ViewButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium transition-colors", active ? "bg-dark text-white" : "text-ink-2 hover:bg-surface-2")}
    >
      {icon}
      {label}
    </button>
  );
}
