"use client";

import { Select } from "@/components/ui/field";
import { PeriodPicker } from "@/components/ui/period-picker";
import { useUrlUpdate } from "@/components/ui/use-url-update";
import type { ResolvedPeriod } from "@/lib/period-filter";

type Props = { period: ResolvedPeriod; leaders: { id: string; name: string }[]; leaderId?: string };

/** Período (quinzena · mês · tudo) e líder — tudo na URL. */
export function ApprovedFilters({ period, leaders, leaderId }: Props) {
  const update = useUrlUpdate();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PeriodPicker mode={period.mode} label={period.label} previousKey={period.previousKey} nextKey={period.nextKey} isCurrent={period.isCurrent} />
      <div className="w-44">
        <Select aria-label="Líder de vendas" value={leaderId ?? ""} onChange={(e) => update({ lider: e.target.value || undefined })} className="h-9 bg-surface text-[13px] shadow-card">
          <option value="">Todos os líderes</option>
          {leaders.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
