// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CLIENT_STATUSES } from "@/lib/domain";
import { StatusChips } from "./status-chips";

const counts = Object.fromEntries(CLIENT_STATUSES.map((s) => [s, 0])) as Record<(typeof CLIENT_STATUSES)[number], number>;

describe("StatusChips", () => {
  it("keeps the other filters in the links and drops the status for 'Todos'", () => {
    render(<StatusChips filters={{ status: "novo", leaderId: "l1" }} counts={{ ...counts, novo: 2, fechou: 1 }} params={{ lider: "l1", status: "novo", q: ["ana"] }} />);
    expect(screen.getByRole("link", { name: /^Todos/ })).toHaveAttribute("href", "/clientes?lider=l1&q=ana");
    expect(screen.getByRole("link", { name: /^Fechou/ })).toHaveAttribute("href", "/clientes?lider=l1&q=ana&status=fechou");
    expect(screen.getByRole("link", { name: /^Novo/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: /^Todos/ })).not.toHaveAttribute("aria-current");
  });

  it("sums totals and open clients", () => {
    render(<StatusChips filters={{}} counts={{ ...counts, novo: 2, perdido: 3, aprovado: 1 }} params={{}} />);
    expect(screen.getByRole("link", { name: /^Todos/ })).toHaveTextContent("6");
    expect(screen.getByRole("link", { name: /^Abertos/ })).toHaveTextContent("3");
  });
});
