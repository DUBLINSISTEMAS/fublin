"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { copyText } from "@/lib/clipboard";
import { whatsappUrl } from "@/lib/phone";

type Props = { text: string; phone: string };

const COPIED_MS = 2000;

/** Mensagem de confirmação pronta: ler, copiar ou abrir direto no WhatsApp do cliente. */
export function ConfirmationMessage({ text, phone }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyText(text);
    if (!ok) {
      toast.error("Não consegui copiar. Selecione o texto e copie à mão.");
      return;
    }
    toast.success("Mensagem copiada.");
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <div className="space-y-3">
      <pre className="rounded-control bg-surface-2 p-4 font-sans text-[14px] leading-relaxed whitespace-pre-wrap text-ink" aria-label="Mensagem de confirmação">
        {text}
      </pre>
      <div className="flex flex-wrap gap-2">
        <Button onClick={copy} variant="dark">
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copiada" : "Copiar mensagem"}
        </Button>
        <a href={whatsappUrl(phone, text)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-control bg-lime px-4 text-[14px] font-medium text-lime-ink transition-colors hover:bg-lime-soft">
          <MessageCircle className="size-4" aria-hidden />
          Abrir no WhatsApp
        </a>
      </div>
    </div>
  );
}
