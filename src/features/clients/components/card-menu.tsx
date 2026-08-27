"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarPlus, MoreHorizontal, Pencil, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { CLIENT_STATUS_LABELS, CLIENT_STATUSES, type ClientStatus } from "@/lib/domain";
import type { Leader } from "@/db/schema";
import { assignLeaderAction, moveClientAction } from "../actions";

type Props = {
  clientId: string;
  status: ClientStatus;
  leaderId: string | null;
  leaders: Pick<Leader, "id" | "name">[];
  onMoved?: (status: ClientStatus) => void;
  tinted?: boolean;
};

/**
 * Menu "…" do card: mover de etapa (alternativa acessível ao arrastar),
 * trocar o líder de vendas e atalhos. Fecha com Esc ou clique fora.
 */
export function CardMenu({ clientId, status, leaderId, leaders, onMoved, tinted = false }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  function move(next: ClientStatus) {
    if (next === status) return;
    setError(null);
    startTransition(async () => {
      const result = await moveClientAction(clientId, next);
      if (!result.ok) setError(result.error);
      else {
        onMoved?.(next);
        setOpen(false);
      }
    });
  }

  return (
    <div ref={root} className="relative" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Opções do cliente"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn("icon-btn -mt-1 -mr-1 size-8", tinted && "hover:bg-white/60")}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
      {open ? (
        <div role="menu" className="panel absolute top-9 right-0 z-30 w-60 p-2 text-[13px] shadow-float">
          <label className="block px-2 pt-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Mover para</label>
          <select
            aria-label="Mover para etapa"
            value={status}
            disabled={pending}
            onChange={(e) => move(e.target.value as ClientStatus)}
            className="h-9 w-full rounded-[8px] bg-surface-2 px-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLIENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          <label className="block px-2 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Líder de vendas</label>
          <form action={assignLeaderAction}>
            <input type="hidden" name="id" value={clientId} />
            <select
              name="leaderId"
              aria-label="Líder de vendas"
              defaultValue={leaderId ?? ""}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="h-9 w-full rounded-[8px] bg-surface-2 px-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="">Sem líder</option>
              {leaders.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </form>

          {error ? (
            <p role="alert" className="px-2 pt-2 text-[12px] text-red-600">
              {error}
            </p>
          ) : null}

          <div className="mt-2 border-t border-line pt-2">
            <MenuLink href={`/clientes/${clientId}`} icon={<UserRound className="size-4" aria-hidden />} label="Abrir cliente" />
            <MenuLink href={`/agenda/novo?cliente=${clientId}`} icon={<CalendarPlus className="size-4" aria-hidden />} label="Agendar" />
            <MenuLink href={`/clientes/${clientId}/editar`} icon={<Pencil className="size-4" aria-hidden />} label="Editar" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} role="menuitem" className="flex h-9 items-center gap-2 rounded-[8px] px-2 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
      {icon}
      {label}
    </Link>
  );
}
