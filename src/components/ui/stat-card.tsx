import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "./card";

type Props = {
  label: string;
  value: string;
  /** Texto curto de apoio (variação, proporção…). */
  hint?: ReactNode;
  /** Valores longos (dinheiro) usam um número menor que quebra linha. */
  compact?: boolean;
  className?: string;
};

/** Número grande e leve com rótulo em cima — KPI das telas Hoje e Aprovados. */
export function StatCard({ label, value, hint, compact = false, className }: Props) {
  return (
    <Card className={cn("flex flex-col justify-between p-4 xl:p-5", className)}>
      <p className="text-[14px] text-ink-2">{label}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <p
          className={cn(
            "font-light tabular-nums tracking-tight text-ink",
            compact ? "min-w-0 break-words text-[22px] leading-tight xl:text-[26px]" : "text-[36px] leading-none",
          )}
        >
          {value}
        </p>
        {hint ? <div className="text-[12px] text-muted">{hint}</div> : null}
      </div>
    </Card>
  );
}
