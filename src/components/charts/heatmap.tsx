import type { ActivityHeatmap } from "@/features/appointments/queries";
import { cn } from "@/lib/cn";

type Props = { data: ActivityHeatmap; currentDayIndex: number; currentHour: number };

function tone(count: number, max: number): string {
  if (count === 0) return "bg-surface-3";
  if (max <= 1 || count === 1) return "bg-sky";
  return "bg-accent";
}

/** Grade hora × dia com quadradinhos arredondados; a célula "agora" é limão. */
export function Heatmap({ data, currentDayIndex, currentHour }: Props) {
  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="grid gap-1" style={{ gridTemplateColumns: `2.25rem repeat(${data.days.length}, minmax(0.95rem, 1fr))` }} role="img" aria-label="Agendamentos por hora e dia">
        {data.hours.map((hour, hi) => (
          <div key={hour} className="contents">
            <span className="pr-1 text-right text-[10px] leading-4 tabular-nums text-muted">{hour}h</span>
            {data.days.map((d, di) => {
              const count = data.cells[hi][di];
              const isNow = di === currentDayIndex && hour === currentHour;
              return (
                <span
                  key={d.day}
                  title={`${d.label} · ${hour}h · ${count} agendamento${count === 1 ? "" : "s"}`}
                  className={cn("aspect-square w-full rounded-[4px]", isNow ? "bg-lime" : tone(count, data.max))}
                />
              );
            })}
          </div>
        ))}
        <span />
        {data.days.map((d) => (
          <span key={d.day} className="text-center text-[10px] leading-4 tabular-nums text-muted">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
