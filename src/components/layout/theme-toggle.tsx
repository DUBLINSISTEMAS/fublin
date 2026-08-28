"use client";

import { useSyncExternalStore } from "react";
import { Maximize2, Minimize2, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { DENSITY_STORAGE_KEY, parseDensity, parseThemeChoice, resolveTheme, THEME_STORAGE_KEY, type Density, type ThemeChoice } from "@/lib/theme";

const THEME_OPTIONS: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Escuro", icon: Moon },
  { id: "system", label: "Automático", icon: Monitor },
];

const DENSITY_OPTIONS: { id: Density; label: string; icon: typeof Sun }[] = [
  { id: "compact", label: "Compacto (85%)", icon: Minimize2 },
  { id: "comfortable", label: "Padrão (100%)", icon: Maximize2 },
];

const TRANSITION_MS = 450;

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
const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
};
const readChoice = () => parseThemeChoice(read(THEME_STORAGE_KEY));
const readDensity = () => parseDensity(read(DENSITY_STORAGE_KEY));

/** Aplica o tema no <html> com uma transição suave de cores (a classe some logo depois). */
export function applyTheme(choice: ThemeChoice) {
  const html = document.documentElement;
  html.classList.add("theme-transition");
  html.dataset.theme = resolveTheme(choice, window.matchMedia("(prefers-color-scheme: dark)").matches);
  window.setTimeout(() => html.classList.remove("theme-transition"), TRANSITION_MS);
}

function chooseTheme(choice: ThemeChoice) {
  write(THEME_STORAGE_KEY, choice);
  applyTheme(choice);
  listeners.forEach((l) => l());
}

function chooseDensity(density: Density) {
  write(DENSITY_STORAGE_KEY, density);
  document.documentElement.dataset.density = density;
  listeners.forEach((l) => l());
}

type SegmentedProps<T extends string> = { value: T; options: { id: T; label: string; icon: typeof Sun }[]; onChange: (id: T) => void; compact: boolean; label: string };

function Segmented<T extends string>({ value, options, onChange, compact, label }: SegmentedProps<T>) {
  return (
    <div className={cn("inline-flex rounded-control bg-surface-2 p-1", compact && "w-full")} role="group" aria-label={label}>
      {options.map(({ id, label: text, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          aria-label={compact ? text : undefined}
          title={text}
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
            value === id ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {compact ? null : text}
        </button>
      ))}
    </div>
  );
}

/** Claro · Escuro (azul-marinho) · Automático. `compact` = só ícones, para a sidebar. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "system" as ThemeChoice);
  return <Segmented value={choice} options={THEME_OPTIONS} onChange={chooseTheme} compact={compact} label="Aparência" />;
}

/** Compacto (85%) · Padrão (100%) — só faz diferença em telas de computador. */
export function DensityToggle({ compact = false }: { compact?: boolean }) {
  const density = useSyncExternalStore(subscribe, readDensity, () => "compact" as Density);
  return <Segmented value={density} options={DENSITY_OPTIONS} onChange={chooseDensity} compact={compact} label="Tamanho da interface" />;
}
