"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Check, CircleAlert, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ActionResult, FormState } from "@/lib/result";

type Tone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: Tone };

const DURATION_MS = 3500;
const EMPTY: Toast[] = [];

/* Store minimalista fora do React: qualquer componente cliente chama `toast.success("Salvo")`. */
let toasts: Toast[] = EMPTY;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function push(message: string, tone: Tone) {
  const id = nextId++;
  toasts = [...toasts, { id, message, tone }];
  emit();
  window.setTimeout(() => dismiss(id), DURATION_MS);
}

function dismiss(id: number) {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (message: string) => push(message, "success"),
  error: (message: string) => push(message, "error"),
  info: (message: string) => push(message, "info"),
};

/** Avisa "salvo"/erro quando o resultado de uma ação rápida ou formulário muda. */
export function useActionToast(state: ActionResult | FormState, successMessage?: string) {
  const previous = useRef(state);
  useEffect(() => {
    if (state === previous.current) return;
    previous.current = state;
    if ("ok" in state) {
      if (state.ok && successMessage) toast.success(successMessage);
      if (!state.ok) toast.error(state.error);
      return;
    }
    if (state.status === "success") toast.success(state.message ?? successMessage ?? "Salvo.");
    if (state.status === "error") toast.error(state.message);
  }, [state, successMessage]);
}

const ICON: Record<Tone, typeof Check> = { success: Check, error: CircleAlert, info: Info };
const STYLE: Record<Tone, string> = { success: "bg-lime text-lime-ink", error: "bg-rose text-rose-ink", info: "bg-sky text-sky-ink" };

/** Pilha de avisos curtos: embaixo no celular (acima da tab bar), no canto inferior direito no desktop. */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);
  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-50 flex flex-col items-center gap-2 md:inset-x-auto md:right-4 md:bottom-4 md:items-end" role="status" aria-live="polite">
      {items.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <div key={t.id} className="animate-rise pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-card bg-dark py-2.5 pr-2 pl-3 text-[14px] text-white shadow-float">
            <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", STYLE[t.tone])}>
              <Icon className="size-3.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">{t.message}</span>
            <button type="button" aria-label="Fechar aviso" onClick={() => dismiss(t.id)} className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white">
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
