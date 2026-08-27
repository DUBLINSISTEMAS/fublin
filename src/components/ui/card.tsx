import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-line bg-surface shadow-card", className)} {...props} />;
}

type SectionProps = { title: ReactNode; count?: number; action?: ReactNode; children: ReactNode; className?: string };

/** Bloco com título pequeno em caixa alta (ritmo editorial). */
export function Section({ title, count, action, children, className }: SectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {title}
          {typeof count === "number" ? (
            <>
              {" "}
              <span className="ml-1.5 font-medium text-faint tabular-nums">{count}</span>
            </>
          ) : null}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
