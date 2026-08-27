"use client";

import { useUrlUpdate } from "@/components/ui/use-url-update";
import { cn } from "@/lib/cn";
import { APPOINTMENT_KIND_LABELS, APPOINTMENT_KINDS, type AppointmentKind } from "@/lib/domain";
import { KIND_DOT } from "./styles";

type Props = { selected: readonly AppointmentKind[]; hideDone: boolean; layout: "list" | "chips" };

/** Tipos visíveis (com a cor de cada um) e "ocultar concluídos" — tudo na URL. */
export function KindFilter({ selected, hideDone, layout }: Props) {
  const update = useUrlUpdate();
  const set = new Set(selected);

  function toggle(kind: AppointmentKind) {
    const next = APPOINTMENT_KINDS.filter((k) => (k === kind ? !set.has(k) : set.has(k)));
    if (next.length === 0) return; // sem tipo nenhum a agenda ficaria vazia sem explicação
    update({ tipo: next.length === APPOINTMENT_KINDS.length ? undefined : next.join(",") });
  }

  if (layout === "chips") {
    return (
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 no-scrollbar sm:-mx-5 sm:px-5">
        {APPOINTMENT_KINDS.map((k) => {
          const on = set.has(k);
          return (
            <button key={k} type="button" aria-pressed={on} onClick={() => toggle(k)} className={cn("inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors", on ? "bg-surface text-ink shadow-card" : "bg-surface-3/70 text-muted")}>
              <span className={cn("size-2 rounded-full", KIND_DOT[k], !on && "opacity-40")} aria-hidden />
              {APPOINTMENT_KIND_LABELS[k]}
            </button>
          );
        })}
        <button type="button" aria-pressed={hideDone} onClick={() => update({ ocultar: hideDone ? undefined : "1" })} className={cn("inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full px-3 text-[12px] font-medium transition-colors", hideDone ? "bg-dark text-white" : "bg-surface text-ink-2 shadow-card")}>
          Só em aberto
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Tipos</p>
      {APPOINTMENT_KINDS.map((k) => (
        <label key={k} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-[10px] px-2 text-[14px] text-ink-2 transition-colors hover:bg-surface-2 has-checked:text-ink">
          <input type="checkbox" checked={set.has(k)} onChange={() => toggle(k)} className={cn("size-4 rounded accent-accent")} />
          <span className={cn("size-2.5 rounded-full", KIND_DOT[k])} aria-hidden />
          {APPOINTMENT_KIND_LABELS[k]}
        </label>
      ))}
      <label className="mt-2 flex h-9 cursor-pointer items-center gap-2.5 rounded-[10px] px-2 text-[14px] text-ink-2 transition-colors hover:bg-surface-2 has-checked:text-ink">
        <input type="checkbox" checked={hideDone} onChange={() => update({ ocultar: hideDone ? undefined : "1" })} className="size-4 rounded accent-accent" />
        Só em aberto
      </label>
    </div>
  );
}
