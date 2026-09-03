import { describe, expect, it } from "vitest";
import { buildConfirmationMessage } from "./confirmation";

// 3 set 2026 é quinta-feira.
const when = new Date(2026, 8, 3, 14, 30);

describe("buildConfirmationMessage", () => {
  it("writes the in-store confirmation in the owner's format", () => {
    const text = buildConfirmationMessage({ clientName: "Ana Paula Souza", attendance: "presencial", when, interest: "imovel", interestNotes: "apartamento na zona sul", leaderName: "Carlos" });
    expect(text).toBe(
      [
        "*Agendamento*",
        "Presencial",
        "",
        "Consultor: Anderson Felipe",
        "Nome: Ana Paula Souza",
        "Data: Quinta-feira, 3 de setembro (03/09/2026)",
        "Horário: 14:30",
        "Líder de vendas: Carlos",
        "Observação: Imóvel · apartamento na zona sul",
        "",
        "Me confirma com um OK, por favor. 👌",
      ].join("\n"),
    );
  });

  it("says Online, skips the leader line when there is none, and uses the custom interest as the observation", () => {
    const text = buildConfirmationMessage({ clientName: "Bia", attendance: "online", when, interest: "outro", interestNotes: "Investimento", leaderName: null });
    expect(text).toContain("\nOnline\n");
    expect(text).not.toContain("Líder de vendas");
    expect(text).toContain("Observação: Investimento");
  });

  it("falls back to the interest label when there is no detail", () => {
    expect(buildConfirmationMessage({ clientName: "Bia", attendance: "presencial", when, interest: "reforma" })).toContain("Observação: Reforma");
  });

  it("always signs as Anderson Felipe", () => {
    const text = buildConfirmationMessage({ clientName: "Bia", attendance: "presencial", when, interest: "reforma" });
    expect(text).toContain("Consultor: Anderson Felipe");
    expect(text).toContain("Me confirma com um OK, por favor. 👌");
  });
});
