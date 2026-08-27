"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { formatMonthLong, monthRange, shiftMonthKey, type MonthKey } from "@/lib/dates";

type Props = { month: MonthKey | "todos"; leaders: { id: string; name: string }[]; leaderId?: string; currentMonth: MonthKey };

/** Mês (← →), "todos os meses" e líder — tudo na URL. */
export function ApprovedFilters({ month, leaders, leaderId, currentMonth }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const isAll = month === "todos";
  const label = isAll ? "Todos os meses" : formatMonthLong(monthRange(month).start);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-control bg-surface p-1 shadow-card">
        <button type="button" aria-label="Mês anterior" disabled={isAll} onClick={() => update({ mes: shiftMonthKey(month as MonthKey, -1) })} className={buttonClasses("ghost", "sm", "size-8 px-0 disabled:opacity-40")}>
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span className="min-w-36 px-1 text-center text-[13px] font-medium text-ink">{label}</span>
        <button type="button" aria-label="Próximo mês" disabled={isAll || month === currentMonth} onClick={() => update({ mes: shiftMonthKey(month as MonthKey, 1) })} className={buttonClasses("ghost", "sm", "size-8 px-0 disabled:opacity-40")}>
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <button type="button" onClick={() => update({ mes: isAll ? undefined : "todos" })} className={buttonClasses(isAll ? "dark" : "secondary", "sm")}>
        {isAll ? "Só este mês" : "Todos os meses"}
      </button>
      <div className="w-40">
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
