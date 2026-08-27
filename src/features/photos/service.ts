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

/** Grava a foto, aponta o registro para ela e apaga a anterior. Devolve a nova chave. */
export async function savePhoto(db: Db, storage: Storage, input: PhotoInput): Promise<string> {
  const ext = imageExtension(input.bytes);
  if (input.kind === "lider") {
    if (!input.id) throw new DomainError("Líder não informado.");
    const leader = await db.query.leaders.findFirst({ where: eq(leaders.id, input.id) });
    if (!leader) throw new DomainError("Líder não encontrado.");
    const key = `lideres/${leader.id}-${stamp()}.${ext}`;
    await storage.write(key, input.bytes);
    await db.update(leaders).set({ photoKey: key }).where(eq(leaders.id, leader.id));
    if (leader.photoKey) await removeFilesQuietly(storage, [leader.photoKey]);
    return key;
  }
  const key = `perfil/avatar-${stamp()}.${ext}`;
  const previous = (await getSetting(db, "profile")).photoKey;
  await storage.write(key, input.bytes);
  await patchSetting(db, "profile", { photoKey: key });
  if (previous) await removeFilesQuietly(storage, [previous]);
  return key;
}

/** Remove a foto (registro + arquivo). */
export async function removePhoto(db: Db, storage: Storage, kind: PhotoKind, id?: string): Promise<void> {
  if (kind === "lider") {
    if (!id) throw new DomainError("Líder não informado.");
    const leader = await db.query.leaders.findFirst({ where: eq(leaders.id, id) });
    if (!leader) throw new DomainError("Líder não encontrado.");
    await db.update(leaders).set({ photoKey: null }).where(eq(leaders.id, id));
    if (leader.photoKey) await removeFilesQuietly(storage, [leader.photoKey]);
    return;
  }
  const previous = (await getSetting(db, "profile")).photoKey;
  await patchSetting(db, "profile", { photoKey: null });
  if (previous) await removeFilesQuietly(storage, [previous]);
}
