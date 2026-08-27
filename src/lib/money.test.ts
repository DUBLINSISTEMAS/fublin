import { describe, expect, it } from "vitest";
import { centsToCsv, centsToInput, formatBRL, formatBRLCompact, parseBRL } from "./money";

describe("parseBRL", () => {
  it("parses pt-BR formats into cents", () => {
    expect(parseBRL("300.000")).toBe(30000000);
    expect(parseBRL("300000,50")).toBe(30000050);
    expect(parseBRL("R$ 1.234,56")).toBe(123456);
    expect(parseBRL("1234.56")).toBe(123456);
    expect(parseBRL("1.234.567")).toBe(123456700);
    expect(parseBRL("2,5")).toBe(250);
  });
  it("returns null for empty and handles garbage safely", () => {
    expect(parseBRL("")).toBeNull();
    expect(parseBRL("   ")).toBeNull();
    expect(parseBRL(null)).toBeNull();
    expect(parseBRL("abc")).toBeNull();
  });
});

describe("formatting", () => {
  it("formats currency and compact form", () => {
    expect(formatBRL(30000000).replace(/ /g, " ")).toBe("R$ 300.000,00");
    expect(formatBRL(null)).toBe("—");
    expect(formatBRLCompact(30000000).replace(/ /g, " ")).toBe("R$ 300 mil");
    expect(centsToInput(123456)).toBe("1.234,56");
    expect(centsToInput(null)).toBe("");
    expect(centsToCsv(123456)).toBe("1234,56");
    expect(centsToCsv(null)).toBe("");
  });
});
