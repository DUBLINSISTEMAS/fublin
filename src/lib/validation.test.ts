import { describe, expect, it } from "vitest";
import { z } from "zod";
import { actionError, formDataToObject, formError, formErrors, formSuccess, formValue, IDLE, OK } from "./result";
import { idSchema, MAX_MONEY_CENTS, moneyField, optionalString, parseForm } from "./validation";

function fd(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

describe("parseForm", () => {
  const schema = z.object({ name: z.string().min(2, "curto"), nick: optionalString(z.string()) });

  it("returns data and raw values when valid", () => {
    const r = parseForm(schema, fd({ name: "Ana", nick: "" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toEqual({ name: "Ana", nick: undefined });
      expect(r.values).toEqual({ name: "Ana", nick: "" });
    }
  });

  it("returns field errors keyed by input name and echoes values", () => {
    const r = parseForm(schema, fd({ name: "A" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.name).toEqual(["curto"]);
      expect(r.values.name).toBe("A");
    }
  });

  it("idSchema rejects blank ids", () => {
    expect(parseForm(idSchema, fd({ id: "  " })).ok).toBe(false);
    expect(parseForm(idSchema, fd({ id: "abc" })).ok).toBe(true);
  });
});

describe("moneyField", () => {
  const schema = z.object({ credit: moneyField });
  const credit = (value: string) => parseForm(schema, fd({ credit: value }));

  it("accepts empty as 'not informed'", () => {
    for (const blank of ["", "   "]) {
      const result = credit(blank);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.credit).toBeNull();
    }
    expect(schema.parse({}).credit).toBeNull();
  });

  it("converts what the user typed into cents", () => {
    const result = credit("R$ 300.000,50");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.credit).toBe(30000050);
  });

  it("rejects text that is not a number instead of reading it as empty", () => {
    for (const garbage of ["abc", "300 reais", "1o0"]) {
      const result = credit(garbage);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.fieldErrors.credit).toEqual(["Valor inválido"]);
    }
  });

  it("rejects values above the ceiling and text that is too long", () => {
    expect(credit(String(MAX_MONEY_CENTS)).ok).toBe(false);
    expect(credit("1".repeat(41)).ok).toBe(false);
  });
});

describe("form state helpers", () => {
  it("builds states", () => {
    expect(IDLE).toEqual({ status: "idle" });
    expect(formError("x", { a: ["b"] }, { a: "1" })).toEqual({ status: "error", message: "x", fieldErrors: { a: ["b"] }, values: { a: "1" } });
    expect(formSuccess("ok")).toEqual({ status: "success", message: "ok" });
    expect(OK).toEqual({ ok: true });
    expect(actionError("falhou")).toEqual({ ok: false, error: "falhou" });
  });

  it("reads field errors and typed values only from the error state", () => {
    const error = formError("x", { name: ["curto"] }, { name: "A", phone: "" });
    expect(formErrors(error)).toEqual({ name: ["curto"] });
    expect(formErrors(IDLE)).toEqual({});
    expect(formErrors(formSuccess())).toEqual({});
    // O que o usuário digitou vence o valor inicial; chave ausente vira vazio.
    expect(formValue(error, "name", "Ana do banco")).toBe("A");
    expect(formValue(error, "phone", "119")).toBe("");
    expect(formValue(error, "email", "x@y")).toBe("");
    expect(formValue(IDLE, "name", "Ana do banco")).toBe("Ana do banco");
    expect(formValue(IDLE, "name", null)).toBe("");
  });

  it("converts FormData to a plain object (strings only)", () => {
    const data = fd({ a: "1", b: "2" });
    data.set("file", new Blob(["x"]));
    expect(formDataToObject(data)).toEqual({ a: "1", b: "2" });
  });
});
