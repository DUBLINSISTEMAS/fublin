import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getAttachment } from "@/features/attachments/service";
import { DomainError } from "@/lib/result";
import { getStorage } from "@/lib/storage";
import { apiAuth } from "@/features/auth/api";

export const dynamic = "force-dynamic";

/** Serve o arquivo do anexo (inline para imagens/PDF; `?download=1` força download). */
export async function GET(request: Request, context: RouteContext<"/api/anexos/[id]">) {
  const denied = await apiAuth(true); if (denied) return denied;
  const { id } = await context.params;
  try {
    const db = await getDb();
    const attachment = await getAttachment(db, id);
    const bytes = await getStorage().read(attachment.storageKey);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const safeName = attachment.fileName.replace(/[^\w.\-]+/g, "_");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error("[attachment]", error);
    return NextResponse.json({ error: "Não foi possível abrir o arquivo." }, { status: 500 });
  }
}
