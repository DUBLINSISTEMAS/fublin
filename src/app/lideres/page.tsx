import Link from "next/link";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getDb } from "@/db/client";
import { getLeaderStats } from "@/features/clients/queries";
import { LeaderForm } from "@/features/leaders/components/leader-form";
import { LeaderRow } from "@/features/leaders/components/leader-row";
import { listLeaders } from "@/features/leaders/service";
import { cn } from "@/lib/cn";
import { formatBRLCompact } from "@/lib/money";
import { initials } from "@/lib/text";

export const dynamic = "force-dynamic";

export const metadata = { title: "Líderes de vendas" };

export default async function LeadersPage() {
  const db = await getDb();
  const [leaders, stats] = await Promise.all([listLeaders(db, { includeInactive: true }), getLeaderStats(db)]);
  const countByLeader = new Map(stats.map((s) => [s.leader.id, s.total]));
  const active = leaders.filter((l) => l.active);
  const inactive = leaders.filter((l) => !l.active);
  const ranked = stats.filter((s) => s.leader.active).sort((a, b) => b.closed - a.closed || b.approved - a.approved || b.total - a.total);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Líderes de vendas" description="Quem atende na loja. Você passa o cliente para um líder e acompanha o resultado aqui." />
      <div className="space-y-6">
        <Card className="p-4 sm:p-5">
          <LeaderForm />
        </Card>

        {ranked.length > 0 ? (
          <Section title="Desempenho">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[14px]">
                  <thead className="bg-surface-2 text-left text-[12px] font-medium uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Líder</th>
                      <th className="px-3 py-3 text-right">Clientes</th>
                      <th className="px-3 py-3 text-right">Atendidos</th>
                      <th className="px-3 py-3 text-right">Aprovados</th>
                      <th className="px-3 py-3 text-right">Fechados</th>
                      <th className="px-3 py-3 text-right">Conversão</th>
                      <th className="px-4 py-3 text-right">Adesão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {ranked.map((s) => (
                      <tr key={s.leader.id} className="transition-colors hover:bg-surface-2/60">
                        <td className="px-4 py-3">
                          <Link href={`/clientes?lider=${s.leader.id}`} className="flex items-center gap-3 hover:underline">
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-ink">{initials(s.leader.name)}</span>
                            <span className="font-medium text-ink">{s.leader.name}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-ink-2">{s.total}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-ink-2">{s.attended}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-ink-2">{s.approved}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium text-ink">{s.closed}</td>
                        <td className="px-3 py-3 text-right">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                              <span className={cn("block h-full rounded-full", s.conversion >= 30 ? "bg-lime" : "bg-accent")} style={{ width: `${Math.min(s.conversion, 100)}%` }} />
                            </span>
                            <span className="w-9 text-right tabular-nums text-ink-2">{s.conversion}%</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">{formatBRLCompact(s.adesaoCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Section>
        ) : null}

        <Section title="Ativos" count={active.length}>
          {active.length === 0 ? (
            <EmptyState icon={Briefcase} title="Nenhum líder cadastrado" description="Adicione os líderes de vendas da loja para vincular aos clientes." />
          ) : (
            <Card>
              <ul className="divide-y divide-line">
                {active.map((l) => (
                  <LeaderRow key={l.id} leader={l} clientCount={countByLeader.get(l.id) ?? 0} />
                ))}
              </ul>
            </Card>
          )}
        </Section>

        {inactive.length > 0 ? (
          <Section title="Inativos" count={inactive.length}>
            <Card>
              <ul className="divide-y divide-line">
                {inactive.map((l) => (
                  <LeaderRow key={l.id} leader={l} clientCount={countByLeader.get(l.id) ?? 0} />
                ))}
              </ul>
            </Card>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
