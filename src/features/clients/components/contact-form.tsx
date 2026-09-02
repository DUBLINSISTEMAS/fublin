"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { IDLE } from "@/lib/result";
import { addClientContactAction } from "../actions";

export function ContactForm({ clientId }: { clientId: string }) {
  const [state, action] = useActionState(addClientContactAction, IDLE);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.status === "success") ref.current?.reset(); }, [state]);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  return (
    <form ref={ref} action={action} className="space-y-3 rounded-control bg-surface-2 p-3">
      <input type="hidden" name="id" value={clientId} />
      <p className="text-[13px] font-semibold text-ink">Registrar contato</p>
      <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
        <Field label="Canal" htmlFor="contact-kind" error={errors?.kind?.[0]}>
          <Select id="contact-kind" name="kind" defaultValue="whatsapp"><option value="whatsapp">WhatsApp</option><option value="ligacao">Ligação</option><option value="email">E-mail</option><option value="outro">Outro</option></Select>
        </Field>
        <Field label="Resultado" htmlFor="contact-summary" error={errors?.summary?.[0]}>
          <Input id="contact-summary" name="summary" placeholder="Ex.: respondeu, enviar proposta amanhã" />
        </Field>
        <div className="self-end"><SubmitButton size="sm" variant="secondary">Registrar</SubmitButton></div>
      </div>
      <FormAlert state={state} />
    </form>
  );
}
