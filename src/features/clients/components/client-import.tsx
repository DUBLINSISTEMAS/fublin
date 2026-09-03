"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { toast } from "@/components/ui/toast";

export function ClientImport() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function change(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData(); body.set("file", file);
      const response = await fetch("/api/import/clientes", { method: "POST", body });
      const data = await response.json() as { imported?: number; skipped?: number; errors?: string[]; error?: string };
      // Nada foi lido: só a mensagem de erro. 207 = importou em parte e parou no meio.
      if (!response.ok) throw new Error(data.error ?? "Falha na importação.");
      toast.success(`${data.imported ?? 0} clientes importados${data.skipped ? ` · ${data.skipped} ignorados` : ""}.`);
      if (data.error) toast.error(`A importação parou no meio: ${data.error}`);
      if (data.errors?.length) toast.error(data.errors.slice(0, 3).join(" "));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha na importação."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  return (
    <div>
      <input ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event) => void change(event.target.files?.[0])} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-control bg-dark px-4 text-sm font-medium text-white disabled:opacity-60">
        <FileUp className="size-4" aria-hidden />{busy ? "Importando…" : "Importar Excel"}
      </button>
      <p className="mt-2 text-[12px] text-muted">Colunas obrigatórias: Nome, Telefone e Interesse. Duplicados são ignorados.</p>
    </div>
  );
}
