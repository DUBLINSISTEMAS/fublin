"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { PERIOD_MODE_LABELS, PERIOD_MODES, type PeriodMode } from "@/lib/period-filter";
import { buttonClasses } from "./button";
import { useUrlUpdate } from "./use-url-update";

type Props = { mode: PeriodMode; label: string; previousKey?: string; nextKey?: string; isCurrent: boolean };

/** Quinzena · Mês · Tudo, com ← → e "Atual" — o período vive na URL (`periodo`, `q`, `mes`). */
export function PeriodPicker({ mode, label, previousKey, nextKey, isCurrent }: Props) {
  const update = useUrlUpdate();
  const keyParam = mode === "mes" ? "mes" : "q";
  const go = (key?: string) => update({ [keyParam]: key });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-control bg-surface p-1 shadow-card" role="group" aria-label="Período">
        {PERIOD_MODES.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => update({ periodo: m === "quinzena" ? undefined : m, q: undefined, mes: undefined })}
            className={cn("inline-flex h-8 cursor-pointer items-center rounded-[8px] px-3 text-[13px] font-medium transition-colors", mode === m ? "bg-dark text-white" : "text-ink-2 hover:bg-surface-2")}
          >
            {PERIOD_MODE_LABELS[m]}
          </button>
        ))}
      </div>
      {mode !== "todos" ? (
        <div className="inline-flex items-center gap-1 rounded-control bg-surface p-1 shadow-card">
          <button type="button" aria-label="Período anterior" onClick={() => go(previousKey)} className={buttonClasses("ghost", "sm", "size-8 px-0")}>
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <span className="min-w-40 px-1 text-center text-[13px] font-medium text-ink">{label}</span>
          <button type="button" aria-label="Próximo período" onClick={() => go(nextKey)} className={buttonClasses("ghost", "sm", "size-8 px-0")}>
            <ChevronRight className="size-4" aria-hidden />
          </button>
          {!isCurrent ? (
            <button type="button" onClick={() => go(undefined)} className={buttonClasses("secondary", "sm", "ml-1")}>
              Atual
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
