"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarPlus, LogOut, Plus, Search } from "lucide-react";
import { SEARCH_INPUT_ID } from "./shortcuts";
import { logoutAction } from "@/features/auth/actions";
import type { UserRole } from "@/lib/domain";

const DEBOUNCE_MS = 300;

/**
 * Barra superior: busca global de clientes + ação principal.
 * Na lista de clientes a busca atualiza a URL; nas outras telas leva para /clientes?q=.
 */
export function TopBar({ role = "admin" }: { role?: UserRole }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onClients = pathname === "/clientes";
  const urlQuery = onClients ? (searchParams.get("q") ?? "") : "";

  // A URL é a fonte de verdade: voltar/avançar no navegador (ou limpar filtros) atualiza o campo.
  const [q, setQ] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    setQ(urlQuery);
  }

  useEffect(() => {
    if (!onClients || q.trim() === urlQuery) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");
      const query = params.toString();
      router.replace(query ? `/clientes?${query}` : "/clientes", { scroll: false });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [q, onClients, urlQuery, router, searchParams]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!onClients) router.push(q.trim() ? `/clientes?q=${encodeURIComponent(q.trim())}` : "/clientes");
  }

  return (
    <header className="panel sticky top-0 z-20 flex items-center gap-2 p-2 max-md:rounded-none max-md:shadow-none md:static md:gap-3 print:hidden">
      <form onSubmit={submit} className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-2" aria-hidden />
        <input
          id={SEARCH_INPUT_ID}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar nome, telefone, e-mail ou observação  ( / )"
          aria-label="Buscar cliente"
          className="h-12 w-full min-w-0 rounded-control bg-transparent pr-3 pl-11 text-[15px] text-ink placeholder:text-ink-2/70 focus:bg-surface-2 focus:outline-none"
        />
      </form>
      <span className="hidden items-center gap-1.5 rounded-full bg-lime-soft px-2.5 py-1.5 text-[11px] font-medium text-lime-ink lg:inline-flex" title="Alterações da equipe aparecem automaticamente">
        <span className="size-1.5 rounded-full bg-lime-strong motion-safe:animate-pulse" aria-hidden />Ao vivo
      </span>
      {role === "admin" ? <Link href="/agenda/novo" className="icon-btn size-11 text-ink-2 max-md:hidden" aria-label="Novo agendamento" title="Novo agendamento">
        <CalendarPlus className="size-5" aria-hidden />
      </Link> : null}
      {role === "admin" ? <Link
        href="/clientes/novo"
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-control bg-accent px-3 text-[15px] font-medium text-white transition-colors hover:bg-accent-strong md:h-12 md:px-5"
      >
        <Plus className="size-[18px]" aria-hidden />
        <span className="max-sm:hidden">Novo cliente</span>
      </Link> : null}
      <form action={logoutAction} className="md:hidden"><button type="submit" className="icon-btn size-11 text-ink-2" aria-label="Sair" title="Sair"><LogOut className="size-5" aria-hidden /></button></form>
    </header>
  );
}
