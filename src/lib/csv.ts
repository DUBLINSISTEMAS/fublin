export type CsvColumn<T> = { key: string; label: string; get?: (row: T) => unknown };

const SEPARATOR = ";"; // Excel pt-BR
const BOM = "﻿";
/** Excel/LibreOffice tratam células iniciadas por estes caracteres como fórmula. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  // Apóstrofo neutraliza fórmulas sem alterar o que o Excel exibe.
  const text = FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  if (/[";\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Gera CSV compatível com Excel em português (BOM + ponto-e-vírgula), imune a injeção de fórmula. */
export function toCsv<T extends object>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.label)).join(SEPARATOR);
  const lines = rows.map((row) =>
    columns
      .map((c) => escapeCell(c.get ? c.get(row) : (row as Record<string, unknown>)[c.key]))
      .join(SEPARATOR),
  );
  return BOM + [header, ...lines].join("\r\n") + "\r\n";
}
