import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { attachmentMetaSchema, MAX_ATTACHMENT_BYTES } from "@/features/attachments/schema";
import { addAttachment } from "@/features/attachments/service";
import { DomainError } from "@/lib/result";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Folga para os cabeçalhos/limites do multipart. */
const MAX_BODY_BYTES = MAX_ATTACHMENT_BYTES + 64 * 1024;

class BodyTooLarge extends Error {}

/**
 * Reencapsula o corpo num stream que aborta assim que passar do limite —
 * o tamanho é imposto enquanto chega, não depois de tudo estar na memória.
 */
function cappedRequest(request: Request, maxBytes: number): Request {
  if (!request.body) return request;
  const reader = request.body.getReader();
  let total = 0;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) return controller.close();
      total += value.byteLength;
      if (total > maxBytes) {
        controller.error(new BodyTooLarge());
        await reader.cancel();
        return;
      }
      controller.enqueue(value);
    },
    cancel() {
      return reader.cancel();
    },
  });
  return new Request(request.url, { method: request.method, headers: request.headers, body, duplex: "half" } as RequestInit);
}

/**
 * Upload de proposta/documento (multipart): campos `clientId`, `kind`, `title`, `file`.
 * Fica numa rota (e não em server action) para não esbarrar no limite de 1 MB do corpo.
 */
export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ error: "Arquivo acima de 10 MB." }, { status: 413 });

  let form: FormData;
  try {
    form = await cappedRequest(request, MAX_BODY_BYTES).formData();
  } catch (error) {
    if (error instanceof BodyTooLarge) return NextResponse.json({ error: "Arquivo acima de 10 MB." }, { status: 413 });
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }
  const meta = attachmentMetaSchema.safeParse({
    clientId: form.get("clientId"),
    kind: form.get("kind") ?? "proposta",
    title: form.get("title") ?? "",
  });
  const file = form.get("file");
  if (!meta.success || !(file instanceof File)) return NextResponse.json({ error: "Envio inválido." }, { status: 400 });

  try {
    const db = await getDb();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const saved = await addAttachment(db, getStorage(), { ...meta.data, fileName: file.name, mimeType: file.type, bytes });
    revalidatePath(`/clientes/${saved.clientId}`);
    revalidatePath("/aprovados");
    return NextResponse.json({ ok: true, attachment: saved }, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: 422 });
    console.error("[upload]", error);
    return NextResponse.json({ error: "Não foi possível salvar o arquivo." }, { status: 500 });
  }
}
