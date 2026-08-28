"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { DatabaseBackup, HardDriveDownload, Upload } from "lucide-react";
import { ActionError } from "@/components/ui/action-error";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { toast, useActionToast } from "@/components/ui/toast";
import { OK } from "@/lib/result";
import { formatBytes } from "@/lib/text";
import { createBackupAction } from "../actions";
import { MAX_IMPORT_BYTES, type BackupInfo } from "../schema";
import { BackupList } from "./backup-list";

export type BackupPanelProps = {
  /** Do mais novo ao mais antigo (`listBackups()`). */
  backups: BackupInfo[];
  /** Pasta onde os backups ficam, para o dono saber onde procurar. */
  backupDir: string;
};

/** Backup automático + manual, download em .zip, importação e restauração em dois passos. */
export function BackupPanel({ backups, backupDir }: BackupPanelProps) {
  const [state, formAction] = useActionState(createBackupAction, OK);
  useActionToast(state, "Backup criado.");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2">
            <DatabaseBackup className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-ink">Backup automático todo dia à meia-noite</p>
            <p className="mt-1 text-sm text-muted">
              Enquanto o sistema estiver aberto neste computador; a pasta é <code className="rounded bg-surface-2 px-1 break-all">{backupDir}</code>. Baixe o .zip de vez em quando para um pendrive ou para a nuvem.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:shrink-0">
          <form action={formAction}>
            <SubmitButton variant="secondary" size="sm" pendingLabel="Fazendo backup…">
              <HardDriveDownload className="size-4" aria-hidden />
              Fazer backup agora
            </SubmitButton>
          </form>
          <ImportBackupButton />
        </div>
      </div>
      <ActionError state={state} />
      <BackupList backups={backups} />
    </div>
  );
}

/** Envia um .zip para /api/backup/import; o zip vira uma pasta de backup que o dono restaura em seguida. */
function ImportBackupButton() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error(`O arquivo passa de ${formatBytes(MAX_IMPORT_BYTES)}.`);
      return;
    }
    setBusy(true);
    const body = new FormData();
    body.set("file", file);
    try {
      const res = await fetch("/api/backup/import", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível importar o backup.");
        return;
      }
      toast.success("Backup importado. Agora clique em Restaurar para usá-lo.");
      router.refresh();
    } catch {
      toast.error("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        aria-label="Arquivo de backup (.zip)"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <Button variant="secondary" size="sm" onClick={() => input.current?.click()} disabled={busy}>
        <Upload className="size-4" aria-hidden />
        {busy ? "Importando…" : "Importar backup (.zip)"}
      </Button>
    </>
  );
}
