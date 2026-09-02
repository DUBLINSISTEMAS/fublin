import type { SheetData } from "read-excel-file/node";
import type { Db } from "@/db/client";
import { INTEREST_LABELS, INTERESTS, SOURCE_LABELS, SOURCES } from "@/lib/domain";
import { clientInputSchema } from "./schema";
import { createClient, findDuplicatePhone } from "./service";

export type ClientImportResult = { imported: number; skipped: number; errors: string[] };
const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const HEADER_ALIASES: Record<string, string> = { nome: "name", cliente: "name", telefone: "phone", celular: "phone", whatsapp: "phone", email: "email", interesse: "interest", origem: "source", observacoes: "notes", observacao: "notes", detalhes: "interestNotes", "detalhe do interesse": "interestNotes", carta: "credit", "valor da carta": "credit" };

function enumValue<T extends string>(value: unknown, values: readonly T[], labels: Record<T, string>): T | undefined {
  const wanted = normalize(value);
  return values.find((item) => normalize(item) === wanted || normalize(labels[item]) === wanted);
}

export async function importClientRows(db: Db, rows: SheetData): Promise<ClientImportResult> {
  if (rows.length < 2) return { imported: 0, skipped: 0, errors: ["A planilha precisa ter cabeçalho e pelo menos uma linha."] };
  const headers = rows[0].map((cell) => HEADER_ALIASES[normalize(cell)] ?? normalize(cell));
  if (!headers.includes("name") || !headers.includes("phone") || !headers.includes("interest")) return { imported: 0, skipped: rows.length - 1, errors: ["Use as colunas obrigatórias: Nome, Telefone e Interesse."] };
  const result: ClientImportResult = { imported: 0, skipped: 0, errors: [] };
  for (let index = 1; index < rows.length; index += 1) {
    const raw = Object.fromEntries(headers.map((header, column) => [header, rows[index][column]]));
    if (!String(raw.name ?? "").trim() && !String(raw.phone ?? "").trim()) continue;
    const interest = enumValue(raw.interest, INTERESTS, INTEREST_LABELS);
    const source = enumValue(raw.source, SOURCES, SOURCE_LABELS);
    const parsed = clientInputSchema.safeParse({ ...raw, name: String(raw.name ?? ""), phone: String(raw.phone ?? ""), email: raw.email ? String(raw.email) : undefined, interest, source, credit: raw.credit ? String(raw.credit) : undefined, notes: raw.notes ? String(raw.notes) : undefined, interestNotes: raw.interestNotes ? String(raw.interestNotes) : undefined });
    if (!parsed.success) { result.skipped += 1; result.errors.push(`Linha ${index + 1}: dados inválidos.`); continue; }
    const duplicate = await findDuplicatePhone(db, parsed.data.phone);
    if (duplicate) { result.skipped += 1; result.errors.push(`Linha ${index + 1}: telefone já pertence a ${duplicate.name}.`); continue; }
    await createClient(db, parsed.data);
    result.imported += 1;
  }
  result.errors = result.errors.slice(0, 20);
  return result;
}
