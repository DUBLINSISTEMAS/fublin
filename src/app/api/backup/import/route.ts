import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { MAX_IMPORT_BYTES } from "@/features/backup/schema";
import { importBackupZip, resolveBackupDir } from "@/features/backup/service";
import { DomainError } from "@/lib/result";
import { formatBytes } from "@/lib/text";

export const dynamic = "force-dynamic";

/** Folga para os cabeçalhos do multipart. */
const MAX_BODY_BYTES = MAX_IMPORT_BYTES + 64 * 1024;
const TOO_LARGE = `Arquivo acima de ${formatBytes(MAX_IMPORT_BYTES)}.`;

/**
 * Importa um .zip de backup (multipart, campo `file`) para a pasta de backups.
 * Devolve `{ ok, id }`; restaurar é o passo seguinte, na tela de configurações.
 */
export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ error: TOO_LARGE }, { status: 413 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  if (file.size > MAX_IMPORT_BYTES) return NextResponse.json({ error: TOO_LARGE }, { status: 413 });

  try {
    const id = await importBackupZip({ backupDir: resolveBackupDir(), bytes: new Uint8Array(await file.arrayBuffer()) });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: 422 });
    console.error("[backup]", error);
    return NextResponse.json({ error: "Não foi possível importar o backup." }, { status: 500 });
  }
}
