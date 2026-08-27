import type { DayPoint } from "@/features/clients/queries";

type Props = { points: DayPoint[]; todayIndex?: number };

const W = 600;
const H = 240;
const PAD = { top: 28, right: 12, bottom: 30, left: 30 };

/**
 * Curva suave (Catmull-Rom convertida em Béziers cúbicas). Os pontos de controle
 * ficam presos ao intervalo vertical do gráfico para a área nunca "mergulhar" abaixo de zero.
 */
function smoothPath(xs: number[], ys: number[], minY: number, maxY: number): string {
  if (xs.length === 0) return "";
  if (xs.length === 1) return `M${xs[0]},${ys[0]}`;
  const clamp = (v: number) => Math.min(Math.max(v, minY), maxY);
  let d = `M${xs[0]},${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const p0x = xs[Math.max(i - 1, 0)];
    const p0y = ys[Math.max(i - 1, 0)];
    const p1x = xs[i];
    const p1y = ys[i];
    const p2x = xs[i + 1];
    const p2y = ys[i + 1];
    const p3x = xs[Math.min(i + 2, xs.length - 1)];
    const p3y = ys[Math.min(i + 2, xs.length - 1)];
    const c1x = p1x + (p2x - p0x) / 6;
    const c1y = clamp(p1y + (p2y - p0y) / 6);
    const c2x = p2x - (p3x - p1x) / 6;
    const c2y = clamp(p2y - (p3y - p1y) / 6);
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)}`;
  }
  return d;
}

/**
 * Gráfico de área com duas séries (novos clientes em azul, visitas em limão),
 * eixo Y discreto, marcador do dia atual e tooltip escura — em SVG puro.
 */
export function AreaChart({ points, todayIndex = points.length - 1 }: Props) {
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(4, ...points.map((p) => Math.max(p.newClients, p.visits)));
  const niceMax = Math.ceil(max / 2) * 2;
  const xs = points.map((_, i) => PAD.left + (points.length === 1 ? innerW / 2 : (i * innerW) / (points.length - 1)));
  const y = (v: number) => PAD.top + innerH - (v / niceMax) * innerH;
  const baseline = PAD.top + innerH;
  const line = (values: number[]) => smoothPath(xs, values.map(y), PAD.top, baseline);
  const area = (values: number[]) => `${line(values)} L${xs[xs.length - 1]},${baseline} L${xs[0]},${baseline} Z`;
  const ticks = [0, niceMax / 2, niceMax];
  const today = points[todayIndex];
  const tx = xs[todayIndex] ?? xs[xs.length - 1];
  const tooltipW = 118;
  const tooltipX = Math.min(Math.max(tx - tooltipW / 2, PAD.left), W - PAD.right - tooltipW);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Novos clientes e visitas nos últimos dias">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray={t === 0 ? undefined : "2 4"} />
          <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">
            {t}
          </text>
        </g>
      ))}
      {xs.map((x, i) => (
        <line key={i} x1={x} x2={x} y1={PAD.top} y2={baseline} stroke="var(--color-line)" strokeOpacity={0.6} />
      ))}
      <path d={area(points.map((p) => p.newClients))} fill="var(--color-accent)" fillOpacity={0.85} />
      <path d={area(points.map((p) => p.visits))} fill="var(--color-lime)" fillOpacity={0.9} />
      <path d={line(points.map((p) => p.newClients))} fill="none" stroke="var(--color-accent-strong)" strokeWidth={1.5} />
      {points.map((p, i) => (
        <text key={p.day} x={xs[i]} y={H - 8} textAnchor="middle" fontSize="11" fill={i === todayIndex ? "var(--color-ink)" : "var(--color-muted)"} fontWeight={i === todayIndex ? 500 : 400}>
          {p.label}
        </text>
      ))}
      {today ? (
        <g>
          <line x1={tx} x2={tx} y1={PAD.top - 6} y2={baseline} stroke="var(--color-ink)" strokeWidth={1.5} />
          <rect x={tooltipX} y={2} width={tooltipW} height={44} rx={10} fill="var(--color-dark)" />
          <circle cx={tooltipX + 12} cy={17} r={3} fill="var(--color-accent)" />
          <text x={tooltipX + 20} y={21} fontSize="11" fill="#fff">
            Novos · {today.newClients}
          </text>
          <circle cx={tooltipX + 12} cy={35} r={3} fill="var(--color-lime)" />
          <text x={tooltipX + 20} y={39} fontSize="11" fill="#fff">
            Visitas · {today.visits}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
