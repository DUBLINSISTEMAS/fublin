"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Select } from "@/components/ui/field";
import { INTEREST_LABELS, INTERESTS } from "@/lib/domain";
import type { ClientFilters as Filters } from "../queries";

const DEBOUNCE_MS = 300;

type Props = { leaders: { id: string; name: string }[]; filters: Filters };

/** Busca + filtros que vivem na URL (compartilháveis e sobrevivem ao voltar). */
export function ClientFilters({ leaders, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(filters.q ?? "");

  const update = useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q.trim() === current) return;
    const timer = window.setTimeout(() => update({ q: q.trim() || undefined }), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [q, searchParams, update]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou telefone"
          aria-label="Buscar clientes"
          className="h-11 w-full rounded-lg border border-line-strong bg-surface pr-10 pl-10 text-[15px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Limpar busca"
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Select aria-label="Interesse" value={filters.interest ?? ""} onChange={(e) => update({ interesse: e.target.value || undefined })} className="sm:w-40">
          <option value="">Interesse</option>
          {INTERESTS.map((i) => (
            <option key={i} value={i}>
              {INTEREST_LABELS[i]}
            </option>
          ))}
        </Select>
        <Select aria-label="Líder de vendas" value={filters.leaderId ?? ""} onChange={(e) => update({ lider: e.target.value || undefined })} className="sm:w-44">
          <option value="">Líder</option>
          {leaders.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
