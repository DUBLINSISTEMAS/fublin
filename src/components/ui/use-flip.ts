"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { readZoom } from "./zoom";

const DURATION_MS = 320;
const EASING = "cubic-bezier(0.2, 0, 0, 1)";

type Point = { x: number; y: number };

/**
 * FLIP: depois de cada render, cada `[data-flip-id]` que mudou de lugar desliza
 * da posição antiga para a nova em vez de saltar. Assim, quando um card entra numa
 * coluna, os vizinhos abrem espaço com suavidade e dá para ver quem chegou.
 * Elementos marcados com `data-flip-skip` (o que está sendo arrastado) ficam de fora.
 *
 * As posições são guardadas em coordenadas do conteúdo do quadro (descontando a
 * rolagem), não da tela: rolar o quadro para o lado não é "mudar de lugar", então
 * os cards não disparam a animação ao passar de uma etapa para outra.
 */
export function useFlip(root: RefObject<HTMLElement | null>) {
  const previous = useRef(new Map<string, Point>());

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const zoom = readZoom();
    const origin = el.getBoundingClientRect();
    const next = new Map<string, Point>();
    for (const node of el.querySelectorAll<HTMLElement>("[data-flip-id]")) {
      const id = node.dataset.flipId!;
      const rect = node.getBoundingClientRect();
      // Pixels de tela → pixels de layout (zoom) e depois → pixels do conteúdo (rolagem).
      const point: Point = {
        x: (rect.left - origin.left) / zoom + el.scrollLeft,
        y: (rect.top - origin.top) / zoom + el.scrollTop,
      };
      next.set(id, point);
      const before = previous.current.get(id);
      if (!before || reduced || node.dataset.flipSkip !== undefined) continue;
      const dx = before.x - point.x;
      const dy = before.y - point.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], { duration: DURATION_MS, easing: EASING });
    }
    previous.current = next;
  });
}
