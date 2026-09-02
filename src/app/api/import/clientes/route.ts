import readXlsxFile from "read-excel-file/node";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { importClientRows } from "@/features/clients/import";
import { apiAuth } from "@/features/auth/api";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const denied = await apiAuth(true); if (denied) return denied;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "Escolha uma planilha .xlsx." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "A planilha deve ter no máximo 5 MB." }, { status: 413 });
    const sheets = await readXlsxFile(Buffer.from(await file.arrayBuffer()));
    const result = await importClientRows(await getDb(), sheets[0]?.data ?? []);
    revalidatePath("/"); revalidatePath("/clientes");
    return NextResponse.json(result);
  } catch (error) {
    console.error("[import/clientes]", error);
    return NextResponse.json({ error: "Não foi possível ler a planilha." }, { status: 400 });
  }
}
