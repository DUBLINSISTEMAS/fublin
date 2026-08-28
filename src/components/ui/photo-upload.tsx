"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "./avatar";
import { PhotoCropper } from "./photo-cropper";
import { toast } from "./toast";

type Props = {
  kind: "lider" | "perfil";
  id?: string;
  name: string;
  photoKey: string | null;
  size?: number;
  className?: string;
};

/**
 * Avatar com botão de trocar/remover foto. A foto escolhida abre o ajuste (enquadrar e
 * aproximar) e sobe já recortada em 512px; se o navegador não decodificar (HEIC no Chrome),
 * sobe o original e o servidor guarda como veio.
 */
export function PhotoUpload({ kind, id, name, photoKey, size = 64, className }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [cropping, setCropping] = useState<{ image: ImageBitmap; fallback: File } | null>(null);

  async function pick(file: File) {
    try {
      setCropping({ image: await createImageBitmap(file), fallback: file });
    } catch {
      toast.info("Este formato não abre no ajuste; enviando a foto como veio.");
      await upload(file);
    }
  }

  async function upload(blob: Blob) {
    setBusy(true);
    const body = new FormData();
    body.set("kind", kind);
    if (id) body.set("id", id);
    body.set("file", blob, "foto.jpg");
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
      <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && void pick(e.target.files[0])} />
      {cropping ? (
        <PhotoCropper
          image={cropping.image}
          title={`Ajustar foto de ${name}`}
          onCancel={() => {
            cropping.image.close();
            setCropping(null);
            if (input.current) input.current.value = "";
          }}
          onConfirm={(blob) => {
            cropping.image.close();
            setCropping(null);
            void upload(blob);
          }}
        />
      ) : null}
    </div>
  );
}
