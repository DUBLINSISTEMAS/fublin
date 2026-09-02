"use client";

import { useActionState } from "react";
import { ActionError } from "@/components/ui/action-error";
import { Button } from "@/components/ui/button";
import { OK } from "@/lib/result";
import type { SafeUser } from "../service";
import { toggleUserAction } from "../actions";

export function UserRow({ user, leaderName, current }: { user: SafeUser; leaderName?: string; current: boolean }) {
  const [state, action, pending] = useActionState(toggleUserAction, OK);
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="min-w-0 flex-1"><span className="block font-medium text-ink">{user.name}{current ? " (você)" : ""}</span><span className="block text-[13px] text-muted">@{user.login} · {user.role === "admin" ? "Administrador" : leaderName ?? "Líder"}</span></span>
      <span className={user.active ? "rounded-full bg-lime-soft px-2.5 py-1 text-xs text-lime-ink" : "rounded-full bg-surface-3 px-2.5 py-1 text-xs text-muted"}>{user.active ? "Ativo" : "Desativado"}</span>
      {!current ? <form action={action}><input type="hidden" name="id" value={user.id} /><input type="hidden" name="active" value={String(!user.active)} /><Button type="submit" size="sm" variant="secondary" disabled={pending}>{user.active ? "Desativar" : "Ativar"}</Button></form> : null}
      <ActionError state={state} className="basis-full" />
    </li>
  );
}
