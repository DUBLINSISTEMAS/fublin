import { describe, expect, it } from "vitest";
import { commissionCents, dealCommissionCents, dealsCommissionCents, formatPercent } from "./commission";

const DEFAULT = 0.4;

describe("commissionCents", () => {
  it("applies the percentage over the sales and rounds to the cent", () => {
    expect(commissionCents(10_000_000, 0.4)).toBe(40_000); // R$ 100 mil → R$ 400
    expect(commissionCents(12345, 0.4)).toBe(49); // 49,38 → 49
    expect(commissionCents(0, 0.4)).toBe(0);
  });
});

describe("dealCommissionCents", () => {
  it("uses the deal's own rate when it has one", () => {
    expect(dealCommissionCents({ creditCents: 10_000_000, ratePercent: 0.5 }, DEFAULT)).toBe(50_000);
  });

  it("falls back to the default rate when the deal has no rate", () => {
    expect(dealCommissionCents({ creditCents: 10_000_000, ratePercent: null }, DEFAULT)).toBe(40_000);
  });

  it("is zero for a deal without a credit value", () => {
    expect(dealCommissionCents({ creditCents: null, ratePercent: 0.5 }, DEFAULT)).toBe(0);
  });
});

describe("dealsCommissionCents", () => {
  it("sums each deal by its own rate, not the default over the total", () => {
    const deals = [
      { creditCents: 10_000_000, ratePercent: 0.5 },
      { creditCents: 20_000_000, ratePercent: null },
      { creditCents: null, ratePercent: null },
    ];
    expect(dealsCommissionCents(deals, DEFAULT)).toBe(50_000 + 80_000);
  });

  it("matches the flat calculation when nobody has an own rate", () => {
    const deals = [{ creditCents: 12345, ratePercent: null }, { creditCents: 67890, ratePercent: null }];
    expect(dealsCommissionCents(deals, DEFAULT)).toBe(commissionCents(12345, DEFAULT) + commissionCents(67890, DEFAULT));
  });

  it("is zero without deals", () => {
    expect(dealsCommissionCents([], DEFAULT)).toBe(0);
  });
});

describe("formatPercent", () => {
  it("formats in pt-BR with up to two decimals", () => {
    expect(formatPercent(0.4)).toBe("0,4%");
    expect(formatPercent(0.5)).toBe("0,5%");
    expect(formatPercent(1)).toBe("1%");
  });
});
