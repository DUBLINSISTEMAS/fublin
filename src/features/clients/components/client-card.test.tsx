// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeLeader, makeListItem, NOW } from "@/test/fixtures";
import { cardFooter, ClientCard } from "./client-card";

vi.mock("../actions", () => ({ assignLeaderAction: vi.fn(), moveClientAction: vi.fn() }));

describe("cardFooter", () => {
  it("prefers the next appointment, then closing, approval, first attendance, and finally a placeholder", () => {
    const next = { id: "a1", scheduledAt: new Date(2026, 7, 28, 10).toISOString(), kind: "visita" as const, status: "agendado" as const };
    expect(cardFooter(makeListItem({ nextAppointment: next, closedAt: NOW.toISOString(), status: "fechou" }), NOW)).toEqual({ label: "Amanhã", title: "Próximo agendamento" });
    expect(cardFooter(makeListItem({ status: "fechou", closedAt: new Date(2026, 7, 20).toISOString(), approvedAt: NOW.toISOString() }), NOW).label).toBe("Fechou 20 ago");
    expect(cardFooter(makeListItem({ status: "aprovado", approvedAt: new Date(2026, 7, 21).toISOString(), firstVisitAt: NOW.toISOString() }), NOW).label).toBe("Aprovado 21 ago");
    expect(cardFooter(makeListItem({ status: "atendido", firstVisitAt: new Date(2026, 7, 22).toISOString() }), NOW).label).toBe("Atendido 22 ago");
    expect(cardFooter(makeListItem(), NOW)).toEqual({ label: "Sem agendamento" });
  });
});

describe("ClientCard", () => {
  it("renders name, credit, leader and meeting count", () => {
    const leader = makeLeader();
    render(<ClientCard client={makeListItem({ leader, leaderId: leader.id, meetingsCount: 2, attendance: "online" })} now={NOW} leaders={[leader]} onMove={() => undefined} />);
    expect(screen.getByRole("link", { name: "Ana Paula Souza" })).toHaveAttribute("href", "/clientes/cli-1");
    expect(screen.getByText(/R\$\s?300 mil/)).toBeInTheDocument();
    expect(screen.getByText("Carlos Menezes")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByTitle("Atendimentos realizados com o líder")).toHaveTextContent("2");
    expect(screen.getByRole("article")).toHaveAccessibleName("Ana Paula Souza, Novo");
  });

  it("asks the owner to assign a leader when there is none", () => {
    render(<ClientCard client={makeListItem()} now={NOW} leaders={[]} onMove={() => undefined} />);
    expect(screen.getByText("Sem líder")).toBeInTheDocument();
    expect(screen.getByText("Atribuir no menu")).toBeInTheDocument();
  });
});
