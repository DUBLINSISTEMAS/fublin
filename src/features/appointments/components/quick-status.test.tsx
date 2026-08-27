// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuickStatus } from "./quick-status";

const actions = vi.hoisted(() => ({ setAppointmentStatusAction: vi.fn() }));
vi.mock("../actions", () => actions);

beforeEach(() => actions.setAppointmentStatusAction.mockReset());

describe("QuickStatus", () => {
  it("submits the chosen status and stays quiet on success", async () => {
    actions.setAppointmentStatusAction.mockResolvedValue({ ok: true });
    render(<QuickStatus appointmentId="ap-1" layout="row" />);
    fireEvent.click(screen.getByRole("button", { name: "Realizado" }));
    await vi.waitFor(() => expect(actions.setAppointmentStatusAction).toHaveBeenCalledTimes(1));
    const formData = actions.setAppointmentStatusAction.mock.calls[0][1] as FormData;
    expect(formData.get("id")).toBe("ap-1");
    expect(formData.get("status")).toBe("realizado");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the server error next to the buttons", async () => {
    actions.setAppointmentStatusAction.mockResolvedValue({ ok: false, error: "Agendamento não encontrado." });
    render(<QuickStatus appointmentId="ap-1" layout="card" />);
    fireEvent.click(screen.getByRole("button", { name: "Faltou" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Agendamento não encontrado.");
  });
});
