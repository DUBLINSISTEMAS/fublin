import Link from "next/link";
import { cn } from "@/lib/cn";
import { CLIENT_STATUS_LABELS, PIPELINE_STATUSES, type ClientStatus } from "@/lib/domain";

const SEGMENT: Record<ClientStatus, string> = {
  novo: "bg-surface-3",
  agendado: "bg-sky",
  atendido: "bg-accent-tint",
  negociando: "bg-sun",
  analise: "bg-lime-soft",
  aprovado: "bg-lime",
  fechou: "bg-accent",
  perdido: "bg-rose",
};

/** Faixa do funil: um segmento por etapa, proporcional à quantidade de clientes. */
export function FunnelStrip({ counts }: { counts: Record<ClientStatus, number> }) {
  const stages: ClientStatus[] = [...PIPELINE_STATUSES, "perdido"];
  const total = stages.reduce((sum, s) => sum + counts[s], 0);
  if (total === 0) return <p className="text-[13px] text-muted">Cadastre clientes para ver o funil.</p>;
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-3" role="img" aria-label="Distribuição dos clientes por etapa">
        {stages.map((s) =>
          counts[s] > 0 ? <span key={s} className={cn("h-full", SEGMENT[s])} style={{ width: `${(counts[s] / total) * 100}%` }} title={`${CLIENT_STATUS_LABELS[s]}: ${counts[s]}`} /> : null,
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-2">
        {stages.map((s) => (
          <li key={s}>
            <Link href={`/clientes?status=${s}`} className="inline-flex items-center gap-1.5 hover:text-ink">
              <span className={cn("size-2.5 rounded-full", SEGMENT[s])} aria-hidden />
              {CLIENT_STATUS_LABELS[s]}
              <span className="font-medium tabular-nums text-ink">{counts[s]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
