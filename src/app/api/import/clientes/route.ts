import readXlsxFile, { type SheetData } from "read-excel-file/node";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { importClientRows } from "@/features/clients/import";
import { apiAuth } from "@/features/auth/api";
import { rejectCrossOriginMutation } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Importação de clientes por planilha.
 *
 * Duas falhas bem diferentes, dois desfechos:
 * - não deu para ler o arquivo → 400 e nada foi gravado;
 * - a importação começou e parou no meio → 207 com `{ imported, skipped, errors, error }`,
 *   porque as linhas já gravadas continuam valendo e o dono precisa saber onde parou.
 */
export async function POST(request: Request) {
  const denied = await apiAuth(true);
  if (denied) return denied;
  const forbidden = rejectCrossOriginMutation(request);
  if (forbidden) return forbidden;

  let rows: SheetData;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "Escolha uma planilha .xlsx." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "A planilha deve ter no máximo 5 MB." }, { status: 413 });
    const sheets = await readXlsxFile(Buffer.from(await file.arrayBuffer()));
    rows = sheets[0]?.data ?? [];
  } catch (error) {
    console.error("[import/clientes] planilha ilegível", error);
    return NextResponse.json({ error: "Não foi possível ler a planilha." }, { status: 400 });
  }

  let result;
  try {
    result = await importClientRows(await getDb(), rows);
  } catch (error) {
    // `importClientRows` já devolve o parcial quando uma linha falha; aqui só sobra
    // o que acontece antes de qualquer gravação (banco fora do ar, por exemplo).
    console.error("[import/clientes] importação não iniciou", error);
    return NextResponse.json({ error: "Não foi possível importar agora. Tente de novo em instantes." }, { status: 503 });
  }

  revalidatePath("/");
  revalidatePath("/clientes");
  return NextResponse.json(result, { status: result.error ? 207 : 200 });
}
