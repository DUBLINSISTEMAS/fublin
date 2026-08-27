"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarPlus, Plus, Search } from "lucide-react";
import { cn } from "@/lib/cn";

const DEBOUNCE_MS = 300;

/**
 * Barra superior: busca global de clientes + ação principal.
 * Na lista de clientes a busca atualiza a URL; nas outras telas leva para /clientes?q=.
 */
export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onClients = pathname === "/clientes";
  const [q, setQ] = useState(onClients ? (searchParams.get("q") ?? "") : "");

  useEffect(() => {
    if (!onClients) return;
    const current = searchParams.get("q") ?? "";
    if (q.trim() === current) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");
      const query = params.toString();
      router.replace(query ? `/clientes?${query}` : "/clientes", { scroll: false });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [q, onClients, router, searchParams]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!onClients) router.push(q.trim() ? `/clientes?q=${encodeURIComponent(q.trim())}` : "/clientes");
  }

  return (
    <header className="panel sticky top-0 z-20 flex items-center gap-2 p-2 max-md:rounded-none max-md:shadow-none md:static md:gap-3">
      <form onSubmit={submit} className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-2" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cliente"
          aria-label="Buscar cliente"
          className="h-12 w-full min-w-0 rounded-control bg-transparent pr-3 pl-11 text-[15px] text-ink placeholder:text-ink-2/70 focus:bg-surface-2 focus:outline-none md:h-12"
        />
      </form>
      <Link href="/agenda/novo" className={cn("icon-btn size-11 max-md:hidden", "text-ink-2")} aria-label="Novo agendamento" title="Novo agendamento">
        <CalendarPlus className="size-5" aria-hidden />
      </Link>
      <Link
        href="/clientes/novo"
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-control bg-accent px-3 text-[15px] font-medium text-white transition-colors hover:bg-accent-strong md:h-12 md:px-5"
      >
        <Plus className="size-[18px]" aria-hidden />
        <span className="max-sm:hidden">Novo cliente</span>
      </Link>
    </header>
  );
}
