import writeXlsxFile, { type Cell, type SheetData } from "write-excel-file/node";
import { fromIso } from "./dates";

/**
 * Planilhas .xlsx nativas (write-excel-file), com colunas tipadas:
 * - `money` recebe CENTAVOS e vira número em reais com formato de moeda;
 * - `integer` vira número inteiro;
 * - `date`/`datetime` recebem ISO (ou `Date`) e viram data do Excel no dia/hora
 *   LOCAL — o mesmo que a UI mostra — e não no instante UTC;
 * - `text` vira texto (nunca fórmula: "=SOMA(...)" fica literal).
 * Nome da aba: até 31 caracteres, sem `\ / ? * [ ] :` (limite do Excel).
 */
export type XlsxColumnType = "text" | "money" | "integer" | "date" | "datetime";

export type XlsxCellValue = string | number | Date | null | undefined;

export type XlsxColumn<T> = {
  label: string;
  type: XlsxColumnType;
  /** Largura em "caracteres"; sem valor usa o padrão do tipo. */
  width?: number;
  get: (row: T) => XlsxCellValue;
};

export type WorkbookInput<T> = { sheetName: string; columns: readonly XlsxColumn<T>[]; rows: readonly T[] };

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Formatos do Excel. O "R$" vai entre aspas para ser literal, não código de formato. */
export const MONEY_FORMAT = '"R$" #,##0.00';
export const INTEGER_FORMAT = "0";
export const DATE_FORMAT = "dd/mm/yyyy";
export const DATETIME_FORMAT = "dd/mm/yyyy hh:mm";

const HEADER_BACKGROUND = "#E7ECF1";
const DEFAULT_WIDTH: Record<XlsxColumnType, number> = { text: 24, money: 16, integer: 12, date: 12, datetime: 18 };
const RIGHT_ALIGNED: ReadonlySet<XlsxColumnType> = new Set(["money", "integer", "date", "datetime"]);

function invalid<T>(column: XlsxColumn<T>, value: XlsxCellValue): TypeError {
  return new TypeError(`Coluna "${column.label}" (${column.type}) recebeu um valor inválido: ${String(value)}`);
}

function requireText<T>(column: XlsxColumn<T>, value: XlsxCellValue): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  throw invalid(column, value);
}

function requireNumber<T>(column: XlsxColumn<T>, value: XlsxCellValue): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw invalid(column, value);
}

function requireDate<T>(column: XlsxColumn<T>, value: XlsxCellValue): Date {
  const date = value instanceof Date ? value : typeof value === "string" ? fromIso(value) : null;
  if (!date || Number.isNaN(date.getTime())) throw invalid(column, value);
  return date;
}

/** A lib grava o instante UTC; aqui o relógio local vira "UTC" para o Excel exibir o mesmo dia/hora da UI. */
function localAsUtc(date: Date, withTime: boolean): Date {
  const utc = withTime
    ? Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes())
    : Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return new Date(utc);
}

function headerCell<T>(column: XlsxColumn<T>): Cell {
  return { value: column.label, type: String, fontWeight: "bold", backgroundColor: HEADER_BACKGROUND, align: RIGHT_ALIGNED.has(column.type) ? "right" : "left" };
}

function bodyCell<T>(column: XlsxColumn<T>, value: XlsxCellValue): Cell {
  if (value === null || value === undefined || value === "") return null;
  switch (column.type) {
    case "text":
      return { value: requireText(column, value), type: String };
    case "money":
      return { value: requireNumber(column, value) / 100, type: Number, format: MONEY_FORMAT };
    case "integer":
      return { value: Math.trunc(requireNumber(column, value)), type: Number, format: INTEGER_FORMAT };
    case "date":
      return { value: localAsUtc(requireDate(column, value), false), type: Date, format: DATE_FORMAT };
    case "datetime":
      return { value: localAsUtc(requireDate(column, value), true), type: Date, format: DATETIME_FORMAT };
  }
}

/** Gera o .xlsx em memória: cabeçalho em negrito com fundo claro (congelado) + uma linha por item. */
export async function buildWorkbook<T>({ sheetName, columns, rows }: WorkbookInput<T>): Promise<Buffer> {
  const header = columns.map((column) => headerCell(column));
  const body = rows.map((row) => columns.map((column) => bodyCell(column, column.get(row))));
  const data: SheetData = [header, ...body];
  return writeXlsxFile(data, {
    sheet: sheetName,
    columns: columns.map((column) => ({ width: column.width ?? DEFAULT_WIDTH[column.type] })),
    stickyRowsCount: 1,
  }).toBuffer();
}

/** Resposta de download: MIME do Excel, `attachment; filename="...xlsx"` e sem cache. */
export function xlsxResponse(buffer: Buffer, filename: string): Response {
  const safe = filename.replace(/[^\w.-]+/g, "-");
  const name = safe.endsWith(".xlsx") ? safe : `${safe}.xlsx`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
