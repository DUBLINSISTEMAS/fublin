"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "./avatar";
import { toast } from "./toast";

type Props = {
  kind: "lider" | "perfil";
  id?: string;
  name: string;
  photoKey: string | null;
  size?: number;
  className?: string;
};

const MAX_SIDE = 512;
const JPEG_QUALITY = 0.86;

/**
 * Reduz a foto no navegador (celular manda 4–8 MB) para um JPEG de até 512px.
 * Se o navegador não decodificar (HEIC no Chrome), envia o original.
 */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const side = Math.min(bitmap.width, bitmap.height) * scale;
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // Recorte central quadrado: a foto já chega pronta para o círculo.
    const sx = (bitmap.width - side / scale) / 2;
    const sy = (bitmap.height - side / scale) / 2;
    ctx.drawImage(bitmap, sx, sy, side / scale, side / scale, 0, 0, side, side);
    bitmap.close();
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", JPEG_QUALITY));
  } catch {
    return file;
  }
}

/** Avatar com botão de trocar/remover foto; o upload vai para /api/fotos. */
export function PhotoUpload({ kind, id, name, photoKey, size = 64, className }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    const body = new FormData();
    body.set("kind", kind);
    if (id) body.set("id", id);
    body.set("file", await shrink(file), "foto.jpg");
    try {
      const res = await fetch("/api/fotos", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) toast.error(data.error ?? "Não foi possível salvar a foto.");
      else {
        toast.success("Foto atualizada.");
        router.refresh();
      }
    } catch {
      toast.error("Sem conexão com o servidor.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch("/api/fotos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id }) });
      if (!res.ok) toast.error("Não foi possível remover a foto.");
      else {
        toast.success("Foto removida.");
        router.refresh();
      }
    } catch {
      toast.error("Sem conexão com o servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <Avatar name={name} photoKey={photoKey} size={size} className={cn(busy && "opacity-50")} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={photoKey ? `Trocar foto de ${name}` : `Adicionar foto de ${name}`}
        title={photoKey ? "Trocar foto" : "Adicionar foto"}
        className="absolute -right-1 -bottom-1 grid size-7 cursor-pointer place-items-center rounded-full bg-dark text-white shadow-card transition-colors hover:bg-dark-2 disabled:opacity-50"
      >
        <Camera className="size-3.5" aria-hidden />
      </button>
      {photoKey ? (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          aria-label={`Remover foto de ${name}`}
          title="Remover foto"
          className="absolute -top-1 -right-1 grid size-6 cursor-pointer place-items-center rounded-full bg-surface text-rose-ink shadow-card transition-colors hover:bg-rose disabled:opacity-50"
        >
          <Trash2 className="size-3" aria-hidden />
        </button>
      ) : null}
      <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
    </div>
  );
}
