import { NextResponse } from "next/server";
import { BACKUP_ID_RE } from "@/features/backup/schema";
import { exportBackupZip, resolveBackupDir } from "@/features/backup/service";
import { DomainError } from "@/lib/result";
import { apiAuth } from "@/features/auth/api";
import { localBackupsAvailable } from "@/lib/runtime";

export const dynamic = "force-dynamic";

/** Baixa a pasta do backup como .zip (banco + anexos + manifest). */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await apiAuth(true); if (denied) return denied;
  if (!localBackupsAvailable()) return NextResponse.json({ error: "Backup local não está disponível na versão online." }, { status: 409 });
  const { id } = await context.params;
  if (!BACKUP_ID_RE.test(id)) return NextResponse.json({ error: "Backup inválido." }, { status: 400 });
  try {
    const zip = await exportBackupZip({ backupDir: resolveBackupDir(), id });
    return new Response(zip as Uint8Array<ArrayBuffer>, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(zip.byteLength),
        "Content-Disposition": `attachment; filename="relacionador-backup-${id}.zip"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error("[backup]", error);
    return NextResponse.json({ error: "Não foi possível gerar o arquivo do backup." }, { status: 500 });
  }
}
