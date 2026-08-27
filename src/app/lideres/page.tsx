import { count, eq } from "drizzle-orm";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getDb } from "@/db/client";
import { clients } from "@/db/schema";
import { LeaderForm } from "@/features/leaders/components/leader-form";
import { LeaderRow } from "@/features/leaders/components/leader-row";
import { listLeaders } from "@/features/leaders/service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Líderes de vendas" };

export default async function LeadersPage() {
  const db = await getDb();
  const [leaders, counts] = await Promise.all([
    listLeaders(db, { includeInactive: true }),
    db.select({ leaderId: clients.leaderId, total: count() }).from(clients).groupBy(clients.leaderId),
  ]);
  const countByLeader = new Map(counts.map((c) => [c.leaderId, c.total]));
  const active = leaders.filter((l) => l.active);
  const inactive = leaders.filter((l) => !l.active);
  void eq;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Líderes de vendas" description="Quem fecha a venda na loja. Você indica o líder em cada cliente." />
      <div className="space-y-8">
        <Card className="p-4 sm:p-5">
          <LeaderForm />
        </Card>

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
