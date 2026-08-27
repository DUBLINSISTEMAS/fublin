import { NextResponse } from "next/server";
import { assertStorageKey, getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" };

/** Serve uma foto pela chave de armazenamento (`/api/fotos/lideres/<id>-<x>.jpg`). */
export async function GET(_request: Request, context: RouteContext<"/api/fotos/[...key]">) {
  const { key: segments } = await context.params;
  const key = segments.join("/");
  try {
    assertStorageKey(key);
  } catch {
    return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  }
  try {
    const bytes = await getStorage().read(key);
    const ext = key.slice(key.lastIndexOf(".") + 1);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
        // A chave muda a cada troca de foto, então pode ficar no cache à vontade.
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  }
}
