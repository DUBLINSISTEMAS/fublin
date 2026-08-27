"use client";

import { useEffect, type RefObject } from "react";
import type { FormState } from "@/lib/result";

/** Depois de um erro de validação, leva o usuário ao primeiro campo inválido (ou ao alerta geral). */
export function useFocusFirstError(state: FormState, formRef: RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    if (state.status !== "error") return;
    const form = formRef.current;
    if (!form) return;
    const target = form.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.querySelector<HTMLElement>('[role="alert"]');
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    if (target && "focus" in target) target.focus({ preventScroll: true });
  }, [state, formRef]);
}
