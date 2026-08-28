// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFlip } from "./use-flip";

/** Onde o quadro começa na janela (ele não fica colado na borda). */
const BOARD_LEFT = 20;
/** Layout simulado: jsdom devolve zeros em todo `getBoundingClientRect`. */
const world = { scrollLeft: 0, cards: { a: 0, b: 300 } as Record<string, number> };

const realRect = Element.prototype.getBoundingClientRect;
const realScrollLeft = Object.getOwnPropertyDescriptor(Element.prototype, "scrollLeft")!;

function mockLayout() {
  Element.prototype.getBoundingClientRect = function () {
    const id = (this as HTMLElement).dataset?.flipId;
    const left = id === undefined ? BOARD_LEFT : BOARD_LEFT + world.cards[id] - world.scrollLeft;
    return { left, top: 0, right: left, bottom: 0, width: 0, height: 0, x: left, y: 0, toJSON: () => ({}) } as DOMRect;
  };
  Object.defineProperty(Element.prototype, "scrollLeft", { configurable: true, get: () => world.scrollLeft, set: () => {} });
}

function restoreLayout() {
  Element.prototype.getBoundingClientRect = realRect;
  Object.defineProperty(Element.prototype, "scrollLeft", realScrollLeft);
}

function Board({ tick }: { tick: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useFlip(ref);
  return (
    <div ref={ref} data-tick={tick}>
      <div data-flip-id="a" />
      <div data-flip-id="b" />
    </div>
  );
}

describe("useFlip", () => {
  afterEach(() => {
    restoreLayout();
    world.scrollLeft = 0;
    world.cards = { a: 0, b: 300 };
    vi.restoreAllMocks();
  });

  it("não anima quando o quadro só rolou para o lado", () => {
    mockLayout();
    const { rerender } = render(<Board tick={0} />);
    const animate = vi.spyOn(Element.prototype, "animate");

    world.scrollLeft = 250; // passar para as próximas etapas
    rerender(<Board tick={1} />);

    expect(animate).not.toHaveBeenCalled();
  });

  it("anima o card que trocou de lugar de verdade", () => {
    mockLayout();
    const { rerender } = render(<Board tick={0} />);
    const animate = vi.spyOn(Element.prototype, "animate");

    world.scrollLeft = 250;
    world.cards = { a: 300, b: 0 }; // o card "a" foi para outra coluna
    rerender(<Board tick={1} />);

    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate.mock.calls[0][0]).toEqual([{ transform: "translate(-300px, 0px)" }, { transform: "translate(0, 0)" }]);
    expect(animate.mock.calls[1][0]).toEqual([{ transform: "translate(300px, 0px)" }, { transform: "translate(0, 0)" }]);
  });
});
