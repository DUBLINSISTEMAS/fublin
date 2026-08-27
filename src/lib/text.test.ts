import { describe, expect, it } from "vitest";
import { capitalize, initials, plural } from "./text";

describe("text helpers", () => {
  it("capitalizes only the first letter", () => {
    expect(capitalize("quinta-feira, 27 de agosto")).toBe("Quinta-feira, 27 de agosto");
    expect(capitalize("")).toBe("");
  });
  it("builds initials from first and last name", () => {
    expect(initials("Ana Paula Souza")).toBe("AS");
    expect(initials("Bruno")).toBe("B");
    expect(initials("  ")).toBe("");
  });
  it("pluralizes", () => {
    expect(plural(1, "agendamento")).toBe("1 agendamento");
    expect(plural(3, "agendamento")).toBe("3 agendamentos");
    expect(plural(0, "atrasado")).toBe("0 atrasados");
  });
});
