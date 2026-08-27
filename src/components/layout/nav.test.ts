import { describe, expect, it } from "vitest";
import { isNavActive, MOBILE_TABS, NAV_ITEMS } from "./nav";

const item = (href: string) => NAV_ITEMS.find((i) => i.href === href)!;

describe("isNavActive", () => {
  it("matches Hoje only on the root", () => {
    expect(isNavActive(item("/"), "/")).toBe(true);
    expect(isNavActive(item("/"), "/clientes")).toBe(false);
  });
  it("matches a section and its sub-routes, not prefixes of other words", () => {
    expect(isNavActive(item("/clientes"), "/clientes")).toBe(true);
    expect(isNavActive(item("/clientes"), "/clientes/abc/editar")).toBe(true);
    expect(isNavActive(item("/clientes"), "/clientesx")).toBe(false);
  });
  it("lights up Mais for the routes it groups", () => {
    const mais = MOBILE_TABS.find((i) => i.href === "/mais")!;
    expect(isNavActive(mais, "/lideres")).toBe(true);
    expect(isNavActive(mais, "/config")).toBe(true);
    expect(isNavActive(mais, "/agenda")).toBe(false);
  });
  it("keeps the mobile bar at five tabs", () => {
    expect(MOBILE_TABS).toHaveLength(5);
  });
});
