"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { CalendarPlus, MoreHorizontal, Pencil, Trash2, UserRound } from "lucide-react";
import { ActionError } from "@/components/ui/action-error";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Leader } from "@/db/schema";
import { cn } from "@/lib/cn";
import { CLIENT_STATUS_LABELS, CLIENT_STATUSES, type ClientStatus } from "@/lib/domain";
import { OK } from "@/lib/result";
import { assignLeaderAction, deleteClientAction } from "../actions";

type Props = {
  clientId: string;
  status: ClientStatus;
  leaderId: string | null;
  leaders: Pick<Leader, "id" | "name">[];
  /** Quem contém o card decide como mover (o kanban aplica otimista e chama o servidor). */
  onMove: (status: ClientStatus) => void;
  tinted?: boolean;
  canManage?: boolean;
};

const SELECT = "h-9 w-full rounded-[8px] bg-surface-2 px-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/30";
const LABEL = "block px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted";

/**
 * Menu "…" do card: mover de etapa (alternativa acessível ao arrastar),
 * trocar o líder de vendas e atalhos. Fecha com Esc ou clique fora.
 */
export function CardMenu({ clientId, status, leaderId, leaders, onMove, tinted = false, canManage = true }: Props) {
  const [open, setOpen] = useState(false);
  const [leaderState, assignLeader] = useActionState(assignLeaderAction, OK);
  const [deleteState, deleteClient] = useActionState(deleteClientAction, OK);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

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

  return (
    <div ref={root} className="relative" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Opções do cliente"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn("icon-btn -mt-1 -mr-1 size-8", tinted && "hover:bg-white/60")}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
      {open ? (
        <div role="dialog" aria-label="Opções do cliente" className="panel absolute top-9 right-0 z-30 w-60 p-2 text-[13px] shadow-float">
          <label htmlFor={`${id}-status`} className={cn(LABEL, "pt-1")}>
            Mover para
          </label>
          <select
            id={`${id}-status`}
            value={status}
            onChange={(e) => {
              onMove(e.target.value as ClientStatus);
              setOpen(false);
            }}
            className={SELECT}
          >
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLIENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          {canManage ? <><label htmlFor={`${id}-leader`} className={cn(LABEL, "pt-3")}>
            Líder de vendas
          </label>
          <form action={assignLeader}>
            <input type="hidden" name="id" value={clientId} />
            {/* `key` remonta o select quando o servidor devolve outro líder (select não controlado). */}
            <select id={`${id}-leader`} key={leaderId ?? ""} name="leaderId" defaultValue={leaderId ?? ""} onChange={(e) => e.currentTarget.form?.requestSubmit()} className={SELECT}>
              <option value="">Sem líder</option>
              {leaders.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <ActionError state={leaderState} className="px-2 pt-2 text-[12px]" />
          </form></> : null}

          <div className="mt-2 border-t border-line pt-2">
            <MenuLink href={`/clientes/${clientId}`} icon={<UserRound className="size-4" aria-hidden />} label="Abrir cliente" />
            {canManage ? <MenuLink href={`/agenda/novo?cliente=${clientId}`} icon={<CalendarPlus className="size-4" aria-hidden />} label="Agendar" /> : null}
            {canManage ? <MenuLink href={`/clientes/${clientId}/editar`} icon={<Pencil className="size-4" aria-hidden />} label="Editar" /> : null}
            {canManage ? (
              confirmDelete ? (
                <form action={deleteClient} className="mt-1 rounded-[8px] bg-rose p-2">
                  <input type="hidden" name="id" value={clientId} />
                  <p className="px-1 text-[12px] leading-snug text-rose-ink">Apagar o cliente, agenda, histórico e anexos?</p>
                  <div className="mt-2 flex gap-1.5">
                    <SubmitButton variant="danger" size="sm" pendingLabel="Apagando…">Apagar</SubmitButton>
                    <button type="button" onClick={() => setConfirmDelete(false)} className="h-8 rounded-[8px] px-2.5 text-[12px] font-medium text-ink-2 hover:bg-surface">Cancelar</button>
                  </div>
                  <ActionError state={deleteState} className="mt-2 text-[12px]" />
                </form>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="flex h-9 w-full items-center gap-2 rounded-[8px] px-2 text-left text-rose-ink transition-colors hover:bg-rose">
                  <Trash2 className="size-4" aria-hidden />
                  Excluir cliente
                </button>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex h-9 items-center gap-2 rounded-[8px] px-2 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
      {icon}
      {label}
    </Link>
  );
}
