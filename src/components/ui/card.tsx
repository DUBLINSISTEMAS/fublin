import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CountBadge } from "./badge";

/** Card branco com raio grande e sombra quase nula (assenta no canvas cinza). */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-card bg-surface shadow-card", className)} {...props} />;
}

type SectionProps = { title: ReactNode; count?: number; action?: ReactNode; children: ReactNode; className?: string };

/** Bloco com título leve + contador redondo (estilo coluna de kanban). */
export function Section({ title, count, action, children, className }: SectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2.5 text-[19px] font-normal text-ink">
          {title}
          {typeof count === "number" ? <CountBadge value={count} /> : null}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
