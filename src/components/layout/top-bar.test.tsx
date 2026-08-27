// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TopBar } from "./top-bar";

const nav = vi.hoisted(() => ({ pathname: "/clientes", params: new URLSearchParams(), replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => nav.params,
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
}));

beforeEach(() => {
  nav.pathname = "/clientes";
  nav.params = new URLSearchParams("q=ana");
  nav.replace.mockReset();
  nav.push.mockReset();
  vi.useFakeTimers();
});

describe("TopBar search", () => {
  it("mirrors the URL, including browser back/forward", () => {
    const { rerender } = render(<TopBar />);
    const input = screen.getByRole("searchbox", { name: "Buscar cliente" });
    expect(input).toHaveValue("ana");

    nav.params = new URLSearchParams();
    rerender(<TopBar />);
    expect(input).toHaveValue("");
    vi.runAllTimers();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("debounces typing into the URL on the clients page", () => {
    render(<TopBar />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "bruno " } });
    expect(nav.replace).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(nav.replace).toHaveBeenCalledWith("/clientes?q=bruno", { scroll: false });
  });

  it("navigates to the clients page on submit from elsewhere", () => {
    nav.pathname = "/";
    nav.params = new URLSearchParams();
    render(<TopBar />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Ana" } });
    fireEvent.submit(screen.getByRole("searchbox").closest("form")!);
    expect(nav.push).toHaveBeenCalledWith("/clientes?q=Ana");
    vi.runAllTimers();
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
