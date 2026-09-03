import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { leaders } from "@/db/schema";
import { ALLOWED_MIME_TYPES, sniffMimeType } from "@/features/attachments/schema";
import { removeFilesQuietly } from "@/features/clients/service";
import { getSetting, patchSetting } from "@/features/settings/service";
import { DomainError } from "@/lib/result";
import type { Storage } from "@/lib/storage";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_KINDS = ["lider", "perfil"] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

export type PhotoInput = { kind: PhotoKind; id?: string; bytes: Uint8Array };

/** Sufixo aleatório: a chave muda a cada troca, então o navegador nunca mostra a foto antiga do cache. */
function stamp(): string {
  return crypto.randomUUID().slice(0, 8);
}

/** Tipo de imagem pelo conteúdo (nunca pelo nome), ou erro amigável. */
function imageExtension(bytes: Uint8Array): string {
  if (bytes.byteLength === 0) throw new DomainError("Arquivo vazio.");
  if (bytes.byteLength > MAX_PHOTO_BYTES) throw new DomainError("Foto acima de 5 MB.");
  const type = sniffMimeType(bytes);
  const ext = type && type.startsWith("image/") ? ALLOWED_MIME_TYPES[type] : undefined;
  if (!ext) throw new DomainError("Envie uma foto (JPG, PNG, WebP ou HEIC).");
  return ext;
}

/**
 * Grava a foto, aponta o registro para ela e só então apaga a anterior.
 *
 * Ordem importa: arquivo novo → registro → apagar o antigo. Se o registro não
 * entrar, o arquivo recém-gravado é desfeito (nada de lixo sem dono) e a foto
 * antiga continua no lugar. Devolve a nova chave.
 */
export async function savePhoto(db: Db, storage: Storage, input: PhotoInput): Promise<string> {
  const ext = imageExtension(input.bytes);
  if (input.kind === "lider") {
    if (!input.id) throw new DomainError("Líder não informado.");
    const leaderId = input.id;
    const key = `lideres/${leaderId}-${stamp()}.${ext}`;
    await storage.write(key, input.bytes);
    const previous = await pointLeaderPhoto(db, storage, leaderId, key);
    if (previous) await removeFilesQuietly(storage, [previous]);
    return key;
  }
  const key = `perfil/avatar-${stamp()}.${ext}`;
  await storage.write(key, input.bytes);
  const previous = await pointProfilePhoto(db, storage, key);
  if (previous) await removeFilesQuietly(storage, [previous]);
  return key;
}

/** Aponta o líder para `key` e devolve a chave anterior; desfaz o arquivo novo se o banco recusar. */
async function pointLeaderPhoto(db: Db, storage: Storage, leaderId: string, key: string | null): Promise<string | null> {
  try {
    return await db.transaction(async (tx) => {
      const leader = await tx.query.leaders.findFirst({ where: eq(leaders.id, leaderId) });
      if (!leader) throw new DomainError("Líder não encontrado.");
      await tx.update(leaders).set({ photoKey: key }).where(eq(leaders.id, leaderId));
      return leader.photoKey;
    });
  } catch (error) {
    if (key) await removeFilesQuietly(storage, [key]);
    throw error;
  }
}

/** Idem para a foto do perfil (settings). Lê e grava na mesma transação: nada de update perdido. */
async function pointProfilePhoto(db: Db, storage: Storage, key: string | null): Promise<string | null> {
  try {
    return await db.transaction(async (tx) => {
      const previous = (await getSetting(tx, "profile")).photoKey;
      await patchSetting(tx, "profile", { photoKey: key });
      return previous;
    });
  } catch (error) {
    if (key) await removeFilesQuietly(storage, [key]);
    throw error;
  }
}

/** Remove a foto (registro + arquivo). O arquivo só some depois que o banco confirma. */
export async function removePhoto(db: Db, storage: Storage, kind: PhotoKind, id?: string): Promise<void> {
  if (kind === "lider") {
    if (!id) throw new DomainError("Líder não informado.");
    const previous = await pointLeaderPhoto(db, storage, id, null);
    if (previous) await removeFilesQuietly(storage, [previous]);
    return;
  }
  const previous = await pointProfilePhoto(db, storage, null);
  if (previous) await removeFilesQuietly(storage, [previous]);
}
