import { eq, sum } from "drizzle-orm";
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
  // O arquivo vai primeiro (o banco precisa gravar uma chave que já existe); se o
  // registro não entrar, o arquivo é desfeito para não virar lixo sem dono.
  await storage.write(storageKey, input.bytes);
  try {
    await db.transaction(async (tx) => {
      await tx.insert(attachments).values(row);
      await logActivity(tx, input.clientId, "anexo", `Anexou ${ATTACHMENT_KIND_LABELS[row.kind].toLowerCase()}: ${row.title}`, now);
    });
  } catch (error) {
    await removeFilesQuietly(storage, [storageKey]);
    throw error;
  }
  return row;
}

export async function getAttachment(db: Db, id: string): Promise<Attachment> {
  const row = await db.query.attachments.findFirst({ where: eq(attachments.id, id) });
  if (!row) throw new DomainError("Anexo não encontrado.");
  return row;
}

/**
 * Banco primeiro (linha + timeline na mesma transação), arquivo depois: se a
 * timeline falhar, a exclusão inteira volta atrás e o arquivo continua com dono —
 * nunca sobra arquivo órfão nem linha apontando para um arquivo que já sumiu.
 */
export async function deleteAttachment(db: Db, storage: Storage, id: string, now: Date = new Date()): Promise<Attachment> {
  const row = await getAttachment(db, id);
  await db.transaction(async (tx) => {
    await tx.delete(attachments).where(eq(attachments.id, id));
    await logActivity(tx, row.clientId, "anexo", `Removeu anexo: ${row.title}`, now);
  });
  await removeFilesQuietly(storage, [row.storageKey]);
  return row;
}

function defaultTitle(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base ? base.slice(0, 120) : "Anexo";
}
