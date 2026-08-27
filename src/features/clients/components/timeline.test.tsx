// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ACTIVITY_TYPES } from "@/lib/domain";
import { Timeline } from "./timeline";

describe("Timeline", () => {
  it("shows an empty message without items", () => {
    render(<Timeline items={[]} />);
    expect(screen.getByText("Sem histórico ainda.")).toBeInTheDocument();
  });

  it("renders one entry per activity, with an icon for every activity type", () => {
    const items = ACTIVITY_TYPES.map((type, i) => ({ id: `a${i}`, type, content: `Evento ${type}`, createdAt: new Date(2026, 7, 27, 9, i).toISOString() }));
    const { container } = render(<Timeline items={items} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(ACTIVITY_TYPES.length);
    expect(container.querySelectorAll("svg")).toHaveLength(ACTIVITY_TYPES.length);
    expect(screen.getByText("Evento anexo")).toBeInTheDocument();
    expect(screen.getByText("27/08/2026 · 09:00")).toBeInTheDocument();
  });
});
