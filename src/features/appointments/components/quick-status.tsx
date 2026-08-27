"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, UserX } from "lucide-react";
import { ActionError } from "@/components/ui/action-error";
import { cn } from "@/lib/cn";
import { OK } from "@/lib/result";
import { setAppointmentStatusAction } from "../actions";

type Props = {
  appointmentId: string;
  /** "card" empilha os dois botões em largura total; "row" alinha à direita da linha. */
  layout: "card" | "row";
  /** Sobre fundo azul-claro (card "Agora") os botões ficam brancos. */
  tinted?: boolean;
};

/** Baixa rápida de um agendamento em aberto: Realizado / Faltou. Erros aparecem logo abaixo. */
export function QuickStatus({ appointmentId, layout, tinted = false }: Props) {
  const [state, formAction] = useActionState(setAppointmentStatusAction, OK);
  return (
    <form action={formAction} className={layout === "card" ? "mt-3 space-y-2" : "ml-auto"}>
      <input type="hidden" name="id" value={appointmentId} />
      <Buttons layout={layout} tinted={tinted} />
      <ActionError state={state} className={layout === "row" ? "mt-1 text-right text-[12px]" : undefined} />
    </form>
  );
}

function Buttons({ layout, tinted }: { layout: Props["layout"]; tinted: boolean }) {
  const { pending } = useFormStatus();
  const card = layout === "card";
  return (
    <div className={card ? "grid grid-cols-2 gap-2" : "flex items-center gap-1.5"}>
      <button type="submit" name="status" value="realizado" disabled={pending} className={cn("quick-btn", card && "justify-center", tinted ? "bg-white text-ink hover:bg-white/80" : "quick-btn-ok")}>
        <Check className="size-3.5" aria-hidden />
        Realizado
      </button>
      <button type="submit" name="status" value="faltou" disabled={pending} className={cn("quick-btn", card && "justify-center", tinted && "border-ink/10 bg-white/40")}>
        <UserX className="size-3.5" aria-hidden />
        Faltou
      </button>
    </div>
  );
}
