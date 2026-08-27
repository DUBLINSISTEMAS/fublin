import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sem `globals: true` o Testing Library não registra o cleanup sozinho: cada teste começa com o DOM vazio.
afterEach(cleanup);

// jsdom não implementa algumas APIs de layout que os componentes usam; aqui elas viram no-ops.
if (typeof window !== "undefined") {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (query: string) =>
      ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList;
  }
  if (typeof window.ResizeObserver === "undefined") {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  if (typeof Element.prototype.animate !== "function") {
    Element.prototype.animate = () => ({ cancel() {}, finished: Promise.resolve() }) as unknown as Animation;
  }
}
