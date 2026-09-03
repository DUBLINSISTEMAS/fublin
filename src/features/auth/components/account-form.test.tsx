// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/toast";
import { AccountForm } from "./account-form";

const actions = vi.hoisted(() => ({ changePasswordAction: vi.fn() }));
vi.mock("../actions", () => actions);

beforeEach(() => actions.changePasswordAction.mockReset());

function fill() {
  fireEvent.change(screen.getByLabelText(/Senha atual/), { target: { value: "segredo123" } });
  fireEvent.change(screen.getByLabelText(/^Nova senha/), { target: { value: "novasenha1" } });
  fireEvent.change(screen.getByLabelText(/Repita a nova senha/), { target: { value: "novasenha1" } });
}

describe("AccountForm", () => {
  it("sends the three fields and announces the change", async () => {
    actions.changePasswordAction.mockResolvedValue({ status: "success", message: "Senha alterada." });
    render(
      <>
        <AccountForm name="Anderson" login="anderson" />
        <Toaster />
      </>,
    );
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Trocar senha" }));

    await vi.waitFor(() => expect(actions.changePasswordAction).toHaveBeenCalledTimes(1));
    const formData = actions.changePasswordAction.mock.calls[0][1] as FormData;
    expect(formData.get("currentPassword")).toBe("segredo123");
    expect(formData.get("password")).toBe("novasenha1");
    expect(formData.get("confirmPassword")).toBe("novasenha1");
    expect(await screen.findByText("Senha alterada.")).toBeInTheDocument();
    // Senha digitada não fica na tela depois de salva.
    await vi.waitFor(() => expect(screen.getByLabelText(/Senha atual/)).toHaveValue(""));
  });

  it("shows the server refusal and never repopulates the typed passwords", async () => {
    actions.changePasswordAction.mockResolvedValue({ status: "error", message: "A senha atual está incorreta." });
    render(<AccountForm name="Anderson" login="anderson" />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Trocar senha" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("A senha atual está incorreta.");
    expect(screen.getByLabelText(/^Nova senha/)).toHaveValue("");
  });
});
