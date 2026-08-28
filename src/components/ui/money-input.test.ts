import { describe, expect, it } from "vitest";
import { maskMoney, settleMoney } from "./money-input";

describe("maskMoney", () => {
  it("groups thousands while typing", () => {
    expect(maskMoney("7")).toBe("7");
    expect(maskMoney("700")).toBe("700");
    expect(maskMoney("7000")).toBe("7.000");
    expect(maskMoney("700000")).toBe("700.000");
    expect(maskMoney("1234567")).toBe("1.234.567");
  });
  it("keeps up to two decimals after a comma", () => {
    expect(maskMoney("700000,")).toBe("700.000,");
    expect(maskMoney("700000,5")).toBe("700.000,5");
    expect(maskMoney("700000,555")).toBe("700.000,55");
    expect(maskMoney(",5")).toBe("0,5");
  });
  it("cleans pasted values and leading zeros", () => {
    expect(maskMoney("R$ 1.234,56")).toBe("1.234,56");
    expect(maskMoney("0005")).toBe("5");
    expect(maskMoney("abc")).toBe("");
  });
});

describe("settleMoney", () => {
  it("completes cents on blur and clears garbage", () => {
    expect(settleMoney("700.000")).toBe("700.000,00");
    expect(settleMoney("700.000,5")).toBe("700.000,50");
    expect(settleMoney("")).toBe("");
  });
});
