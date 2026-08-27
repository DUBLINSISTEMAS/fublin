import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { clientInputSchema } from "@/features/clients/schema";
import { getClientDetail } from "@/features/clients/queries";
import { createClient, deleteClient } from "@/features/clients/service";
import { assertStorageKey, createMemoryStorage } from "@/lib/storage";
import { sniffMimeType } from "./schema";
import { addAttachment, deleteAttachment, getAttachment } from "./service";

const listAttachments = async (db: Db, clientId: string) => (await getClientDetail(db, clientId))?.attachments ?? [];

const now = new Date(2026, 7, 27, 14, 0);
const pdf = new TextEncoder().encode("%PDF-1.4 fake");
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

let db: Db;
let clientId: string;
let storage: ReturnType<typeof createMemoryStorage>;
beforeEach(async () => {
  db = await createTestDb();
  storage = createMemoryStorage();
  clientId = (await createClient(db, clientInputSchema.parse({ name: "Ana", phone: "11987654321", interest: "imovel" }), now)).id;
});

describe("sniffMimeType", () => {
  it("recognizes the accepted formats by magic bytes", () => {
    expect(sniffMimeType(pdf)).toBe("application/pdf");
    expect(sniffMimeType(png)).toBe("image/png");
    expect(sniffMimeType(jpg)).toBe("image/jpeg");
    expect(sniffMimeType(new TextEncoder().encode("RIFF....WEBPVP8 "))).toBe("image/webp");
    expect(sniffMimeType(new TextEncoder().encode("\0\0\0\x18ftypheic"))).toBe("image/heic");
    expect(sniffMimeType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(sniffMimeType(new Uint8Array(0))).toBeNull();
  });
});

describe("attachments", () => {
  it("stores the file under a safe key, records metadata and logs the timeline", async () => {
    const saved = await addAttachment(db, storage, { clientId, kind: "proposta", title: undefined, fileName: "proposta_carta 300k.pdf", mimeType: "application/pdf", bytes: pdf }, now);
    expect(saved.storageKey).toBe(`${clientId}/${saved.id}.pdf`);
    expect(saved.title).toBe("proposta carta 300k");
    expect(saved.sizeBytes).toBe(pdf.byteLength);
    expect(storage.files.has(saved.storageKey)).toBe(true);
    expect(await listAttachments(db, clientId)).toHaveLength(1);
    expect((await getClientDetail(db, clientId))?.activities[0].content).toBe("Anexou proposta: proposta carta 300k");
    expect((await getAttachment(db, saved.id)).id).toBe(saved.id);
  });

  it("trusts the bytes, not the declared type", async () => {
    // Declarado como PNG, mas o conteúdo é HTML: recusado. Declarado errado, mas é PNG de verdade: aceito como PNG.
    const html = new TextEncoder().encode("<html><script>alert(1)</script>");
    await expect(addAttachment(db, storage, { clientId, kind: "proposta", title: undefined, fileName: "x.png", mimeType: "image/png", bytes: html }, now)).rejects.toThrow("Formato não aceito");
    const saved = await addAttachment(db, storage, { clientId, kind: "documento", title: "RG", fileName: "rg.bin", mimeType: "application/octet-stream", bytes: png }, now);
    expect(saved.mimeType).toBe("image/png");
    expect(saved.storageKey.endsWith(".png")).toBe(true);
  });

  it("rejects empty and oversized files, and unknown client", async () => {
    const meta = { clientId, kind: "proposta" as const, title: undefined, fileName: "x", mimeType: "image/png" };
    await expect(addAttachment(db, storage, { ...meta, bytes: new Uint8Array(0) }, now)).rejects.toThrow("vazio");
    await expect(addAttachment(db, storage, { ...meta, bytes: new Uint8Array(10 * 1024 * 1024 + 1) }, now)).rejects.toThrow("10 MB");
    await expect(addAttachment(db, storage, { ...meta, clientId: "nope", bytes: png }, now)).rejects.toThrow("Cliente não encontrado");
    expect(storage.files.size).toBe(0);
  });

  it("deletes the row and the file; deleting the client removes its files too", async () => {
    const saved = await addAttachment(db, storage, { clientId, kind: "documento", title: "RG", fileName: "rg.jpg", mimeType: "image/jpeg", bytes: jpg }, now);
    await deleteAttachment(db, storage, saved.id, now);
    expect(storage.files.size).toBe(0);
    expect(await listAttachments(db, clientId)).toHaveLength(0);
    await expect(deleteAttachment(db, storage, saved.id, now)).rejects.toThrow("Anexo não encontrado");

    await addAttachment(db, storage, { clientId, kind: "proposta", title: "A", fileName: "a.pdf", mimeType: "application/pdf", bytes: pdf }, now);
    await addAttachment(db, storage, { clientId, kind: "proposta", title: "B", fileName: "b.png", mimeType: "image/png", bytes: png }, now);
    expect(storage.files.size).toBe(2);
    await deleteClient(db, clientId, storage);
    expect(storage.files.size).toBe(0);
  });

  it("storage keys never allow traversal", () => {
    expect(() => assertStorageKey("../etc/passwd")).toThrow();
    expect(() => assertStorageKey("abc/../x.pdf")).toThrow();
    expect(() => assertStorageKey("abc/x.pdf")).not.toThrow();
  });
});
