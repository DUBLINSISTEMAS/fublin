/** Copia fotos e anexos locais para o Blob privado, preservando as chaves do banco. */
import fs from "node:fs/promises";
import path from "node:path";
import { createBlobStorage } from "../lib/storage";

async function filesBelow(root: string, relative = ""): Promise<string[]> {
  const dir = path.join(root, relative);
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const results: string[] = [];
  for (const entry of entries) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) results.push(...await filesBelow(root, child));
    else results.push(child);
  }
  return results;
}

async function main() {
  const root = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "data", "uploads");
  const storage = createBlobStorage();
  const keys = await filesBelow(root);
  for (const key of keys) {
    await storage.write(key, new Uint8Array(await fs.readFile(path.join(root, ...key.split("/")))));
    console.log(`Enviado: ${key}`);
  }
  console.log(`${keys.length} arquivo(s) copiado(s) para o Blob privado.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
