import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { MAX_PHOTO_BYTES, PHOTO_KINDS, removePhoto, savePhoto } from "@/features/photos/service";
import { DomainError } from "@/lib/result";
import { getStorage } from "@/lib/storage";
import { optionalString } from "@/lib/validation";

export const dynamic = "force-dynamic";

const targetSchema = z.object({ kind: z.enum(PHOTO_KINDS), id: optionalString(z.string().max(64)) });

function fail(error: unknown) {
  if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: 422 });
  console.error("[fotos]", error);
  return NextResponse.json({ error: "Não foi possível salvar a foto." }, { status: 500 });
}

/** Troca a foto de um líder (`kind=lider&id=`) ou do perfil (`kind=perfil`). Multipart com campo `file`. */
export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_PHOTO_BYTES + 64 * 1024) return NextResponse.json({ error: "Foto acima de 5 MB." }, { status: 413 });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }
  const target = targetSchema.safeParse({ kind: form.get("kind"), id: form.get("id") ?? "" });
  const file = form.get("file");
  if (!target.success || !(file instanceof File)) return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  try {
    const db = await getDb();
    const key = await savePhoto(db, getStorage(), { ...target.data, bytes: new Uint8Array(await file.arrayBuffer()) });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, key }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

/** Remove a foto (`kind`, `id` no corpo JSON). */
export async function DELETE(request: Request) {
  const target = targetSchema.safeParse(await request.json().catch(() => ({})));
  if (!target.success) return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  try {
    const db = await getDb();
    await removePhoto(db, getStorage(), target.data.kind, target.data.id);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
