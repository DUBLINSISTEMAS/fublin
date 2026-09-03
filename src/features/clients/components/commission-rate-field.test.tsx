// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommissionRateField } from "./commission-rate-field";

const hiddenValue = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[name="commissionRate"]')?.value;

describe("CommissionRateField", () => {
  it("starts on the default and sends an empty rate (= use the settings rate)", () => {
    const { container } = render(<CommissionRateField defaultRatePercent={0.4} initialValue="" />);
    expect(screen.getByRole("combobox", { name: "Comissão desta venda" })).toHaveValue("");
    expect(screen.getByRole("option", { name: "Padrão (0,4%)" })).toBeInTheDocument();
    expect(hiddenValue(container)).toBe("");
  });

  it("offers the ready-made rates and sends the chosen one", () => {
    const { container } = render(<CommissionRateField defaultRatePercent={0.4} initialValue="" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "0,5" } });
    expect(hiddenValue(container)).toBe("0,5");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Padrão (0,4%)", "0,5%", "0,6%", "0,8%", "Personalizar…"]);
  });

  it("shows a text input for a custom percentage and reopens it for a saved custom rate", () => {
    const { container } = render(<CommissionRateField defaultRatePercent={0.4} initialValue="0,7" />);
    const custom = screen.getByRole("textbox", { name: "Porcentagem personalizada" });
    expect(custom).toHaveValue("0,7");
    expect(screen.getByRole("combobox")).toHaveValue("custom");
    expect(container.querySelector('input[type="hidden"][name="commissionRate"]')).toBeNull();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(hiddenValue(container)).toBe("");
  });

  it("preselects a saved preset", () => {
    render(<CommissionRateField defaultRatePercent={0.4} initialValue="0,8" />);
    expect(screen.getByRole("combobox")).toHaveValue("0,8");
  });
});
