import { z } from "zod";

/** Nome da pasta de um backup: "2026-08-27_1430", "2026-08-27_1430-importado", "2026-08-27_1431-seguranca"… */
export const BACKUP_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

/** Ações que recebem o id de um backup (restaurar). */
export const backupIdSchema = z.object({ id: z.string().regex(BACKUP_ID_RE, "Backup inválido.") });

export const BACKUP_KINDS = ["auto", "manual", "seguranca", "importado"] as const;
export type BackupKind = (typeof BACKUP_KINDS)[number];

export const BACKUP_KIND_LABELS: Record<BackupKind, string> = {
  auto: "Automático",
  manual: "Manual",
  seguranca: "Segurança",
  importado: "Importado",
};

export const MANIFEST_VERSION = 1;

/** `manifest.json` dentro da pasta do backup. `kind` e `degraded` são opcionais para aceitar manifests antigos. */
export const manifestSchema = z.object({
  version: z.literal(MANIFEST_VERSION),
  createdAt: z.iso.datetime(),
  appDbBytes: z.number().int().nonnegative(),
  uploadsBytes: z.number().int().nonnegative(),
  kind: z.enum(BACKUP_KINDS).default("manual"),
  /** O VACUUM INTO falhou e o banco foi copiado com o app escrevendo: pode estar num meio-termo. */
  degraded: z.boolean().default(false),
});
export type BackupManifest = z.infer<typeof manifestSchema>;

/** Resumo de um backup para a listagem (serializável para o cliente). */
export type BackupInfo = { id: string; createdAt: string; sizeBytes: number; kind: BackupKind; degraded: boolean };

/** Zip importado pela tela de configurações: até 200 MB. */
export const MAX_IMPORT_BYTES = 200 * 1024 * 1024;

/** Teto do conteúdo descompactado (anexos já vêm comprimidos, então 3x é folga; barra zip-bomb). */
export const MAX_IMPORT_UNZIPPED_BYTES = 3 * MAX_IMPORT_BYTES;

/** Quantos backups ficam na pasta depois da limpeza diária. */
export const DEFAULT_KEEP = 30;
