import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { listClients } from "./queries";
import { importClientRows, MAX_IMPORT_ROWS } from "./import";

const HEADER = ["Nome", "Telefone", "Interesse"];

let db: Db;
beforeEach(async () => { db = await createTestDb(); });

describe("client Excel import", () => {
  it("imports valid rows, understands labels and skips duplicate phones", async () => {
    const result = await importClientRows(db, [
      ["Nome", "Telefone", "Interesse", "Origem", "Observações"],
      ["Ana Souza", "11987654321", "Imóvel", "Indicação", "Prefere tarde"],
      ["Ana repetida", "(11) 98765-4321", "Automóvel", null, null],
      ["Bruno", "21999990000", "Automóvel", "Redes sociais", null],
    ]);
    expect(result).toMatchObject({ imported: 2, skipped: 1 });
    expect(result.errors[0]).toContain("telefone já pertence a Ana Souza");
    const rows = await listClients(db);
    expect(rows.map((row) => row.name).sort()).toEqual(["Ana Souza", "Bruno"]);
    expect(rows.find((row) => row.name === "Ana Souza")?.source).toBe("indicacao");
  });

  it("requires the essential columns and reports invalid rows", async () => {
    expect(await importClientRows(db, [["Nome"], ["Ana"]])).toMatchObject({ imported: 0, skipped: 1 });
    const invalid = await importClientRows(db, [HEADER, ["A", "123", "Desconhecido"]]);
    expect(invalid).toMatchObject({ imported: 0, skipped: 1 });
  });

  it("names the columns the row got wrong", async () => {
    const result = await importClientRows(db, [HEADER, ["A", "123", "Desconhecido"]]);
    // "A" é curto demais, "123" não tem DDD e "Desconhecido" não é um interesse.
    expect(result.errors).toEqual(["Linha 2: nome, telefone, interesse."]);
  });

  it("lists at most 20 broken rows and says how many were left out", async () => {
    const broken = Array.from({ length: 23 }, (_, i) => [`Cliente ${i}`, "123", "Imóvel"]);
    const result = await importClientRows(db, [HEADER, ...broken]);
    expect(result).toMatchObject({ imported: 0, skipped: 23 });
    expect(result.errors).toHaveLength(21);
    expect(result.errors[20]).toBe("…e mais 3 linhas com erro.");
    expect(result.errors[0]).toBe("Linha 2: telefone.");
  });

  it("refuses a spreadsheet above the row cap instead of grinding through it", async () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => [`Cliente ${i}`, "11987654321", "Imóvel"]);
    const result = await importClientRows(db, [HEADER, ...rows]);
    expect(result).toMatchObject({ imported: 0, skipped: MAX_IMPORT_ROWS + 1 });
    expect(result.errors[0]).toContain(`o limite por importação é ${MAX_IMPORT_ROWS}`);
    expect(await listClients(db)).toHaveLength(0);
  });

  it("keeps the rows already imported when it breaks in the middle", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const rows = [HEADER, ["Ana Souza", "11987654321", "Imóvel"], ["Bruno", "21999990000", "Automóvel"]];
    // A segunda gravação cai: o primeiro cliente já está salvo e precisa continuar salvo.
    const original = db.transaction.bind(db);
    let calls = 0;
    const spy = vi.spyOn(db, "transaction").mockImplementation(((fn: Parameters<typeof db.transaction>[0]) => {
      calls += 1;
      return calls > 1 ? Promise.reject(new Error("conexão caiu")) : original(fn);
    }) as typeof db.transaction);

    const result = await importClientRows(db, rows);
    spy.mockRestore();
    expect(result.imported).toBe(1);
    expect(result.error).toBeTruthy();
    expect(await listClients(db)).toHaveLength(1);
    expect(error).toHaveBeenCalled();
  });
});
