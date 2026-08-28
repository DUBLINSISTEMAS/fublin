import { cn } from "@/lib/cn";

export type BarPoint = {
  key: string;
  label: string;
  value: number;
  /** Segunda série, desenhada como uma barra mais fina por cima (ex.: realizados). */
  secondary?: number;
  /** Destaque (ex.: a semana atual). */
  current?: boolean;
};

type Props = {
  points: BarPoint[];
  /** Linha tracejada da meta, na mesma unidade dos valores. */
  goal?: number | null;
  formatValue?: (v: number) => string;
  ariaLabel: string;
  className?: string;
  /** Rótulos das séries para a legenda. */
  legend?: { primary: string; secondary?: string; goal?: string };
};

const CHART_HEIGHT_PX = 140;

/**
 * Barras verticais em HTML/CSS puro (funciona em Server Components e imprime bem).
 * A barra da série principal é azul (limão quando bate a meta); a secundária, mais fina, é escura.
 */
export function BarChart({ points, goal = null, formatValue = String, ariaLabel, className, legend }: Props) {
  const max = Math.max(1, goal ?? 0, ...points.map((p) => Math.max(p.value, p.secondary ?? 0)));
  const goalTop = goal ? Math.max(0, 100 - (goal / max) * 100) : null;
  return (
    <figure className={cn("space-y-3", className)}>
      <div className="relative" style={{ height: CHART_HEIGHT_PX }} role="img" aria-label={ariaLabel}>
        {goalTop !== null ? (
          <div className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-sun-strong" style={{ top: `${goalTop}%` }} aria-hidden>
            <span className="absolute right-0 -top-2.5 rounded-md bg-sun px-1.5 text-[10px] font-medium tabular-nums text-sun-ink">meta {formatValue(goal!)}</span>
          </div>
        ) : null}
        <ul className="absolute inset-0 flex items-end gap-1.5 sm:gap-2.5">
          {points.map((p) => {
            const hit = goal ? p.value >= goal : false;
            const height = `${(p.value / max) * 100}%`;
            const secondaryHeight = p.secondary !== undefined ? `${(p.secondary / max) * 100}%` : null;
            return (
              <li key={p.key} className="relative flex h-full flex-1 items-end justify-center" title={`${p.label}: ${formatValue(p.value)}${p.secondary !== undefined ? ` · ${formatValue(p.secondary)}` : ""}`}>
                <span className={cn("absolute bottom-0 w-full rounded-t-[6px] transition-[height] duration-700 ease-out", hit ? "bg-lime" : p.current ? "bg-accent" : "bg-accent/55")} style={{ height }} />
                {secondaryHeight ? <span className="absolute bottom-0 w-1/3 rounded-t-[4px] bg-dark/80" style={{ height: secondaryHeight }} /> : null}
                {p.value > 0 ? (
                  <span className="pointer-events-none absolute -translate-y-full pb-1 text-[11px] font-medium tabular-nums text-ink" style={{ bottom: height }}>
                    {formatValue(p.value)}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
      <ul className="flex gap-1.5 sm:gap-2.5" aria-hidden>
        {points.map((p) => (
          <li key={p.key} className={cn("flex-1 truncate text-center text-[11px] tabular-nums", p.current ? "font-medium text-ink" : "text-muted")}>
            {p.label}
          </li>
        ))}
      </ul>
      {legend ? (
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-accent" aria-hidden />
            {legend.primary}
          </span>
          {legend.secondary ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-dark/80" aria-hidden />
              {legend.secondary}
            </span>
          ) : null}
          {legend.goal && goal ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 border-t border-dashed border-sun-strong" aria-hidden />
              {legend.goal}
            </span>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
