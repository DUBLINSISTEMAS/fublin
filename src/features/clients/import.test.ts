import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { listClients } from "./queries";
import { importClientRows } from "./import";

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
    const invalid = await importClientRows(db, [["Nome", "Telefone", "Interesse"], ["A", "123", "Desconhecido"]]);
    expect(invalid).toMatchObject({ imported: 0, skipped: 1 });
  });
});
