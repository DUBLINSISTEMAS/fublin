import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("writes BOM, header and rows with ; separator", () => {
    const csv = toCsv([{ name: "Ana", phone: "11999" }], [
      { key: "name", label: "Nome" },
      { key: "phone", label: "Telefone" },
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Nome;Telefone\r\nAna;11999\r\n");
  });
  it("escapes quotes, separators and newlines", () => {
    const csv = toCsv([{ notes: 'diz "oi"; linha\nnova' }], [{ key: "notes", label: "Obs" }]);
    expect(csv).toContain('"diz ""oi""; linha\nnova"');
  });
  it("neutralizes spreadsheet formula injection", () => {
    const csv = toCsv([{ a: "=HYPERLINK(\"http://x\")", b: "+55 11", c: "-5", d: "@ana", e: "ok" }], [
      { key: "a", label: "A" },
      { key: "b", label: "B" },
      { key: "c", label: "C" },
      { key: "d", label: "D" },
      { key: "e", label: "E" },
    ]);
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")";'+55 11;'-5;'@ana;ok`);
  });
  it("supports computed columns and null values", () => {
    const csv = toCsv([{ a: null, b: 2 }], [
      { key: "a", label: "A" },
      { key: "sum", label: "Dobro", get: (r) => (r.b as number) * 2 },
    ]);
    expect(csv).toContain("\r\n;4\r\n");
  });
});
