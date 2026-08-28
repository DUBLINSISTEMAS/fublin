"use client";

import { useActionState, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { ActionError } from "@/components/ui/action-error";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionToast } from "@/components/ui/toast";
import { formatDate, formatTime, fromIso } from "@/lib/dates";
import type { Tone } from "@/lib/domain";
import { OK } from "@/lib/result";
import { formatBytes } from "@/lib/text";
import { restoreBackupAction } from "../actions";
import { BACKUP_KIND_LABELS, type BackupInfo, type BackupKind } from "../schema";

const KIND_TONE: Record<BackupKind, Tone> = { auto: "info", manual: "success", seguranca: "warning", importado: "neutral" };

export const RESTORE_QUESTION = "Restaurar este backup? O que está no sistema agora será guardado num backup de segurança antes.";

export function BackupList({ backups }: { backups: BackupInfo[] }) {
  if (backups.length === 0) {
    return <p className="text-[13px] text-muted">Nenhum backup ainda. O primeiro é feito sozinho meio minuto depois de abrir o sistema — ou clique em “Fazer backup agora”.</p>;
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface-2">
      {backups.map((backup) => (
        <BackupRow key={backup.id} backup={backup} />
      ))}
    </ul>
  );
}

function BackupRow({ backup }: { backup: BackupInfo }) {
  const when = fromIso(backup.createdAt);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-ink">
          <span className="tabular-nums">
            {formatDate(when)} às {formatTime(when)}
          </span>
          <Badge tone={KIND_TONE[backup.kind]} className="h-6 text-[12px]">
            {BACKUP_KIND_LABELS[backup.kind]}
          </Badge>
        </p>
        <p className="mt-0.5 text-[13px] text-muted">
          <span className="tabular-nums">{formatBytes(backup.sizeBytes)}</span> · <span className="font-mono text-[12px]">{backup.id}</span>
        </p>
      </div>
      <a href={`/api/backup/${backup.id}`} className={buttonClasses("ghost", "sm")}>
        <Download className="size-4" aria-hidden />
        Baixar (.zip)
      </a>
      <RestoreButton id={backup.id} />
    </li>
  );
}

/**
 * Restauração em dois passos, sem `window.confirm` (mesma forma do `<ConfirmButton>`, que tem
 * "Tem certeza?"/"Excluindo…" fixos e por isso não serve para restaurar).
 */
function RestoreButton({ id }: { id: string }) {
  const [arming, setArming] = useState(false);
  const [state, formAction] = useActionState(restoreBackupAction, OK);
  useActionToast(state, "Backup restaurado.");

  // Estado derivado durante o render: depois de restaurar com sucesso, fecha a confirmação.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.ok) setArming(false);
  }

  if (!arming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setArming(true)}>
        <RotateCcw className="size-4" aria-hidden />
        Restaurar
      </Button>
    );
  }
  return (
    <form action={formAction} className="flex basis-full flex-wrap items-center gap-2 rounded-card bg-sun p-3 text-[13px] text-sun-ink">
      <input type="hidden" name="id" value={id} />
      <span className="min-w-0 flex-1 basis-60">{RESTORE_QUESTION}</span>
      <SubmitButton variant="dark" size="sm" pendingLabel="Restaurando…">
        Sim, restaurar
      </SubmitButton>
      <Button variant="ghost" size="sm" onClick={() => setArming(false)}>
        Cancelar
      </Button>
      <ActionError state={state} className="basis-full text-rose-ink" />
    </form>
  );
}
