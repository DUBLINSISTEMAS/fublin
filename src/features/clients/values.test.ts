import { describe, expect, it } from "vitest";
import { installmentRangeLong, valuesLine } from "./values";

const nbsp = (s: string) => s.replace(/ /g, " ");

describe("valuesLine", () => {
  it("joins adesão and the installment range compactly", () => {
    expect(nbsp(valuesLine({ adesaoCents: 500000, installmentMinCents: 80000, installmentMaxCents: 120000 }) ?? "")).toBe("Adesão R$ 5 mil · Parcela R$ 800 a R$ 1,2 mil");
  });
  it("shows a fixed installment when only one end is set and nothing when empty", () => {
    expect(nbsp(valuesLine({ adesaoCents: null, installmentMinCents: null, installmentMaxCents: 90000 }) ?? "")).toBe("Parcela R$ 900");
    expect(nbsp(valuesLine({ adesaoCents: null, installmentMinCents: 90000, installmentMaxCents: 90000 }) ?? "")).toBe("Parcela R$ 900");
    expect(valuesLine({ adesaoCents: null, installmentMinCents: null, installmentMaxCents: null })).toBeNull();
  });
  it("adds the sale's own commission rate and hides it when the sale uses the default", () => {
    expect(nbsp(valuesLine({ adesaoCents: 500000, installmentMinCents: null, installmentMaxCents: null, commissionRatePercent: 0.5 }) ?? "")).toBe("Adesão R$ 5 mil · Comissão 0,5%");
    expect(valuesLine({ adesaoCents: null, installmentMinCents: null, installmentMaxCents: null, commissionRatePercent: null })).toBeNull();
  });
  it("writes the long form for the client page", () => {
    expect(nbsp(installmentRangeLong({ installmentMinCents: 80000, installmentMaxCents: 120000 }))).toBe("R$ 800,00 a R$ 1.200,00");
    expect(installmentRangeLong({ installmentMinCents: null, installmentMaxCents: null })).toBe("—");
  });
});
