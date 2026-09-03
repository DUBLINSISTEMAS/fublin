import type { z } from "zod";
import type { SheetData } from "read-excel-file/node";
import type { Db } from "@/db/client";
import { errorMessage } from "@/lib/actions";
import { INTEREST_LABELS, INTERESTS, SOURCE_LABELS, SOURCES } from "@/lib/domain";
import { clientInputSchema } from "./schema";
import { createClient, findDuplicatePhone } from "./service";

/**
 * `error` só aparece quando a importação parou no meio (banco fora do ar, por
 * exemplo): as linhas de `imported` já estão salvas e o dono precisa saber o
 * porquê da parada em vez de achar que a planilha acabou.
 */
export type ClientImportResult = { imported: number; skipped: number; errors: string[]; error?: string };

/** Planilha maior que isso trava o servidor por minutos: melhor recusar e pedir para dividir. */
export const MAX_IMPORT_ROWS = 2000;

/** Quantas linhas com erro são listadas antes do resumo "…e mais N". */
const MAX_LISTED_ERRORS = 20;

const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const HEADER_ALIASES: Record<string, string> = { nome: "name", cliente: "name", telefone: "phone", celular: "phone", whatsapp: "phone", email: "email", interesse: "interest", origem: "source", observacoes: "notes", observacao: "notes", detalhes: "interestNotes", "detalhe do interesse": "interestNotes", carta: "credit", "valor da carta": "credit" };

/** Nome do campo como o dono o vê na planilha — o erro precisa dizer qual coluna arrumar. */
const FIELD_LABELS: Record<string, string> = {
  name: "nome",
  phone: "telefone",
  email: "e-mail",
  interest: "interesse",
  interestNotes: "detalhe do interesse",
  source: "origem",
  credit: "carta",
  adesao: "adesão",
  installmentMin: "parcela (de)",
  installmentMax: "parcela (até)",
  attendance: "atendimento",
  status: "status",
  leaderId: "líder",
  firstVisitDay: "primeira visita",
  scheduleDay: "dia do agendamento",
  scheduleTime: "horário do agendamento",
  notes: "observações",
};

function enumValue<T extends string>(value: unknown, values: readonly T[], labels: Record<T, string>): T | undefined {
  const wanted = normalize(value);
  return values.find((item) => normalize(item) === wanted || normalize(labels[item]) === wanted);
}

/** "telefone, interesse" — as colunas que o Zod recusou nessa linha. */
function invalidFields(error: z.ZodError): string {
  const keys = [...new Set(error.issues.map((issue) => String(issue.path[0] ?? "")).filter(Boolean))];
  const labels = keys.map((key) => FIELD_LABELS[key] ?? key);
  return labels.length > 0 ? labels.join(", ") : "dados inválidos";
}

export async function importClientRows(db: Db, rows: SheetData): Promise<ClientImportResult> {
  if (rows.length < 2) return { imported: 0, skipped: 0, errors: ["A planilha precisa ter cabeçalho e pelo menos uma linha."] };
  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    return { imported: 0, skipped: rows.length - 1, errors: [`A planilha tem ${rows.length - 1} linhas; o limite por importação é ${MAX_IMPORT_ROWS}. Divida em partes menores.`] };
  }
  const headers = rows[0].map((cell) => HEADER_ALIASES[normalize(cell)] ?? normalize(cell));
  if (!headers.includes("name") || !headers.includes("phone") || !headers.includes("interest")) return { imported: 0, skipped: rows.length - 1, errors: ["Use as colunas obrigatórias: Nome, Telefone e Interesse."] };
  const result: ClientImportResult = { imported: 0, skipped: 0, errors: [] };
  try {
    for (let index = 1; index < rows.length; index += 1) {
      const raw = Object.fromEntries(headers.map((header, column) => [header, rows[index][column]]));
      if (!String(raw.name ?? "").trim() && !String(raw.phone ?? "").trim()) continue;
      const interest = enumValue(raw.interest, INTERESTS, INTEREST_LABELS);
      const source = enumValue(raw.source, SOURCES, SOURCE_LABELS);
      const parsed = clientInputSchema.safeParse({ ...raw, name: String(raw.name ?? ""), phone: String(raw.phone ?? ""), email: raw.email ? String(raw.email) : undefined, interest, source, credit: raw.credit ? String(raw.credit) : undefined, notes: raw.notes ? String(raw.notes) : undefined, interestNotes: raw.interestNotes ? String(raw.interestNotes) : undefined });
      if (!parsed.success) { result.skipped += 1; result.errors.push(`Linha ${index + 1}: ${invalidFields(parsed.error)}.`); continue; }
      const duplicate = await findDuplicatePhone(db, parsed.data.phone);
      if (duplicate) { result.skipped += 1; result.errors.push(`Linha ${index + 1}: telefone já pertence a ${duplicate.name}.`); continue; }
      await createClient(db, parsed.data);
      result.imported += 1;
    }
  } catch (error) {
    // Nada de estourar para cima: as linhas já gravadas contam, e o dono precisa da causa.
    result.error = errorMessage(error);
  }
  return { ...result, errors: trimErrors(result.errors) };
}

function trimErrors(errors: string[]): string[] {
  if (errors.length <= MAX_LISTED_ERRORS) return errors;
  const rest = errors.length - MAX_LISTED_ERRORS;
  return [...errors.slice(0, MAX_LISTED_ERRORS), `…e mais ${rest} ${rest === 1 ? "linha" : "linhas"} com erro.`];
}
