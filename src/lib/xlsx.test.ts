import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildWorkbook, XLSX_MIME, xlsxResponse, type XlsxColumn } from "./xlsx";

type Sale = { name: string; creditCents: number | null; count: number; closedAt: string | null; nextAt: string | null };

const columns: XlsxColumn<Sale>[] = [
  { label: "Cliente", type: "text", get: (r) => r.name },
  { label: "Carta (R$)", type: "money", get: (r) => r.creditCents },
  { label: "Atendimentos", type: "integer", get: (r) => r.count },
  { label: "Fechou em", type: "date", get: (r) => r.closedAt },
  { label: "Próximo", type: "datetime", get: (r) => r.nextAt },
];

// 05/09/2026 23:30 local: em UTC (fuso negativo) já é dia 6 — a planilha tem de mostrar dia 5.
const closedAt = new Date(2026, 8, 5, 23, 30);
const nextAt = new Date(2026, 8, 7, 14, 30);
const rows: Sale[] = [
  { name: "Ana =SOMA(A1)", creditCents: 123456, count: 3, closedAt: closedAt.toISOString(), nextAt: nextAt.toISOString() },
  { name: "Bia", creditCents: null, count: 0, closedAt: null, nextAt: null },
];

/** Mesma conta da lib: dias desde 30/12/1899, a partir do instante UTC. */
const UNIX_EPOCH_SERIAL = 25569;
const DAY_MS = 24 * 60 * 60 * 1000;
const serialOf = (utcMs: number) => utcMs / DAY_MS + UNIX_EPOCH_SERIAL;

function unzip(buffer: Buffer) {
  const files = unzipSync(new Uint8Array(buffer));
  const read = (path: string) => strFromU8(files[path]);
  return { sheet: read("xl/worksheets/sheet1.xml"), strings: read("xl/sharedStrings.xml"), styles: read("xl/styles.xml") };
}

describe("buildWorkbook", () => {
  it("produces a zip (.xlsx) whose header labels and texts are shared strings, never formulas", async () => {
    const buffer = await buildWorkbook({ sheetName: "Vendas", columns, rows });
    expect(buffer.subarray(0, 2).toString("latin1")).toBe("PK");
    const { strings, sheet } = unzip(buffer);
    expect(strings).toContain("<t>Cliente</t>");
    expect(strings).toContain("<t>Carta (R$)</t>");
    expect(strings).toContain("<t>Ana =SOMA(A1)</t>");
    expect(sheet).toContain('t="s"');
    expect(sheet).not.toContain("<f>");
  });

  it("writes money in reais, integers as numbers and registers the pt-BR formats", async () => {
    const { sheet, styles } = unzip(await buildWorkbook({ sheetName: "Vendas", columns, rows }));
    expect(sheet).toContain("<v>1234.56</v>");
    expect(sheet).toContain("<v>3</v>");
    expect(sheet).toContain("<v>0</v>");
    expect(styles).toContain('formatCode="&quot;R$&quot; #,##0.00"');
    expect(styles).toContain('formatCode="dd/mm/yyyy"');
    expect(styles).toContain('formatCode="dd/mm/yyyy hh:mm"');
  });

  it("stores dates as the local calendar day and local time, not the UTC instant", async () => {
    const { sheet } = unzip(await buildWorkbook({ sheetName: "Vendas", columns, rows }));
    expect(sheet).toContain(`<v>${serialOf(Date.UTC(2026, 8, 5))}</v>`);
    expect(sheet).toContain(`<v>${serialOf(Date.UTC(2026, 8, 7, 14, 30))}</v>`);
  });

  it("names the sheet and freezes the header row", async () => {
    const buffer = await buildWorkbook({ sheetName: "Vendas", columns, rows });
    const files = unzipSync(new Uint8Array(buffer));
    expect(strFromU8(files["xl/workbook.xml"])).toContain('name="Vendas"');
    expect(strFromU8(files["xl/worksheets/sheet1.xml"])).toContain("<pane ");
  });

  it("fails fast when a value does not match the column type", async () => {
    const broken: XlsxColumn<Sale>[] = [{ label: "Carta (R$)", type: "money", get: () => "abc" }];
    await expect(buildWorkbook({ sheetName: "Vendas", columns: broken, rows })).rejects.toThrow(/Carta \(R\$\)/);
  });
});

describe("xlsxResponse", () => {
  it("sets the Excel content type, the attachment filename and no-store", async () => {
    const buffer = await buildWorkbook({ sheetName: "Vendas", columns, rows: [] });
    const res = xlsxResponse(buffer, "clientes-2026-08-27");
    expect(res.headers.get("Content-Type")).toBe(XLSX_MIME);
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="clientes-2026-08-27.xlsx"');
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = new Uint8Array(await res.arrayBuffer());
    expect(String.fromCharCode(body[0], body[1])).toBe("PK");
  });

  it("keeps an existing .xlsx extension and strips unsafe characters from the name", () => {
    const res = xlsxResponse(Buffer.from("PK"), 'a"b/c.xlsx');
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="a-b-c.xlsx"');
  });
});
