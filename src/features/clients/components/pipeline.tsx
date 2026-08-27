"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, ChevronRight, CircleAlert } from "lucide-react";
import { CountBadge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useDragScroll } from "@/components/ui/use-drag-scroll";
import { useFlip } from "@/components/ui/use-flip";
import type { Leader } from "@/db/schema";
import { cn } from "@/lib/cn";
import { dayKey, fromIso } from "@/lib/dates";
import { CLIENT_STATUS_HINTS, CLIENT_STATUS_LABELS, PIPELINE_STATUSES, type ClientStatus } from "@/lib/domain";
import { moveClientAction } from "../actions";
import type { ClientListItem } from "../queries";
import { ClientCard } from "./client-card";

const COLUMNS: ClientStatus[] = [...PIPELINE_STATUSES, "perdido"];
/** Largura de uma coluna + o espaço entre elas, para as setas rolarem "uma coluna". */
const COLUMN_STEP_PX = 272 + 16;
const SETTLE_MS = 1400;

/** O card "pousa" na coluna nova: o fantasma desliza até o lugar final em vez de sumir. */
const DROP_ANIMATION: DropAnimation = {
  duration: 280,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0" } } }),
};

type Props = { items: ClientListItem[]; leaders: Pick<Leader, "id" | "name" | "photoKey">[]; now: Date };

/**
 * Kanban do funil. Arraste o card para outra coluna (mouse, toque com pressão longa
 * ou teclado) ou use o menu "…"; a mudança é otimista e desfeita se o servidor recusar.
 * No desktop, arrastar o fundo rola o quadro; as setas nas bordas fazem o mesmo.
 */
export function Pipeline({ items, leaders, now }: Props) {
  const [clients, setClients] = useState(items);
  const [seenItems, setSeenItems] = useState(items);
  /** Movimentos ainda em voo: o refresh de outra ação não pode "puxar de volta" estes cards. */
  const [pending, setPending] = useState<Map<string, ClientStatus>>(() => new Map());
  if (items !== seenItems) {
    // Dados novos do servidor substituem o estado otimista (padrão "derivar durante o render"),
    // exceto os cards cujo movimento ainda não foi confirmado.
    setSeenItems(items);
    setClients(items.map((c) => ({ ...c, status: pending.get(c.id) ?? c.status })));
  }
  const [activeId, setActiveId] = useState<string | null>(null);
  /** Card que acabou de chegar numa coluna: ganha um brilho por alguns segundos. */
  const [settledId, setSettledId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const board = useRef<HTMLDivElement>(null);
  const scroll = useDragScroll(board);
  useFlip(board);

  useEffect(() => {
    if (!settledId) return;
    const timer = window.setTimeout(() => setSettledId(null), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [settledId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const today = dayKey(now);
  const soon = new Set(clients.filter((c) => c.nextAppointment && dayKey(fromIso(c.nextAppointment.scheduledAt)) === today).map((c) => c.id));
  const active = activeId ? clients.find((c) => c.id === activeId) : undefined;

  function applyMove(id: string, status: ClientStatus) {
    const current = clients.find((c) => c.id === id);
    if (!current || current.status === status) return;
    const previous = current.status;
    setError(null);
    setPending((map) => new Map(map).set(id, status));
    setClients((list) => list.map((c) => (c.id === id ? { ...c, status } : c)));
    setSettledId(id);
    startTransition(async () => {
      const result = await moveClientAction(id, status);
      setPending((map) => {
        const next = new Map(map);
        next.delete(id);
        return next;
      });
      if (!result.ok) {
        setClients((list) => list.map((c) => (c.id === id ? { ...c, status: previous } : c)));
        setSettledId(null);
        setError(result.error);
        return;
      }
      toast.success(`${current.name} → ${CLIENT_STATUS_LABELS[status]}`);
    });
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const target = event.over?.id;
    if (!target || !(COLUMNS as string[]).includes(String(target))) return;
    applyMove(String(event.active.id), target as ClientStatus);
  }

  // `id` fixo: os ids de acessibilidade do dnd-kit ficam iguais no servidor e no cliente (sem hydration mismatch).
  return (
    <DndContext id="funil" sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      {error ? (
        <p role="alert" className="mb-3 flex items-center gap-2 rounded-card bg-rose px-4 py-3 text-[13px] text-rose-ink">
          <CircleAlert className="size-4" aria-hidden />
          {error}
        </p>
      ) : null}
      <p className="mb-2 text-[12px] text-muted md:hidden">Deslize para ver as etapas. Segure um card para arrastar.</p>
      <div className="relative">
        <div
          ref={board}
          {...scroll.handlers}
          className={cn(
            "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 no-scrollbar scroll-pl-4 sm:-mx-5 sm:px-5 sm:scroll-pl-5 md:mx-0 md:snap-none md:px-0 md:scroll-pl-0",
            "md:cursor-grab md:select-none",
            scroll.panning && "md:cursor-grabbing",
          )}
        >
          {COLUMNS.map((status) => (
            <Column key={status} status={status} count={clients.filter((c) => c.status === status).length} dragging={Boolean(activeId)}>
              {clients
                .filter((c) => c.status === status)
                .map((c) => (
                  <DraggableCard key={c.id} client={c} now={now} leaders={leaders} highlight={soon.has(c.id)} settled={settledId === c.id} onMove={(s) => applyMove(c.id, s)} />
                ))}
            </Column>
          ))}
        </div>
        <EdgeArrow side="left" visible={scroll.canScrollLeft} onClick={() => scroll.scrollBy(-COLUMN_STEP_PX)} />
        <EdgeArrow side="right" visible={scroll.canScrollRight} onClick={() => scroll.scrollBy(COLUMN_STEP_PX)} />
      </div>
      <DragOverlay dropAnimation={DROP_ANIMATION}>
        {active ? <ClientCard client={active} now={now} leaders={leaders} highlight={soon.has(active.id)} onMove={(s) => applyMove(active.id, s)} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

/** Seta redonda na borda do quadro (só desktop, só quando há mais colunas naquele lado). */
function EdgeArrow({ side, visible, onClick }: { side: "left" | "right"; visible: boolean; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Etapas anteriores" : "Próximas etapas"}
      onClick={onClick}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-dark text-white shadow-float transition-opacity duration-200 hover:bg-dark-2 md:grid",
        side === "left" ? "-left-3" : "-right-3",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}

function Column({ status, count, dragging, children }: { status: ClientStatus; count: number; dragging: boolean; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const lost = status === "perdido";
  return (
    <section
      ref={setNodeRef}
      aria-label={`Coluna ${CLIENT_STATUS_LABELS[status]}`}
      className={cn(
        "flex w-[82vw] shrink-0 snap-start flex-col rounded-[28px] p-1.5 transition-colors duration-200 sm:w-[60vw] md:w-[272px]",
        isOver ? (lost ? "bg-rose/60" : "bg-accent-soft/70") : dragging ? "bg-surface-3/60" : "",
      )}
    >
      <h2 className="flex items-center gap-2.5 px-2.5 pt-2 pb-3 text-[19px] font-normal text-ink" title={CLIENT_STATUS_HINTS[status]}>
        {CLIENT_STATUS_LABELS[status]}
        <CountBadge value={count} className={cn(lost && "bg-rose-ink")} />
      </h2>
      <div className="flex min-h-24 flex-1 flex-col gap-3">
        {count === 0 ? (
          <p className={cn("rounded-card border border-dashed px-4 py-6 text-center text-[13px]", isOver ? "border-accent text-accent-ink" : "border-line-strong text-muted")}>
            {isOver ? "Solte aqui" : lost ? "Arraste aqui quem desistiu." : "Ninguém aqui."}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

type DraggableCardProps = {
  client: ClientListItem;
  now: Date;
  leaders: Pick<Leader, "id" | "name" | "photoKey">[];
  highlight: boolean;
  settled: boolean;
  onMove: (s: ClientStatus) => void;
};

function DraggableCard({ client, now, leaders, highlight, settled, onMove }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: client.id, data: { status: client.status } });
  return (
    <div
      ref={setNodeRef}
      data-card
      data-no-pan
      data-flip-id={client.id}
      data-flip-skip={isDragging ? "" : undefined}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn("touch-pan-x cursor-grab select-none rounded-card active:cursor-grabbing", isDragging && "opacity-30", settled && "card-settle")}
      {...listeners}
      {...attributes}
    >
      <ClientCard client={client} now={now} leaders={leaders} highlight={highlight} onMove={onMove} />
    </div>
  );
}
