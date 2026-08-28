"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "@/components/ui/toast";

export const SEARCH_INPUT_ID = "busca-global";

/** Onde o usuário está digitando: atalhos de uma tecla não podem atrapalhar. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/**
 * Atalhos de teclado (desktop): `/` busca, `n` novo cliente, `a` agendar, `?` mostra a lista.
 * Esc fecha painéis e menus (cada um cuida do seu).
 */
export function Shortcuts() {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById(SEARCH_INPUT_ID)?.focus();
      } else if (e.key === "n") router.push("/clientes/novo");
      else if (e.key === "a") router.push("/agenda/novo");
      else if (e.key === "?") toast.info("Atalhos: / buscar · n novo cliente · a agendar · Esc fecha");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}
