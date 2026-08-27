"use client";

import { useState, useTransition } from "react";
import {
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
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CircleAlert } from "lucide-react";
import { CountBadge } from "@/components/ui/badge";
import type { Leader } from "@/db/schema";
import { cn } from "@/lib/cn";
import { dayKey, fromIso } from "@/lib/dates";
import { CLIENT_STATUS_HINTS, CLIENT_STATUS_LABELS, PIPELINE_STATUSES, type ClientStatus } from "@/lib/domain";
import { moveClientAction } from "../actions";
import type { ClientListItem } from "../queries";
import { ClientCard } from "./client-card";

const COLUMNS: ClientStatus[] = [...PIPELINE_STATUSES, "perdido"];

type Props = { items: ClientListItem[]; leaders: Pick<Leader, "id" | "name">[]; now: Date };

/**
 * Kanban do funil. Arraste o card para outra coluna (mouse, toque com pressão longa
 * ou teclado); a mudança é otimista e desfeita se o servidor recusar.
 */
export function Pipeline({ items, leaders, now }: Props) {
  const [clients, setClients] = useState(items);
  const [seenItems, setSeenItems] = useState(items);
  if (items !== seenItems) {
    // Dados novos do servidor substituem o estado otimista (padrão "derivar durante o render").
    setSeenItems(items);
    setClients(items);
  }
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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
    setClients((list) => list.map((c) => (c.id === id ? { ...c, status } : c)));
    startTransition(async () => {
      const result = await moveClientAction(id, status);
      if (!result.ok) {
        setClients((list) => list.map((c) => (c.id === id ? { ...c, status: previous } : c)));
        setError(result.error);
      }
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
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 no-scrollbar scroll-pl-4 sm:-mx-5 sm:px-5 sm:scroll-pl-5 md:mx-0 md:snap-none md:px-0 md:scroll-pl-0">
        {COLUMNS.map((status) => (
          <Column key={status} status={status} count={clients.filter((c) => c.status === status).length} dragging={Boolean(activeId)}>
            {clients
              .filter((c) => c.status === status)
              .map((c) => (
                <DraggableCard key={c.id} client={c} now={now} leaders={leaders} highlight={soon.has(c.id)} onMoved={(s) => applyMove(c.id, s)} />
              ))}
          </Column>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>{active ? <ClientCard client={active} now={now} leaders={leaders} highlight={soon.has(active.id)} dragging /> : null}</DragOverlay>
    </DndContext>
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
        "flex w-[82vw] shrink-0 snap-start flex-col rounded-[28px] p-1.5 transition-colors sm:w-[60vw] md:w-[272px]",
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

function DraggableCard(props: { client: ClientListItem; now: Date; leaders: Pick<Leader, "id" | "name">[]; highlight: boolean; onMoved: (s: ClientStatus) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: props.client.id, data: { status: props.client.status } });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn("touch-pan-x cursor-grab select-none active:cursor-grabbing", isDragging && "opacity-30")}
      {...listeners}
      {...attributes}
    >
      <ClientCard client={props.client} now={props.now} leaders={props.leaders} highlight={props.highlight} onMoved={props.onMoved} />
    </div>
  );
}
