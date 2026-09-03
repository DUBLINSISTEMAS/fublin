"use client";

import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field, Input } from "@/components/ui/field";

type Props = {
  label: string;
  id: string;
  name: string;
  error?: string[] | string;
  hint?: ReactNode;
  autoComplete?: string;
  autoFocus?: boolean;
  className?: string;
};

/** Campo de senha com o olhinho de mostrar/ocultar — o mesmo em toda tela que pede senha. */
export function PasswordField({ label, id, name, error, hint, autoComplete = "new-password", autoFocus, className }: Props) {
  const [visible, setVisible] = useState(false);
  const invalid = Array.isArray(error) ? error.length > 0 : Boolean(error);
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} required className={className}>
      <div className="relative">
        <Input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} autoFocus={autoFocus} invalid={invalid} className="pr-12" />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="icon-btn absolute top-1/2 right-1.5 -translate-y-1/2"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    </Field>
  );
}
