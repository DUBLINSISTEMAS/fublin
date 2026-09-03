"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { isDragging } from "@/components/ui/dragging";

const POLL_MS = 30_000;
/** Menu aberto, painel do agendamento, recorte de foto ou exclusão armada: nada disso pode sumir sozinho. */
const BUSY_SELECTOR = '[role="dialog"], [aria-expanded="true"], [data-confirming]';

/** Momentos em que recarregar atrapalharia quem está no meio de alguma coisa. */
function isBusy(): boolean {
  if (isDragging()) return true;
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return true;
  if (active instanceof HTMLElement && active.isContentEditable) return true;
  return Boolean(document.querySelector(BUSY_SELECTOR));
}

/**
 * Mantém a colaboração atualizada sem recarregar a página à toa: a cada 30 s (só com a aba
 * à frente) pergunta ao servidor uma marca de mudança barata e só então chama `router.refresh()`.
 * Silencioso de propósito — quem está lendo a tela não precisa saber que ela se atualizou sozinha.
 */
export function LiveRefresh() {
  const router = useRouter();
  const version = useRef<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const controller = new AbortController();

    async function check() {
      if (stopped || document.visibilityState !== "visible" || isBusy()) return;
      try {
        const response = await fetch("/api/version", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data: unknown = await response.json();
        const next = typeof data === "object" && data !== null ? (data as { version?: unknown }).version : undefined;
        if (stopped || typeof next !== "string") return;
        const previous = version.current;
        version.current = next;
        // A primeira leitura só grava a marca: a página acabou de chegar do servidor, já está em dia.
        if (previous !== null && previous !== next && !isBusy()) router.refresh();
      } catch {
        /* rede fora do ar ou aba fechando: tenta de novo no próximo ciclo, sem incomodar ninguém */
      }
    }

    const timer = window.setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    void check();
    return () => {
      stopped = true;
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
