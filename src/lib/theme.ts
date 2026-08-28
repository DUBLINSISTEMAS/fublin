/** Preferência de tema, lida tanto pelo script inline do <head> (servidor) quanto pelo seletor (cliente). */
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
