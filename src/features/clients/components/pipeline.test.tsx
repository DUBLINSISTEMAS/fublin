// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeListItem, NOW } from "@/test/fixtures";
import { Pipeline } from "./pipeline";

const actions = vi.hoisted(() => ({ moveClientAction: vi.fn(), assignLeaderAction: vi.fn() }));
vi.mock("../actions", () => actions);

const column = (name: string) => within(screen.getByRole("region", { name: `Coluna ${name}` }));

function openMenuAndMove(cardName: string, status: string) {
  const card = screen.getByRole("article", { name: new RegExp(`^${cardName}`) });
  fireEvent.click(within(card).getByRole("button", { name: "Opções do cliente" }));
  fireEvent.change(screen.getByLabelText("Mover para"), { target: { value: status } });
}

beforeEach(() => {
  actions.moveClientAction.mockReset();
});

describe("Pipeline", () => {
  const items = [makeListItem({ id: "c1", name: "Ana Souza", status: "novo" }), makeListItem({ id: "c2", name: "Bruno Lima", status: "atendido" })];

  it("groups clients by column", () => {
    render(<Pipeline items={items} leaders={[]} now={NOW} />);
    expect(column("Novo").getByText("Ana Souza")).toBeInTheDocument();
    expect(column("Atendido").getByText("Bruno Lima")).toBeInTheDocument();
    expect(column("Perdido").getByText("Arraste aqui quem desistiu.")).toBeInTheDocument();
  });

  it("moves optimistically through the card menu and calls the server once", async () => {
    let resolve!: (v: { ok: true }) => void;
    actions.moveClientAction.mockImplementation(() => new Promise((r) => (resolve = r)));
    render(<Pipeline items={items} leaders={[]} now={NOW} />);

    openMenuAndMove("Ana Souza", "analise");
    // Antes da resposta do servidor o card já está na coluna nova.
    expect(column("Em análise").getByText("Ana Souza")).toBeInTheDocument();
    expect(column("Novo").queryByText("Ana Souza")).not.toBeInTheDocument();
    expect(actions.moveClientAction).toHaveBeenCalledTimes(1);
    expect(actions.moveClientAction).toHaveBeenCalledWith("c1", "analise");

    resolve({ ok: true });
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(column("Em análise").getByText("Ana Souza")).toBeInTheDocument();
  });

  it("rolls back and shows the error when the server refuses", async () => {
    actions.moveClientAction.mockResolvedValue({ ok: false, error: "Cliente não encontrado." });
    render(<Pipeline items={items} leaders={[]} now={NOW} />);

    openMenuAndMove("Bruno Lima", "fechou");
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("Cliente não encontrado.");
    expect(column("Atendido").getByText("Bruno Lima")).toBeInTheDocument();
    expect(column("Fechou").queryByText("Bruno Lima")).not.toBeInTheDocument();
  });

  it("ignores a move to the same column", () => {
    render(<Pipeline items={items} leaders={[]} now={NOW} />);
    openMenuAndMove("Ana Souza", "novo");
    expect(actions.moveClientAction).not.toHaveBeenCalled();
  });
});
