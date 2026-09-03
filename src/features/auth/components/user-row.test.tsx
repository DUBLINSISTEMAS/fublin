// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/toast";
import type { ManagedUser } from "../service";
import { UserRow } from "./user-row";

const actions = vi.hoisted(() => ({ toggleUserAction: vi.fn(), resetPasswordAction: vi.fn(), unlockUserAction: vi.fn() }));
vi.mock("../actions", () => actions);

const user: ManagedUser = {
  id: "u-1",
  name: "Carlos",
  login: "carlos",
  role: "leader",
  leaderId: "l-1",
  active: true,
  lockedUntil: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

function renderRow(props: Partial<Parameters<typeof UserRow>[0]> = {}) {
  return render(
    <>
      <ul>
        <UserRow user={user} leaderName="Carlos" current={false} {...props} />
      </ul>
      <Toaster />
    </>,
  );
}

beforeEach(() => {
  actions.toggleUserAction.mockReset();
  actions.resetPasswordAction.mockReset();
  actions.unlockUserAction.mockReset();
});

describe("UserRow", () => {
  it("announces that the access was turned off", async () => {
    actions.toggleUserAction.mockResolvedValue({ ok: true });
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: "Desativar" }));
    expect(await screen.findByText("Acesso desativado.")).toBeInTheDocument();
  });

  it("announces that the access was turned back on", async () => {
    actions.toggleUserAction.mockResolvedValue({ ok: true });
    renderRow({ user: { ...user, active: false } });
    fireEvent.click(screen.getByRole("button", { name: "Ativar" }));
    expect(await screen.findByText("Acesso ativado.")).toBeInTheDocument();
  });

  it("shows the server error instead of a false confirmation", async () => {
    actions.toggleUserAction.mockResolvedValue({ ok: false, error: "Usuário não encontrado." });
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: "Desativar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Usuário não encontrado.");
  });

  it("offers the unlock button only while the account is blocked", async () => {
    actions.unlockUserAction.mockResolvedValue({ ok: true });
    const { unmount } = renderRow();
    expect(screen.queryByRole("button", { name: "Desbloquear" })).not.toBeInTheDocument();
    unmount();

    renderRow({ lockedLabel: "Bloqueado até 14:32" });
    expect(screen.getByText("Bloqueado até 14:32")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Desbloquear" }));
    await vi.waitFor(() => expect(actions.unlockUserAction).toHaveBeenCalledTimes(1));
    expect((actions.unlockUserAction.mock.calls[0][1] as FormData).get("id")).toBe("u-1");
    expect(await screen.findByText("Acesso desbloqueado.")).toBeInTheDocument();
  });

  it("resets someone else's password and closes the form afterwards", async () => {
    actions.resetPasswordAction.mockResolvedValue({ status: "success", message: "Senha redefinida." });
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: "Redefinir senha" }));
    fireEvent.change(screen.getByLabelText(/Nova senha/), { target: { value: "outrasenha1" } });
    fireEvent.change(screen.getByLabelText(/Repita a nova senha/), { target: { value: "outrasenha1" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));

    await vi.waitFor(() => expect(actions.resetPasswordAction).toHaveBeenCalledTimes(1));
    const formData = actions.resetPasswordAction.mock.calls[0][1] as FormData;
    expect(formData.get("id")).toBe("u-1");
    expect(formData.get("password")).toBe("outrasenha1");
    expect(formData.get("confirmPassword")).toBe("outrasenha1");
    expect(await screen.findByText("Senha redefinida.")).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.queryByLabelText(/Nova senha/)).not.toBeInTheDocument());
  });

  it("never offers to reset the password of the logged in administrator", () => {
    renderRow({ current: true, user: { ...user, role: "admin", leaderId: null } });
    expect(screen.queryByRole("button", { name: "Redefinir senha" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desativar" })).not.toBeInTheDocument();
    expect(screen.getByText("Carlos (você)")).toBeInTheDocument();
  });
});
