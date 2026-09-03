import { describe, expect, it } from "vitest";
import { approvalSchema, clientInputSchema } from "./schema";

describe("approvalSchema — comissão desta venda", () => {
  const base = { id: "c1", credit: "100.000", adesao: "" };

  it("parses the rate with comma or dot and clears it with an empty field", () => {
    expect(approvalSchema.parse({ ...base, commissionRate: "0,5" }).commissionRate).toBe(0.5);
    expect(approvalSchema.parse({ ...base, commissionRate: "0.4" }).commissionRate).toBe(0.4);
    expect(approvalSchema.parse({ ...base, commissionRate: "" }).commissionRate).toBeNull();
  });

  it("leaves the rate untouched when the field is not sent", () => {
    expect(approvalSchema.parse(base).commissionRate).toBeUndefined();
  });

  it("rejects text and values outside 0–10%", () => {
    expect(approvalSchema.safeParse({ ...base, commissionRate: "abc" }).success).toBe(false);
    expect(approvalSchema.safeParse({ ...base, commissionRate: "11" }).success).toBe(false);
    expect(approvalSchema.safeParse({ ...base, commissionRate: "-1" }).success).toBe(false);
  });
});

const base = { name: "Ana Souza", phone: "11987654321", interest: "imovel" };
const errorsOf = (input: Record<string, unknown>) => {
  const result = clientInputSchema.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message]));
};

describe("clientInputSchema — qualificação e agendamento", () => {
  it("parses adesão and the installment range as cents", () => {
    const parsed = clientInputSchema.parse({ ...base, adesao: "5.000", installmentMin: "800", installmentMax: "R$ 1.200,50" });
    expect(parsed.adesao).toBe(500000);
    expect(parsed.installmentMin).toBe(80000);
    expect(parsed.installmentMax).toBe(120050);
  });

  it("accepts only the “até” (fixed installment) and rejects an inverted range", () => {
    expect(clientInputSchema.parse({ ...base, installmentMax: "900" }).installmentMin).toBeNull();
    expect(errorsOf({ ...base, installmentMin: "1.200", installmentMax: "900" })).toHaveProperty("installmentMax");
  });

  it("requires the detail when the interest is “outro” and leaves it optional otherwise", () => {
    expect(errorsOf({ ...base, interest: "outro" })).toEqual({ interestNotes: "Descreva o interesse" });
    expect(clientInputSchema.safeParse({ ...base, interest: "outro", interestNotes: "Investimento" }).success).toBe(true);
    expect(clientInputSchema.safeParse({ ...base, interest: "reforma" }).success).toBe(true);
  });

  it("wants day and time together for the appointment", () => {
    expect(errorsOf({ ...base, scheduleDay: "2026-09-03" })).toEqual({ scheduleTime: "Informe dia e horário" });
    expect(errorsOf({ ...base, scheduleTime: "14:30" })).toEqual({ scheduleDay: "Informe dia e horário" });
    expect(errorsOf({ ...base, scheduleDay: "2026-13-40", scheduleTime: "14:30" })).toHaveProperty("scheduleDay", "Data inválida");
    const parsed = clientInputSchema.parse({ ...base, scheduleDay: "2026-09-03", scheduleTime: "14:30" });
    expect(parsed.scheduleDay).toBe("2026-09-03");
    expect(parsed.scheduleTime).toBe("14:30");
    expect(clientInputSchema.parse({ ...base, scheduleDay: "", scheduleTime: "" }).scheduleDay).toBeUndefined();
  });
});
