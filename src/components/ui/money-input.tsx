"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { parseBRL, centsToInput, isInvalidMoney } from "@/lib/money";
import { Input } from "./field";

/**
 * Máscara enquanto digita: só dígitos e uma vírgula; milhares ganham ponto.
 * "700000" → "700.000"; "700000,5" → "700.000,5"; "R$ 1.234,56" colado → "1.234,56".
 */
export function maskMoney(raw: string): string {
  const cleaned = raw.replace(/[^\d,]/g, "");
  const comma = cleaned.indexOf(",");
  const integer = (comma === -1 ? cleaned : cleaned.slice(0, comma)).replace(/^0+(?=\d)/, "");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (comma === -1) return grouped;
  const decimals = cleaned.slice(comma + 1).replace(/,/g, "").slice(0, 2);
  return `${grouped || "0"},${decimals}`;
}

/** Ao sair do campo, completa os centavos: "700.000" → "700.000,00". */
export function settleMoney(text: string): string {
  const cents = parseBRL(text);
  if (cents === null) return "";
  // Texto ilegível: devolve o que a pessoa digitou para ela ver e corrigir (o servidor recusa com "Valor inválido").
  return isInvalidMoney(cents) ? text : centsToInput(cents);
}

type Props = Omit<ComponentProps<typeof Input>, "defaultValue" | "value" | "onChange" | "type" | "inputMode"> & {
  /** Valor inicial já formatado ("300.000,00") ou vazio. */
  defaultValue?: string;
};

/** Campo de dinheiro com "R$" fixo e formatação brasileira ao digitar. O servidor recebe o texto e converte com `parseBRL`. */
export function MoneyInput({ defaultValue = "", className, ...props }: Props) {
  const [text, setText] = useState(defaultValue);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[14px] text-muted">R$</span>
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(e) => setText(maskMoney(e.target.value))}
        onBlur={() => setText(settleMoney(text))}
        className={cn("pl-11 tabular-nums", className)}
      />
    </div>
  );
}
