import Link from "next/link";
import { cn } from "@/lib/cn";
import { dayBounds, dayKey, formatTime, fromIso, type DayKey } from "@/lib/dates";
import { plural } from "@/lib/text";
import { PRIORITY_DOT } from "./styles";
import type { CalendarEvent } from "./types";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MAX_PILLS = 3;

type Props = { days: DayKey[]; month: DayKey; events: CalendarEvent[]; today: DayKey; hrefForDay: (day: DayKey) => string };

/** Mês inteiro: até 3 pílulas por dia no desktop, pontinhos no celular; o dia leva à visão de dia. */
export function MonthGrid({ days, month, events, today, hrefForDay }: Props) {
  const monthIndex = dayBounds(month).start.getMonth();
  const byDay = new Map<DayKey, CalendarEvent[]>();
  for (const e of events) {
    const key = dayKey(fromIso(e.start));
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  }
  return (
    <div className="overflow-hidden rounded-panel bg-surface shadow-panel">
      <div className="grid grid-cols-7 border-b border-line text-center text-[11px] font-medium uppercase tracking-wide text-muted">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-2">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const date = dayBounds(day).start;
          const inMonth = date.getMonth() === monthIndex;
          const isToday = day === today;
          const list = byDay.get(day) ?? [];
          const extra = list.length - MAX_PILLS;
          return (
            <Link
              key={day}
              href={hrefForDay(day)}
              className={cn(
                "flex min-h-[72px] flex-col gap-1 border-line p-1.5 transition-colors hover:bg-surface-2 md:min-h-[112px]",
                i % 7 !== 0 && "border-l",
                i >= 7 && "border-t",
                !inMonth && "bg-surface-2/50",
              )}
            >
              <span className={cn("grid size-7 place-items-center rounded-full text-[13px] tabular-nums", isToday ? "bg-accent font-medium text-white" : inMonth ? "text-ink" : "text-faint")}>{date.getDate()}</span>
              {list.length ? (
                <>
                  <span className="flex flex-wrap gap-1 md:hidden" aria-label={plural(list.length, "agendamento")}>
                    {list.slice(0, 4).map((e) => (
                      <span key={e.id} className={cn("size-1.5 rounded-full", PRIORITY_DOT[e.priority], e.status !== "agendado" && "opacity-40")} />
                    ))}
                  </span>
                  <span className="hidden flex-col gap-1 md:flex">
                    {list.slice(0, MAX_PILLS).map((e) => (
                      <span key={e.id} className={cn("flex items-center gap-1.5 truncate rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink", e.status !== "agendado" && "opacity-60")}>
                        <span className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_DOT[e.priority])} aria-hidden />
                        <span className="tabular-nums text-muted">{formatTime(fromIso(e.start))}</span>
                        <span className="truncate">{e.clientName}</span>
                      </span>
                    ))}
                    {extra > 0 ? <span className="px-1.5 text-[11px] font-medium text-accent-ink">+{extra} mais</span> : null}
                  </span>
                </>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
