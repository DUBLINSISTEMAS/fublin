"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { parseThemeChoice, resolveTheme, THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";

const OPTIONS: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Escuro", icon: Moon },
  { id: "system", label: "Automático", icon: Monitor },
];

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => {
    applyTheme(readChoice());
    l();
  };
  media.addEventListener("change", onMedia);
  return () => {
    listeners.delete(l);
    media.removeEventListener("change", onMedia);
  };
};
function readChoice(): ThemeChoice {
  try {
    return parseThemeChoice(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** Aplica o tema no <html>; o mesmo cálculo roda num script inline antes da hidratação (sem piscar). */
export function applyTheme(choice: ThemeChoice) {
  document.documentElement.dataset.theme = resolveTheme(choice, window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function choose(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  applyTheme(choice);
  listeners.forEach((l) => l());
}

/** Claro · Escuro (azul-marinho) · Automático. `compact` = só ícones, para a sidebar. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "system" as ThemeChoice);
  return (
    <div className={cn("inline-flex rounded-control bg-surface-2 p-1", compact ? "w-full" : "")} role="group" aria-label="Aparência">
      {OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={choice === id}
          aria-label={compact ? label : undefined}
          title={label}
          onClick={() => choose(id)}
          className={cn(
            "inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-medium transition-colors",
            choice === id ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {compact ? null : label}
        </button>
      ))}
    </div>
  );
}
