import Link from "next/link";
import { Suspense } from "react";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Card, Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PeriodPicker } from "@/components/ui/period-picker";
import { getDb } from "@/db/client";
import { getLeaderStats } from "@/features/clients/queries";
import { LeaderForm } from "@/features/leaders/components/leader-form";
import { LeaderRow } from "@/features/leaders/components/leader-row";
import { listLeaders } from "@/features/leaders/service";
import { getSettings } from "@/features/settings/service";
import { cn } from "@/lib/cn";
import { formatBRLCompact } from "@/lib/money";
import { resolvePeriodFilter } from "@/lib/period-filter";
import type { SearchParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export const metadata = { title: "Líderes de vendas" };

export default async function LeadersPage(props: PageProps<"/lideres">) {
  const params = (await props.searchParams) as SearchParams;
  const db = await getDb();
  const now = new Date();
  const settings = await getSettings(db);
  const period = resolvePeriodFilter(params, settings.period, now);
  const [leaders, stats, allTime] = await Promise.all([
    listLeaders(db, { includeInactive: true }),
    getLeaderStats(db, period.range),
    period.range ? getLeaderStats(db) : undefined,
  ]);
  const countByLeader = new Map((allTime ?? stats).map((s) => [s.leader.id, s.total]));
  const active = leaders.filter((l) => l.active);
  const inactive = leaders.filter((l) => !l.active);
  const ranked = stats.filter((s) => s.leader.active).sort((a, b) => b.creditCents - a.creditCents || b.closed - a.closed || b.approved - a.approved || b.total - a.total);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Líderes de vendas" description="Quem atende na loja. Você passa o cliente para um líder e acompanha o resultado aqui." />
      <div className="space-y-6">
        <Card className="p-4 sm:p-5">
          <LeaderForm />
        </Card>

        <Section
          title="Desempenho"
          action={
            <Suspense>
              <PeriodPicker mode={period.mode} label={period.label} previousKey={period.previousKey} nextKey={period.nextKey} isCurrent={period.isCurrent} />
            </Suspense>
          }
        >
          {ranked.length === 0 ? (
            <Card className="px-5 py-6 text-[14px] text-muted">Cadastre líderes para ver o desempenho de cada um.</Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-[14px]">
                  <thead className="bg-surface-2 text-left text-[12px] font-medium uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Líder</th>
                      <th className="px-3 py-3 text-right">Clientes</th>
                      <th className="px-3 py-3 text-right">Atendidos</th>
                      <th className="px-3 py-3 text-right">Aprovados</th>
                      <th className="px-3 py-3 text-right">Fechados</th>
                      <th className="px-3 py-3 text-right">Conversão</th>
                      <th className="px-3 py-3 text-right">Cartas</th>
                      <th className="px-4 py-3 text-right">Adesão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {ranked.map((s) => (
                      <tr key={s.leader.id} className="transition-colors hover:bg-surface-2/60">
                        <td className="px-4 py-3">
                          <Link href={`/clientes?lider=${s.leader.id}`} className="flex items-center gap-3 hover:underline">
                            <Avatar name={s.leader.name} photoKey={s.leader.photoKey} size={32} />
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
                        <td className="px-3 py-3 text-right tabular-nums font-medium text-ink">{formatBRLCompact(s.creditCents)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-2">{formatBRLCompact(s.adesaoCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </Section>

        <Section title="Ativos" count={active.length}>
          {active.length === 0 ? (
            <EmptyState icon={Briefcase} title="Nenhum líder cadastrado" description="Adicione os líderes de vendas da loja para vincular aos clientes. Clique na câmera para colocar a foto de cada um." />
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
