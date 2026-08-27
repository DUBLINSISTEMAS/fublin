"use client";

import { useActionState, useState } from "react";
import { ActionError } from "@/components/ui/action-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionToast } from "@/components/ui/toast";
import type { Leader } from "@/db/schema";
import { formatPhone } from "@/lib/phone";
import { formErrors, IDLE, OK } from "@/lib/result";
import { plural } from "@/lib/text";
import { toggleLeaderAction, updateLeaderAction } from "../actions";

export function LeaderRow({ leader, clientCount }: { leader: Leader; clientCount: number }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(updateLeaderAction.bind(null, leader.id), IDLE);
  const [toggleState, toggleAction] = useActionState(toggleLeaderAction, OK);
  useActionToast(state);
  useActionToast(toggleState, leader.active ? "Líder desativado." : "Líder ativado.");

  // Estado derivado durante o render: ao salvar com sucesso, sai do modo de edição.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.status === "success") setEditing(false);
  }

  if (editing) {
    const errors = formErrors(state);
    return (
      <li className="px-4 py-3">
        <form action={formAction} noValidate className="grid gap-2 sm:grid-cols-[1fr_180px_auto_auto] sm:items-center">
          <Input name="name" defaultValue={leader.name} aria-label="Nome" invalid={Boolean(errors.name)} autoFocus />
          <Input name="phone" defaultValue={leader.phone ?? ""} aria-label="Telefone" placeholder="Telefone" />
          <SubmitButton size="sm">Salvar</SubmitButton>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          {state.status === "error" ? (
            <p role="alert" className="text-[13px] text-rose-ink sm:col-span-4">
              {errors.name?.[0] ?? state.message}
            </p>
          ) : null}
        </form>
      </li>
    );
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <PhotoUpload kind="lider" id={leader.id} name={leader.name} photoKey={leader.photoKey} size={44} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-medium text-ink">{leader.name}</span>
            {!leader.active ? <Badge tone="neutral">Inativo</Badge> : null}
          </span>
          <span className="block text-[13px] text-muted">
            {leader.phone ? `${formatPhone(leader.phone)} · ` : ""}
            {plural(clientCount, "cliente")}
          </span>
        </span>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <form action={toggleAction}>
          <input type="hidden" name="id" value={leader.id} />
          <input type="hidden" name="active" value={leader.active ? "false" : "true"} />
          <SubmitButton size="sm" variant="ghost" pendingLabel="…">
            {leader.active ? "Desativar" : "Ativar"}
          </SubmitButton>
        </form>
      </div>
      <ActionError state={toggleState} className="mt-1 text-right" />
    </li>
  );
}
