/** Preferências de aparência, lidas tanto pelo script inline do <head> (servidor) quanto pelos seletores (cliente). */
export const THEME_STORAGE_KEY = "relacionador:theme";
export type ThemeChoice = "light" | "dark" | "system";

/** Lê o que está salvo; qualquer coisa fora de claro/escuro vira "automático". */
export function parseThemeChoice(value: string | null): ThemeChoice {
  return value === "light" || value === "dark" ? value : "system";
}

/** Tema efetivo a aplicar no <html>. */
export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): "light" | "dark" {
  return choice === "dark" || (choice === "system" && systemPrefersDark) ? "dark" : "light";
}

/** Tamanho da interface no computador: "compact" = 85% (padrão), "comfortable" = 100%. */
export const DENSITY_STORAGE_KEY = "relacionador:density";
export type Density = "compact" | "comfortable";

export function parseDensity(value: string | null): Density {
  return value === "comfortable" ? "comfortable" : "compact";
}

/**
 * Roda antes da hidratação: aplica tema e densidade salvos (ou os padrões) sem piscar.
 * Mantido como string para ir inline no <head>; o mesmo cálculo existe em `resolveTheme`.
 */
export const APPEARANCE_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var h=document.documentElement;h.dataset.theme=d?"dark":"light";h.dataset.density=localStorage.getItem(${JSON.stringify(DENSITY_STORAGE_KEY)})==="comfortable"?"comfortable":"compact"}catch(e){}})()`;
