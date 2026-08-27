"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { useUrlUpdate } from "@/components/ui/use-url-update";

type Props = { label: string; previousKey: string; nextKey: string; isCurrent: boolean };

/** ← quinzena · quinzena → · "Atual" — a quinzena selecionada vive em `?q=`. */
export function PeriodNav({ label, previousKey, nextKey, isCurrent }: Props) {
  const update = useUrlUpdate();
  return (
    <div className="inline-flex items-center gap-1 rounded-control bg-surface p-1 shadow-card">
      <button type="button" aria-label="Quinzena anterior" onClick={() => update({ q: previousKey })} className={buttonClasses("ghost", "sm", "size-8 px-0")}>
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <span className="min-w-44 px-1 text-center text-[13px] font-medium text-ink">{label}</span>
      <button type="button" aria-label="Próxima quinzena" onClick={() => update({ q: nextKey })} className={buttonClasses("ghost", "sm", "size-8 px-0")}>
        <ChevronRight className="size-4" aria-hidden />
      </button>
      {!isCurrent ? (
        <button type="button" onClick={() => update({ q: undefined })} className={buttonClasses("secondary", "sm", "ml-1")}>
          Atual
        </button>
      ) : null}
    </div>
  );
}
