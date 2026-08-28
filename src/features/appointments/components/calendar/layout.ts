/** A grade cobre o horário comercial com folga: 07:00 às 20:00, 64px por hora. */
export const HOUR_START = 7;
export const HOUR_END = 20;
export const HOUR_HEIGHT_PX = 64;
export const PX_PER_MINUTE = HOUR_HEIGHT_PX / 60;
export const GRID_MINUTES = (HOUR_END - HOUR_START) * 60;
export const GRID_HEIGHT_PX = GRID_MINUTES * PX_PER_MINUTE;
/** Bloco mínimo para caber a hora e o nome. */
export const MIN_BLOCK_PX = 30;
/** Ao arrastar, o horário encaixa de 15 em 15 minutos. */
export const SNAP_MINUTES = 15;

export const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

/** Minutos desde o começo da grade, presos ao intervalo visível. */
export function minutesFromGridStart(date: Date): number {
  const minutes = (date.getHours() - HOUR_START) * 60 + date.getMinutes();
  return Math.min(Math.max(minutes, 0), GRID_MINUTES);
}

/** Minutos (desde o início da grade) → encaixados no passo e presos para o bloco caber. */
export function snapMinutes(minutes: number, durationMinutes: number): number {
  const snapped = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
  return Math.min(Math.max(snapped, 0), Math.max(0, GRID_MINUTES - durationMinutes));
}

export type Timed = { start: Date; durationMinutes: number };

export type Positioned<T extends Timed> = {
  item: T;
  /** px a partir do topo da grade. */
  top: number;
  height: number;
  /** Coluna dentro do grupo de sobreposição e quantas colunas o grupo tem. */
  lane: number;
  lanes: number;
  /** Grupo de sobreposição (eventos que se tocam no tempo) e seu tamanho. */
  group: number;
  groupSize: number;
};

/**
 * Posiciona blocos numa coluna de dia. Eventos que se sobrepõem formam um grupo:
 * cada um ganha uma "faixa" (para empilhar ou dividir a largura), do mais cedo para o mais tarde.
 */
export function layoutEvents<T extends Timed>(items: T[]): Positioned<T>[] {
  const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime() || b.durationMinutes - a.durationMinutes);
  const out: Positioned<T>[] = [];
  let groupIndex = 0;
  let cluster: { end: number; laneEnds: number[]; members: Positioned<T>[] } | null = null;

  const flush = () => {
    if (!cluster) return;
    for (const m of cluster.members) {
      m.lanes = cluster.laneEnds.length;
      m.groupSize = cluster.members.length;
    }
    out.push(...cluster.members);
    cluster = null;
    groupIndex += 1;
  };

  for (const item of sorted) {
    const startMin = minutesFromGridStart(item.start);
    const endMin = Math.min(startMin + Math.max(item.durationMinutes, 1), GRID_MINUTES);
    if (cluster && startMin >= cluster.end) flush();
    if (!cluster) cluster = { end: endMin, laneEnds: [], members: [] };
    let lane = cluster.laneEnds.findIndex((laneEnd) => laneEnd <= startMin);
    if (lane === -1) {
      lane = cluster.laneEnds.length;
      cluster.laneEnds.push(endMin);
    } else cluster.laneEnds[lane] = endMin;
    cluster.end = Math.max(cluster.end, endMin);
    cluster.members.push({ item, top: startMin * PX_PER_MINUTE, height: Math.max((endMin - startMin) * PX_PER_MINUTE, MIN_BLOCK_PX), lane, lanes: 1, group: groupIndex, groupSize: 1 });
  }
  flush();
  return out;
}
