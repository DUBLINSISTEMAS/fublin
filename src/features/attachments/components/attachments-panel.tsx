"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { Camera, Download, ExternalLink, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import type { Attachment } from "@/db/schema";
import { cn } from "@/lib/cn";
import { formatDate, fromIso } from "@/lib/dates";
import { ATTACHMENT_KIND_LABELS, ATTACHMENT_KINDS, type AttachmentKind } from "@/lib/domain";
import { deleteAttachmentAction } from "../actions";
import { MAX_ATTACHMENT_BYTES } from "../schema";

type Props = { clientId: string; attachments: Attachment[] };

const KIND_CHIP: Record<AttachmentKind, string> = {
  proposta: "bg-accent text-white",
  documento: "bg-sky text-sky-ink",
  comprovante: "bg-lime text-lime-ink",
  outro: "bg-surface-3 text-ink-2",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Propostas e documentos do cliente: envie foto/PDF (arrastando, escolhendo ou pela
 * câmera do celular), veja a galeria e abra/baixe/remova. Upload vai para /api/anexos.
 */
export function AttachmentsPanel({ clientId, attachments }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<AttachmentKind>("proposta");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setError(null);
    for (const file of list) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError(`"${file.name}" passa de 10 MB.`);
        continue;
      }
      setBusy(file.name);
      const body = new FormData();
      body.set("clientId", clientId);
      body.set("kind", kind);
      body.set("file", file);
      try {
        const res = await fetch("/api/anexos", { method: "POST", body });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "Não foi possível enviar o arquivo.");
        }
      } catch {
        setError("Sem conexão com o servidor. Tente de novo.");
      }
    }
    setBusy(null);
    router.refresh();
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    void upload(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-card border-2 border-dashed p-4 transition-colors sm:p-5",
          dragOver ? "border-accent bg-accent-soft/60" : "border-line-strong bg-surface-2/60",
        )}
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
              <Upload className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-ink">{busy ? `Enviando ${busy}…` : "Anexar proposta ou documento"}</p>
              <p className="text-[13px] text-muted">Foto ou PDF, até 10 MB. Arraste aqui ou escolha.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-36">
              <Select aria-label="Tipo do anexo" value={kind} onChange={(e) => setKind(e.target.value as AttachmentKind)} className="h-10 bg-surface text-[14px]">
                {ATTACHMENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ATTACHMENT_KIND_LABELS[k]}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()} disabled={Boolean(busy)}>
              <Paperclip className="size-4" aria-hidden />
              Escolher
            </Button>
            <Button variant="secondary" size="sm" onClick={() => cameraInput.current?.click()} disabled={Boolean(busy)} className="md:hidden">
              <Camera className="size-4" aria-hidden />
              Foto
            </Button>
          </div>
        </div>
        <input ref={fileInput} type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={(e) => e.target.files && void upload(e.target.files)} />
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files && void upload(e.target.files)} />
        {error ? (
          <p role="alert" className="mt-3 text-[13px] text-red-600">
            {error}
          </p>
        ) : null}
      </div>

      {attachments.length === 0 ? (
        <p className="text-[13px] text-muted">Nenhum anexo ainda. A proposta que o líder montar fica guardada aqui.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {attachments.map((a) => (
            <li key={a.id} className="overflow-hidden rounded-card bg-surface-2">
              <a href={`/api/anexos/${a.id}`} target="_blank" rel="noreferrer" className="block aspect-[4/3] bg-surface-3" aria-label={`Abrir ${a.title}`}>
                {a.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arquivo local servido pela API, sem otimização
                  <img src={`/api/anexos/${a.id}`} alt={a.title} className="size-full object-cover" loading="lazy" />
                ) : (
                  <span className="grid size-full place-items-center text-muted">
                    <FileText className="size-10" aria-hidden />
                  </span>
                )}
              </a>
              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <Chip className={cn(KIND_CHIP[a.kind], "h-6 text-[12px]")}>{ATTACHMENT_KIND_LABELS[a.kind]}</Chip>
                  <span className="text-[11px] tabular-nums text-muted">{formatDate(fromIso(a.createdAt))}</span>
                </div>
                <p className="truncate text-[14px] font-medium text-ink" title={a.fileName}>
                  {a.title}
                </p>
                <div className="flex items-center gap-1">
                  <a href={`/api/anexos/${a.id}`} target="_blank" rel="noreferrer" className="icon-btn size-8" aria-label="Abrir">
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                  <a href={`/api/anexos/${a.id}?download=1`} className="icon-btn size-8" aria-label="Baixar">
                    <Download className="size-4" aria-hidden />
                  </a>
                  <span className="ml-auto text-[11px] text-muted">{formatSize(a.sizeBytes)}</span>
                  <form action={deleteAttachmentAction} onSubmit={(e) => (window.confirm(`Remover "${a.title}"?`) ? undefined : e.preventDefault())}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="icon-btn size-8 text-rose-ink hover:bg-rose" aria-label={`Remover ${a.title}`}>
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
