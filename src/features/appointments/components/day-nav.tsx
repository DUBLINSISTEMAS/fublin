"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { dayKey, isValidDayKey, shiftDayKey, type DayKey } from "@/lib/dates";

/** Navegação por dia: anterior · hoje · próximo + seletor de data. */
export function DayNav({ day }: { day: DayKey }) {
  const router = useRouter();
  const today = dayKey(new Date());
  const isToday = day === today;
  return (
    <div className="flex items-center gap-1.5">
      <Link href={`/agenda?d=${shiftDayKey(day, -1)}`} aria-label="Dia anterior" className={buttonClasses("secondary", "sm", "w-9 px-0")}>
        <ChevronLeft className="size-4" aria-hidden />
      </Link>
      <Link href="/agenda" className={cn(buttonClasses("secondary", "sm"), isToday && "pointer-events-none opacity-50")} aria-disabled={isToday}>
        Hoje
      </Link>
      <Link href={`/agenda?d=${shiftDayKey(day, 1)}`} aria-label="Próximo dia" className={buttonClasses("secondary", "sm", "w-9 px-0")}>
        <ChevronRight className="size-4" aria-hidden />
      </Link>
      <label className="sr-only" htmlFor="agenda-day">
        Ir para a data
      </label>
      <input
        id="agenda-day"
        type="date"
        value={day}
        onChange={(e) => {
          const next = e.target.value;
          if (isValidDayKey(next)) router.push(`/agenda?d=${next}`);
        }}
        className="h-9 rounded-control border border-line-strong bg-surface px-2.5 text-[13px] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}
