"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./button";

type Props = ComponentProps<typeof Button> & { pendingLabel?: string };

/** Botão de submit que desabilita e troca o rótulo enquanto a action roda. */
export function SubmitButton({ children, pendingLabel = "Salvando…", disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
