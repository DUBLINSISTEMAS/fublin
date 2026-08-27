import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { dayBounds, dayKey, dayKeysFrom, formatMonthLong, monthGridStartKey, type DayKey } from "@/lib/dates";
import { addMonths } from "date-fns";

const WEEKDAYS = ["S", "T", "Q", "Q", "S", "S", "D"];

type Props = {
  /** Qualquer dia do mês exibido. */
  month: DayKey;
  selected: DayKey;
  today: DayKey;
  counts: Record<DayKey, number>;
  hrefFor: (day: DayKey) => string;
};

/** Mês em miniatura na lateral: dia selecionado em azul, hoje contornado, pontinho onde há agendamento. */
export function MiniCalendar({ month, selected, today, counts, hrefFor }: Props) {
  const monthDate = dayBounds(month).start;
  const monthIndex = monthDate.getMonth();
  const days = dayKeysFrom(monthGridStartKey(month), 42);
  const previous = dayKey(addMonths(new Date(monthDate.getFullYear(), monthIndex, 1), -1));
  const next = dayKey(addMonths(new Date(monthDate.getFullYear(), monthIndex, 1), 1));

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Link href={hrefFor(previous)} aria-label="Mês anterior" className="icon-btn size-8">
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
        <p className="text-[13px] font-medium text-ink">{formatMonthLong(monthDate)}</p>
        <Link href={hrefFor(next)} aria-label="Próximo mês" className="icon-btn size-8">
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[11px] text-muted">
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
        {days.map((day) => {
          const inMonth = dayBounds(day).start.getMonth() === monthIndex;
          const isSelected = day === selected;
          const isToday = day === today;
          return (
            <Link
              key={day}
              href={hrefFor(day)}
              aria-current={isSelected ? "date" : undefined}
              className={cn(
                "relative mx-auto grid size-8 place-items-center rounded-full text-[12px] tabular-nums transition-colors",
                isSelected ? "bg-accent font-medium text-white" : isToday ? "ring-1 ring-accent text-accent-ink" : inMonth ? "text-ink hover:bg-surface-2" : "text-faint hover:bg-surface-2",
              )}
            >
              {Number(day.slice(8, 10))}
              {counts[day] ? <span className={cn("absolute bottom-0.5 size-1 rounded-full", isSelected ? "bg-white" : "bg-accent")} aria-hidden /> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
