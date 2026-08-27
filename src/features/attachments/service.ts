import { desc, eq, sum } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attachments, type Attachment } from "@/db/schema";
import { toIso } from "@/lib/dates";
import { ATTACHMENT_KIND_LABELS } from "@/lib/domain";
import { newId } from "@/lib/ids";
import { DomainError } from "@/lib/result";
import type { Storage } from "@/lib/storage";
import { logActivity } from "@/features/activities/service";
import { getClient, removeFilesQuietly } from "@/features/clients/service";
import { ALLOWED_MIME_TYPES, MAX_ATTACHMENT_BYTES, MAX_TOTAL_UPLOAD_BYTES, sniffMimeType, type AttachmentMeta } from "./schema";

export type NewAttachment = AttachmentMeta & { fileName: string; mimeType: string; bytes: Uint8Array };

/** Valida tipo (pelos bytes), tamanho e cota, grava o arquivo e registra o anexo na timeline. */
export async function addAttachment(db: Db, storage: Storage, input: NewAttachment, now: Date = new Date()): Promise<Attachment> {
  if (input.bytes.byteLength === 0) throw new DomainError("Arquivo vazio.");
  if (input.bytes.byteLength > MAX_ATTACHMENT_BYTES) throw new DomainError("Arquivo acima de 10 MB.");
  const realType = sniffMimeType(input.bytes);
  const ext = realType ? ALLOWED_MIME_TYPES[realType] : undefined;
  if (!realType || !ext) throw new DomainError("Formato não aceito. Envie foto (JPG, PNG, WebP, HEIC) ou PDF.");
  await getClient(db, input.clientId);

  const [{ used }] = await db.select({ used: sum(attachments.sizeBytes) }).from(attachments);
  if (Number(used ?? 0) + input.bytes.byteLength > MAX_TOTAL_UPLOAD_BYTES) throw new DomainError("Espaço de anexos esgotado (2 GB). Remova arquivos antigos.");

  const id = newId();
  const storageKey = `${input.clientId}/${id}.${ext}`;
  await storage.write(storageKey, input.bytes);
  const row: Attachment = {
    id,
    clientId: input.clientId,
    kind: input.kind,
    title: input.title ?? defaultTitle(input.fileName),
    fileName: input.fileName.slice(0, 200),
    mimeType: realType,
    sizeBytes: input.bytes.byteLength,
    storageKey,
    createdAt: toIso(now),
  };
  await db.insert(attachments).values(row);
  await logActivity(db, input.clientId, "anexo", `Anexou ${ATTACHMENT_KIND_LABELS[row.kind].toLowerCase()}: ${row.title}`, now);
  return row;
}

export async function listAttachments(db: Db, clientId: string): Promise<Attachment[]> {
  return db.query.attachments.findMany({ where: eq(attachments.clientId, clientId), orderBy: [desc(attachments.createdAt)] });
}

export async function getAttachment(db: Db, id: string): Promise<Attachment> {
  const row = await db.query.attachments.findFirst({ where: eq(attachments.id, id) });
  if (!row) throw new DomainError("Anexo não encontrado.");
  return row;
}

export async function deleteAttachment(db: Db, storage: Storage, id: string, now: Date = new Date()): Promise<Attachment> {
  const row = await getAttachment(db, id);
  await db.delete(attachments).where(eq(attachments.id, id));
  await logActivity(db, row.clientId, "anexo", `Removeu anexo: ${row.title}`, now);
  await removeFilesQuietly(storage, [row.storageKey]);
  return row;
}

function defaultTitle(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base ? base.slice(0, 120) : "Anexo";
}
