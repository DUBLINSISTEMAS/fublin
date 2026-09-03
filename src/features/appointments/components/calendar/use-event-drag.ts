"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { setDragging } from "@/components/ui/dragging";
import { dayKey, type DayKey } from "@/lib/dates";
import { gridDate, minutesFromGridStart, PX_PER_MINUTE, snapMinutes, GRID_HEIGHT_PX, type Positioned, type Timed } from "./layout";

/** Menos que isso é clique, não arrasto. */
const DRAG_THRESHOLD_PX = 5;
/** No toque, segurar este tempo parado começa o arrasto (antes disso o dedo rola a tela). */
const LONG_PRESS_MS = 350;
/** Mexer o dedo antes da pressão longa cancela: era rolagem, não arrasto. */
const TOUCH_SLOP_PX = 8;

/** Bloco no ar: onde ele cairia se o gesto terminasse agora. */
export type Drag = {
  id: string;
  durationMinutes: number;
  /** Onde o dedo/mouse pegou o bloco, em minutos a partir do topo do bloco. */
  grabMinutes: number;
  startX: number;
  startY: number;
  moved: boolean;
  /** Posição-alvo enquanto arrasta. */
  dayIndex: number;
  minutes: number;
  columns: { left: number; right: number; top: number }[];
  /** Pixels da tela por pixel do layout (a interface pode estar em 85%). */
  scale: number;
};

type TouchPending = { timer: number; x: number; y: number; el: HTMLElement; onTouchMove: (ev: TouchEvent) => void; activated: boolean };

/** O que vai direto no bloco: `{...dragHandlers(p, grupo)}`. */
export type EventDragHandlers = {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
};

type Options<T extends Timed & { id: string }, G> = {
  days: DayKey[];
  /** Raiz onde ficam as colunas `[data-day="…"] [data-grid]` que serão medidas. */
  scroller: RefObject<HTMLElement | null>;
  /** Clique ou toque curto: abrir o bloco (ou a pilha em que ele está). */
  onOpen: (p: Positioned<T>, group: G) => void;
  /** Arrasto solto num horário diferente do original. */
  onDrop: (p: Positioned<T>, when: Date) => void;
};

/**
 * Toda a mecânica de arrastar um bloco na grade da agenda: mouse arrasta direto; no toque,
 * pressão longa de 350 ms ativa o arrasto e o `touchmove` não-passivo trava a rolagem enquanto
 * o dedo carrega o bloco. Encaixa de 15 em 15 minutos e avisa quem chamou via `onOpen`/`onDrop`
 * — a grade não precisa saber de ponteiros, e o arrasto não precisa saber de agendamentos.
 */
export function useEventDrag<T extends Timed & { id: string }, G>({ days, scroller, onOpen, onDrop }: Options<T, G>) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const touchRef = useRef<TouchPending | null>(null);

  // Sair da página no meio do gesto não pode deixar a bandeira de arrasto presa no <body>.
  useEffect(() => () => setDragging(false), []);

  /** Mede as colunas e arma o arrasto (na hora, no mouse; depois da pressão longa, no toque). */
  function armDrag(el: HTMLElement, p: Positioned<T>, clientX: number, clientY: number) {
    const root = scroller.current;
    if (!root) return;
    const columns = days.map((day) => {
      const rect = root.querySelector<HTMLElement>(`[data-day="${day}"] [data-grid]`)!.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, height: rect.height };
    });
    const scale = columns[0] ? columns[0].height / GRID_HEIGHT_PX : 1;
    const blockTop = el.getBoundingClientRect().top;
    dragRef.current = {
      id: p.item.id,
      durationMinutes: p.item.durationMinutes,
      grabMinutes: (clientY - blockTop) / scale / PX_PER_MINUTE,
      startX: clientX,
      startY: clientY,
      moved: false,
      dayIndex: days.indexOf(dayKey(p.item.start)),
      minutes: minutesFromGridStart(p.item.start),
      columns,
      scale,
    };
    setDragging(true);
  }

  function clearTouch() {
    const t = touchRef.current;
    if (!t) return;
    window.clearTimeout(t.timer);
    t.el.removeEventListener("touchmove", t.onTouchMove);
    touchRef.current = null;
  }

  function release() {
    clearTouch();
    dragRef.current = null;
    setDrag(null);
    setDragging(false);
  }

  function beginDrag(e: ReactPointerEvent<HTMLElement>, p: Positioned<T>) {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* eventos sintéticos (testes/automação) não têm ponteiro ativo para capturar */
    }
    if (e.pointerType === "mouse") {
      armDrag(el, p, e.clientX, e.clientY);
      return;
    }
    // Toque: só vira arrasto se o dedo ficar parado; mexer antes disso é rolagem normal.
    clearTouch();
    const pending: TouchPending = {
      x: e.clientX,
      y: e.clientY,
      el,
      activated: false,
      timer: window.setTimeout(() => {
        pending.activated = true;
        armDrag(el, p, pending.x, pending.y);
        if (dragRef.current) dragRef.current.moved = true;
        setDrag(dragRef.current);
        navigator.vibrate?.(30);
      }, LONG_PRESS_MS),
      onTouchMove: (ev: TouchEvent) => {
        if (pending.activated) {
          ev.preventDefault(); // o navegador não pode rolar enquanto o bloco anda com o dedo
          return;
        }
        const t = ev.touches[0];
        if (t && Math.hypot(t.clientX - pending.x, t.clientY - pending.y) > TOUCH_SLOP_PX) clearTouch();
      },
    };
    el.addEventListener("touchmove", pending.onTouchMove, { passive: false });
    touchRef.current = pending;
  }

  function moveDrag(e: ReactPointerEvent<HTMLElement>) {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD_PX) return;
    let dayIndex = d.columns.findIndex((c) => e.clientX >= c.left && e.clientX <= c.right);
    if (dayIndex === -1) dayIndex = e.clientX < d.columns[0].left ? 0 : d.columns.length - 1;
    const minutes = snapMinutes((e.clientY - d.columns[dayIndex].top) / d.scale / PX_PER_MINUTE - d.grabMinutes, d.durationMinutes);
    const next = { ...d, moved: true, dayIndex, minutes };
    dragRef.current = next;
    setDrag(next);
  }

  function endDrag(p: Positioned<T>, group: G) {
    const touch = touchRef.current;
    // Toque curto (a pressão longa nem chegou a virar arrasto) conta como clique.
    const wasTouchPending = Boolean(touch && !touch.activated);
    const d = dragRef.current;
    release();
    if (wasTouchPending || !d || !d.moved) {
      onOpen(p, group);
      return;
    }
    const when = gridDate(days[d.dayIndex], d.minutes);
    if (when.getTime() === p.item.start.getTime()) return;
    onDrop(p, when);
  }

  function dragHandlers(p: Positioned<T>, group: G): EventDragHandlers {
    return {
      onPointerDown: (e) => beginDrag(e, p),
      onPointerMove: moveDrag,
      onPointerUp: () => endDrag(p, group),
      onPointerCancel: release,
    };
  }

  return { drag, dragHandlers };
}
