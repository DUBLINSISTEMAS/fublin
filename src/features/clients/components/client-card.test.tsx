// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeLeader, makeListItem, makeNextAppointment, NOW } from "@/test/fixtures";
import { cardFooter, ClientCard } from "./client-card";

vi.mock("../actions", () => ({ assignLeaderAction: vi.fn(), deleteClientAction: vi.fn(), moveClientAction: vi.fn() }));

describe("cardFooter", () => {
  it("names the kind of the next appointment, then closing, approval, first attendance, and a placeholder", () => {
    expect(cardFooter(makeListItem({ nextAppointment: makeNextAppointment(), closedAt: NOW.toISOString(), status: "fechou" }))).toEqual({
      label: "Visita à loja",
      title: "Tipo do próximo agendamento",
    });
    expect(cardFooter(makeListItem({ nextAppointment: makeNextAppointment({ kind: "reuniao" }) })).label).toBe("Reunião online");
    expect(cardFooter(makeListItem({ status: "fechou", closedAt: new Date(2026, 7, 20).toISOString(), approvedAt: NOW.toISOString() })).label).toBe("Fechou 20 ago");
    expect(cardFooter(makeListItem({ status: "aprovado", approvedAt: new Date(2026, 7, 21).toISOString(), firstVisitAt: NOW.toISOString() })).label).toBe("Aprovado 21 ago");
    expect(cardFooter(makeListItem({ status: "atendido", firstVisitAt: new Date(2026, 7, 22).toISOString() })).label).toBe("Atendido 22 ago");
    expect(cardFooter(makeListItem())).toEqual({ label: "Sem agendamento" });
  });
});

describe("ClientCard", () => {
  const render1 = (client: Parameters<typeof makeListItem>[0]) => {
    const leader = makeLeader();
    render(<ClientCard client={makeListItem({ leader, leaderId: leader.id, ...client })} now={NOW} leaders={[leader]} onMove={() => undefined} />);
  };

  it("renders name, credit, leader and meeting count", () => {
    render1({ meetingsCount: 2, meetingsTotal: 2, attendance: "online" });
    expect(screen.getByRole("link", { name: "Ana Paula Souza" })).toHaveAttribute("href", "/clientes/cli-1");
    expect(screen.getByText(/R\$\s?300 mil/)).toBeInTheDocument();
    expect(screen.getByText("Carlos Menezes")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByTitle("2 de 2 encontros marcados já realizados")).toHaveTextContent("2");
    expect(screen.getByRole("article")).toHaveAccessibleName("Ana Paula Souza, Novo");
  });

  it("shows the weekday, the time and which meeting it is", () => {
    // 3 set 2026 é uma quinta-feira: longe o bastante para não virar "Hoje"/"Amanhã".
    render1({ nextAppointment: makeNextAppointment({ scheduledAt: new Date(2026, 8, 3, 14, 30).toISOString(), meetingNumber: 3 }) });
    expect(screen.getByText("Qui, 3 set")).toBeInTheDocument();
    expect(screen.getByText("14:30")).toBeInTheDocument();
    expect(screen.getByText("Dia")).toBeInTheDocument();
    expect(screen.getByText("Horário")).toBeInTheDocument();
    expect(screen.getByTitle("3ª visita à loja")).toHaveTextContent("3ª");
    expect(screen.getByText("Visita à loja")).toBeInTheDocument();
  });

  it('writes "Hoje" and "Amanhã" instead of the date for what is about to happen', () => {
    render1({ nextAppointment: makeNextAppointment({ scheduledAt: new Date(2026, 7, 27, 16, 0).toISOString() }) });
    expect(screen.getByText("Hoje")).toBeInTheDocument();
    expect(screen.getByText("16:00")).toBeInTheDocument();
  });

  it("marks an online meeting as such", () => {
    render1({ nextAppointment: makeNextAppointment({ kind: "reuniao", meetingNumber: 2 }) });
    expect(screen.getByText("Amanhã")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByTitle("2ª reunião online")).toHaveTextContent("2ª");
  });

  it("does not number a call — it is a contact, not a meeting", () => {
    render1({ nextAppointment: makeNextAppointment({ kind: "ligacao", meetingNumber: null }) });
    expect(screen.getByText("Amanhã")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.queryByText(/^\d+ª$/)).not.toBeInTheDocument();
    expect(screen.getByText("Ligação")).toBeInTheDocument();
  });

  it("shows adesão and the installment range, and warns when no adesão was agreed", () => {
    render1({ adesaoCents: 500000, installmentMinCents: 80000, installmentMaxCents: 120000 });
    expect(screen.getByTitle("Adesão (entrada) e parcela que cabe no bolso")).toHaveTextContent(/Adesão R\$\s?5 mil · Parcela R\$\s?800 a R\$\s?1,2 mil/);
    expect(screen.queryByText("Sem adesão combinada")).not.toBeInTheDocument();
  });

  it("flags a client without adesão while the sale is still open", () => {
    render1({ adesaoCents: null });
    expect(screen.getByText("Sem adesão combinada")).toBeInTheDocument();
  });

  it("uses the custom interest as the chip when the interest is “outro”", () => {
    render1({ interest: "outro", interestNotes: "Investimento" });
    expect(screen.getByText("Investimento")).toBeInTheDocument();
    expect(screen.queryByText("Outro")).not.toBeInTheDocument();
  });

  it("asks the owner to assign a leader when there is none", () => {
    render(<ClientCard client={makeListItem()} now={NOW} leaders={[]} onMove={() => undefined} />);
    expect(screen.getByText("Sem líder")).toBeInTheDocument();
    expect(screen.getByText("Atribuir no menu")).toBeInTheDocument();
  });
});
