"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** Elementos que não devem iniciar a rolagem por arrasto (cards, botões, links, campos). */
const INTERACTIVE = "[data-no-pan], a, button, input, select, textarea, label";

export type DragScroll = {
  /** Espalhe no contêiner rolável. */
  handlers: { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void };
  /** Verdadeiro enquanto o usuário arrasta o fundo com o mouse. */
  panning: boolean;
  /** Quanto dá para rolar em cada direção (para as setas). */
  canScrollLeft: boolean;
  canScrollRight: boolean;
  /** Rola uma "página" (ou o passo informado) suavemente. */
  scrollBy: (delta: number) => void;
};

/**
 * Rolagem horizontal "de Trello": no desktop, clicar e arrastar o fundo rola o
 * quadro; no toque, a rolagem nativa já resolve. Também expõe se há mais conteúdo
 * para cada lado, para mostrar as setas.
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>): DragScroll {
  const [panning, setPanning] = useState(false);
  const [edges, setEdges] = useState({ canScrollLeft: false, canScrollRight: false });
  const start = useRef<{ x: number; scrollLeft: number; pointerId: number } | null>(null);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges((prev) => {
      const next = { canScrollLeft: el.scrollLeft > 4, canScrollRight: el.scrollLeft < max - 4 };
      return prev.canScrollLeft === next.canScrollLeft && prev.canScrollRight === next.canScrollRight ? prev : next;
    });
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [ref, measure]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const el = ref.current;
      if (!el || e.pointerType !== "mouse" || e.button !== 0) return;
      if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
      start.current = { x: e.clientX, scrollLeft: el.scrollLeft, pointerId: e.pointerId };
      setPanning(true);
      el.setPointerCapture(e.pointerId);
      const onMove = (ev: PointerEvent) => {
        if (!start.current || ev.pointerId !== start.current.pointerId) return;
        el.scrollLeft = start.current.scrollLeft - (ev.clientX - start.current.x);
      };
      const stop = () => {
        start.current = null;
        setPanning(false);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", stop);
        el.removeEventListener("pointercancel", stop);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", stop);
      el.addEventListener("pointercancel", stop);
    },
    [ref],
  );

  const scrollBy = useCallback(
    (delta: number) => {
      ref.current?.scrollBy({ left: delta, behavior: "smooth" });
    },
    [ref],
  );

  return { handlers: { onPointerDown }, panning, ...edges, scrollBy };
}
