"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { COMMISSION_RATE_PRESETS, formatPercent, percentToInput } from "@/features/goals/commission";

const CUSTOM = "custom";
const PRESETS = COMMISSION_RATE_PRESETS.map(percentToInput);

type Props = {
  /** Taxa das configurações, usada quando a venda não tem a própria. */
  defaultRatePercent: number;
  /** Valor atual do campo ("0,5", "" = padrão, ou o que o dono digitou antes de um erro). */
  initialValue: string;
  error?: string | string[];
  id?: string;
};

/**
 * Comissão desta venda: padrão (das configurações), uma das taxas prontas ou uma
 * porcentagem digitada. Sempre envia um único campo `commissionRate` ("" = padrão).
 */
export function CommissionRateField({ defaultRatePercent, initialValue, error, id = "commissionRate" }: Props) {
  const initialChoice = initialValue === "" ? "" : PRESETS.includes(initialValue) ? initialValue : CUSTOM;
  const [choice, setChoice] = useState(initialChoice);
  const [custom, setCustom] = useState(initialChoice === CUSTOM ? initialValue : "");
  const isCustom = choice === CUSTOM;

  return (
    <Field label="Comissão desta venda" htmlFor={id} error={error} hint={`Padrão ${formatPercent(defaultRatePercent)}. Vendeu melhor? Escolha 0,5% e esta carta conta com 0,5% na meta e nos recebimentos.`}>
      <div className="flex gap-2">
        <Select id={id} value={choice} onChange={(e) => setChoice(e.target.value)} invalid={Boolean(error) && !isCustom} className="min-w-0 flex-1">
          <option value="">Padrão ({formatPercent(defaultRatePercent)})</option>
          {PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {preset}%
            </option>
          ))}
          <option value={CUSTOM}>Personalizar…</option>
        </Select>
        {isCustom ? (
          <div className="relative w-32 shrink-0">
            <Input
              name="commissionRate"
              aria-label="Porcentagem personalizada"
              inputMode="decimal"
              autoFocus
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              invalid={Boolean(error)}
              placeholder="0,7"
              className="pr-9 tabular-nums"
            />
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[14px] text-muted">%</span>
          </div>
        ) : (
          <input type="hidden" name="commissionRate" value={choice} />
        )}
      </div>
    </Field>
  );
}
