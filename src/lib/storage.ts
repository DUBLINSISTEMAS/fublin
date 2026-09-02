import fs from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";
import { usesCloudStorage } from "./runtime";

/** Chave: "<clientId>/<attachmentId>.<ext>" — nada de barras extras, pontos duplos ou maiúsculas. */
const KEY_RE = /^[a-z0-9-]{1,64}\/[a-z0-9-]{1,64}\.[a-z0-9]{1,8}$/;

export function assertStorageKey(key: string): void {
  if (!KEY_RE.test(key)) throw new Error(`Chave de armazenamento inválida: ${key}`);
}

export interface Storage {
  write(key: string, bytes: Uint8Array): Promise<void>;
  read(key: string): Promise<Uint8Array>;
  remove(key: string): Promise<void>;
}

/** Arquivos em disco, dentro de uma pasta raiz (padrão: data/uploads). */
export function createFileStorage(rootDir: string): Storage {
  const resolve = (key: string) => {
    assertStorageKey(key);
    return path.join(rootDir, ...key.split("/"));
  };
  return {
    async write(key, bytes) {
      const file = resolve(key);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, bytes);
    },
    async read(key) {
      return fs.readFile(resolve(key));
    },
    async remove(key) {
      await fs.rm(resolve(key), { force: true });
    },
  };
}

/** Em memória, para testes. */
export function createMemoryStorage(): Storage & { files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  return {
    files,
    async write(key, bytes) {
      assertStorageKey(key);
      files.set(key, bytes);
    },
    async read(key) {
      const found = files.get(key);
      if (!found) throw new Error("Arquivo não encontrado.");
      return found;
    },
    async remove(key) {
      files.delete(key);
    },
  };
}

const BLOB_PREFIX = "relacionador/";

/** Armazenamento privado e persistente para produção na Vercel. */
export function createBlobStorage(token = process.env.BLOB_READ_WRITE_TOKEN): Storage {
  if (!token) throw new Error("Arquivos não configurados: conecte um Vercel Blob privado e defina BLOB_READ_WRITE_TOKEN.");
  const blobKey = (key: string) => {
    assertStorageKey(key);
    return `${BLOB_PREFIX}${key}`;
  };
  return {
    async write(key, bytes) {
      await put(blobKey(key), Buffer.from(bytes), { access: "private", addRandomSuffix: false, token });
    },
    async read(key) {
      const result = await get(blobKey(key), { access: "private", token, useCache: true });
      if (!result || result.statusCode !== 200) throw new Error("Arquivo não encontrado.");
      return new Uint8Array(await new Response(result.stream).arrayBuffer());
    },
    async remove(key) {
      await del(blobKey(key), { token });
    },
  };
}

const globalForStorage = globalThis as unknown as { __relacionadorStorage?: Storage };

export function getStorage(): Storage {
  if (!globalForStorage.__relacionadorStorage) {
    if (usesCloudStorage()) globalForStorage.__relacionadorStorage = createBlobStorage();
    else {
      const root = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "data", "uploads");
      globalForStorage.__relacionadorStorage = createFileStorage(root);
    }
  }
  return globalForStorage.__relacionadorStorage;
}
