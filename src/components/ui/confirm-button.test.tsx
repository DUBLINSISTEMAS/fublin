// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmButton } from "./confirm-button";

describe("ConfirmButton", () => {
  it("arms, cancels and only then submits with the hidden fields", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true });
    render(<ConfirmButton action={action} hidden={{ id: "x1" }} label="Excluir cliente" confirmLabel="Excluir" />);

    fireEvent.click(screen.getByRole("button", { name: "Excluir cliente" }));
    expect(screen.getByText("Tem certeza?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText("Tem certeza?")).not.toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Excluir cliente" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await vi.waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect((action.mock.calls[0][1] as FormData).get("id")).toBe("x1");
  });

  it("shows the error returned by the action", async () => {
    const action = vi.fn().mockResolvedValue({ ok: false, error: "Cliente não encontrado." });
    render(<ConfirmButton action={action} hidden={{ id: "x1" }} label="Excluir cliente" confirmLabel="Excluir" />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir cliente" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cliente não encontrado.");
  });
});
