import { describe, expect, it } from "vitest";
import { centsToInput, formatBRL, formatBRLCompact, INVALID_MONEY, isInvalidMoney, parseBRL } from "./money";

describe("parseBRL", () => {
  it("parses pt-BR formats into cents", () => {
    expect(parseBRL("300.000")).toBe(30000000);
    expect(parseBRL("300000,50")).toBe(30000050);
    expect(parseBRL("R$ 1.234,56")).toBe(123456);
    expect(parseBRL("1234.56")).toBe(123456);
    expect(parseBRL("1.234.567")).toBe(123456700);
    expect(parseBRL("2,5")).toBe(250);
    expect(parseBRL("-1.000,00")).toBe(-100000);
    // O "R$ " do formatBRL usa espaço fino (NBSP): o valor volta como entrou.
    expect(parseBRL(formatBRL(30000000))).toBe(30000000);
  });

  it("returns null only when nothing was typed", () => {
    expect(parseBRL("")).toBeNull();
    expect(parseBRL("   ")).toBeNull();
    expect(parseBRL(null)).toBeNull();
    expect(parseBRL(undefined)).toBeNull();
    expect(parseBRL("R$")).toBeNull();
  });

  it("flags unreadable text instead of silently zeroing it", () => {
    expect(parseBRL("abc")).toBe(INVALID_MONEY);
    expect(parseBRL("1o0")).toBe(INVALID_MONEY);
    expect(parseBRL("300 reais")).toBe(INVALID_MONEY);
    expect(parseBRL("12-3")).toBe(INVALID_MONEY);
    expect(parseBRL("-")).toBe(INVALID_MONEY);
    expect(parseBRL(",")).toBe(INVALID_MONEY);
    expect(isInvalidMoney(parseBRL("abc"))).toBe(true);
    expect(isInvalidMoney(parseBRL("300"))).toBe(false);
    expect(isInvalidMoney(parseBRL(""))).toBe(false);
  });
});

describe("formatting", () => {
  it("formats currency and compact form", () => {
    expect(formatBRL(30000000).replace(/ /g, " ")).toBe("R$ 300.000,00");
    expect(formatBRL(null)).toBe("—");
    expect(formatBRLCompact(30000000).replace(/ /g, " ")).toBe("R$ 300 mil");
    expect(centsToInput(123456)).toBe("1.234,56");
    expect(centsToInput(null)).toBe("");
  });
});
