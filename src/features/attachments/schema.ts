import { z } from "zod";
import { ATTACHMENT_KINDS } from "@/lib/domain";
import { optionalString } from "@/lib/validation";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
/** Cota total de uploads (soma dos anexos guardados). */
export const MAX_TOTAL_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

/** Tipos aceitos e a extensão gravada em disco (nunca confiamos no nome do arquivo). */
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

const ascii = (bytes: Uint8Array, start: number, text: string) => bytes.length >= start + text.length && text.split("").every((ch, i) => bytes[start + i] === ch.charCodeAt(0));

/**
 * Descobre o tipo real pelos bytes iniciais (magic numbers). O `file.type` que o
 * navegador manda é só uma dica — quem manda é o conteúdo.
 */
export function sniffMimeType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, "PNG")) return "image/png";
  if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) return "image/webp";
  if (ascii(bytes, 0, "%PDF")) return "application/pdf";
  if (ascii(bytes, 4, "ftyp")) {
    const brand = String.fromCharCode(...bytes.slice(8, 12));
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) return "image/heic";
  }
  return null;
}

export const attachmentMetaSchema = z.object({
  clientId: z.string().min(1),
  kind: z.enum(ATTACHMENT_KINDS).default("proposta"),
  title: optionalString(z.string().trim().max(120, "Título muito longo")),
});
export type AttachmentMeta = z.output<typeof attachmentMetaSchema>;
