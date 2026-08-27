"use client";

import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { useUrlUpdate } from "@/components/ui/use-url-update";
import { cn } from "@/lib/cn";
import type { DayKey } from "@/lib/dates";
import { CALENDAR_VIEW_LABELS, CALENDAR_VIEWS, type CalendarView } from "./types";

type Props = {
  view: CalendarView;
  day: DayKey;
  title: string;
  subtitle?: string;
  previousDay: DayKey;
  nextDay: DayKey;
  isToday: boolean;
};

/** Título do período, Dia · Semana · Mês, ← Hoje → e o botão de agendar. */
export function CalendarHeader({ view, day, title, subtitle, previousDay, nextDay, isToday }: Props) {
  const update = useUrlUpdate();
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {subtitle ? <p className="mb-1 text-[13px] font-medium text-muted">{subtitle}</p> : null}
        <h1 className="text-[26px] font-medium tracking-tight text-ink md:text-[30px]">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-control bg-surface p-1 shadow-card" role="group" aria-label="Visualização">
          {CALENDAR_VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => update({ view: v === "semana" ? undefined : v })}
              className={cn("inline-flex h-8 cursor-pointer items-center rounded-[8px] px-3 text-[13px] font-medium transition-colors", view === v ? "bg-dark text-white" : "text-ink-2 hover:bg-surface-2")}
            >
              {CALENDAR_VIEW_LABELS[v]}
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-1 rounded-control bg-surface p-1 shadow-card">
          <button type="button" aria-label="Anterior" onClick={() => update({ d: previousDay })} className={buttonClasses("ghost", "sm", "size-8 px-0")}>
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={() => update({ d: undefined })} disabled={isToday} className={buttonClasses("ghost", "sm", "px-3 disabled:opacity-40")}>
            Hoje
          </button>
          <button type="button" aria-label="Próximo" onClick={() => update({ d: nextDay })} className={buttonClasses("ghost", "sm", "size-8 px-0")}>
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
        <ButtonLink href={`/agenda/novo?d=${day}`} size="sm" variant="dark" className="max-md:hidden">
          <CalendarPlus className="size-4" aria-hidden />
          Agendar
        </ButtonLink>
      </div>
    </header>
  );
}
