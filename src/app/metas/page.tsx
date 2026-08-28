import Link from "next/link";
import { Suspense } from "react";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, Section } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { formatPercent } from "@/features/goals/commission";
import { GoalHeroCard, GoalRow } from "@/features/goals/components/goal-card";
import { GoalForm } from "@/features/goals/components/goal-form";
import { PeriodNav } from "@/features/goals/components/period-nav";
import { getPeriodProgress, getProductionProgress, listPeriodHistory } from "@/features/goals/queries";
import { getSettings } from "@/features/settings/service";
import { formatDate, fromIso } from "@/lib/dates";
import { formatBRL, formatBRLCompact } from "@/lib/money";
import { isValidPeriodKey, periodDatesLabel, periodFor, periodTitle, productionLabel, shiftPeriod } from "@/lib/quinzena";
import { pickParam } from "@/lib/search-params";
import { plural } from "@/lib/text";

export const dynamic = "force-dynamic";

export const metadata = { title: "Metas" };

export default async function GoalsPage(props: PageProps<"/metas">) {
  const params = await props.searchParams;
  const db = await getDb();
  const now = new Date();
  const settings = await getSettings(db);
  const cuts = settings.period;
  const defaultTarget = settings.goals.defaultTargetCents;
  const currentKey = periodFor(now, cuts).key;
  const requested = pickParam(params, "q");
  const key = isValidPeriodKey(requested) ? requested : currentKey;

  const [progress, production, history] = await Promise.all([
    getPeriodProgress(db, key, cuts, now, defaultTarget),
    getProductionProgress(db, key, cuts, now, defaultTarget),
    listPeriodHistory(db, cuts, now, defaultTarget, 6),
  ]);
  const label = `${periodTitle(progress.period)} · ${periodDatesLabel(progress.period)}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Metas"
        description="Sua produção por quinzena: quanto já entrou, quanto falta e em que ritmo."
        actions={
          <Suspense>
            <PeriodNav label={label} previousKey={shiftPeriod(key, -1, cuts).key} nextKey={shiftPeriod(key, 1, cuts).key} isCurrent={key === currentKey} />
          </Suspense>
        }
      />

      <GoalHeroCard progress={progress} ratePercent={settings.commission.ratePercent}>
        <GoalForm periodKey={key} targetCents={progress.targetCents} isDefault={progress.isDefaultTarget} />
      </GoalHeroCard>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Section title="Cartas fechadas nesta quinzena" count={progress.deals.length}>
            {progress.deals.length === 0 ? (
              <Card className="px-5 py-6 text-[14px] text-muted">Nenhuma carta fechada ainda. Quando você mover um cliente para “Fechou”, ela entra aqui e na barra da meta.</Card>
            ) : (
              <Card>
                <ul className="divide-y divide-line">
                  {progress.deals.map((d) => (
                    <li key={d.id}>
                      <Link href={`/clientes/${d.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2">
                        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{d.name}</span>
                        <span className="text-[13px] tabular-nums text-muted">{d.closedAt ? formatDate(fromIso(d.closedAt)) : "—"}</span>
                        <span className="w-32 text-right text-[14px] font-medium tabular-nums text-ink">{formatBRL(d.creditCents)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </Section>

          <Section title="Quinzenas anteriores">
            {history.every((h) => h.achievedCents === 0 && h.targetCents === null) ? (
              <Card className="px-5 py-6 text-[14px] text-muted">O histórico aparece aqui conforme as quinzenas fecham.</Card>
            ) : (
              <Card>
                <ul className="divide-y divide-line">
                  {history.map((h) => (
                    <li key={h.period.key}>
                      <GoalRow progress={h} ratePercent={settings.commission.ratePercent} href={`/metas?q=${h.period.key}`} />
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </Section>
        </div>

        <aside className="space-y-5">
          <Section title={productionLabel(progress.period)}>
            <Card className="p-4">
              <p className="text-[13px] text-muted">As duas quinzenas somadas</p>
              <p className="mt-1 text-[28px] leading-none font-light tabular-nums tracking-tight text-ink">
                {formatBRLCompact(production.achievedCents)}
                {production.targetCents ? <span className="text-[15px] text-muted"> de {formatBRLCompact(production.targetCents)}</span> : null}
              </p>
              <ul className="mt-4 divide-y divide-line">
                {production.halves.map((h) => (
                  <li key={h.period.key} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                    <Link href={`/metas?q=${h.period.key}`} className={h.period.key === key ? "font-medium text-ink" : "text-ink-2 hover:text-ink"}>
                      {periodTitle(h.period)} <span className="text-muted">· {periodDatesLabel(h.period)}</span>
                    </Link>
                    <span className="tabular-nums text-ink">
                      {formatBRLCompact(h.achievedCents)} <span className="text-muted">· {plural(h.closedCount, "carta")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </Section>
          <Card className="p-4 text-[13px] text-muted">
            <p>
              A meta conta o <span className="font-medium text-ink">valor da carta</span> dos clientes que chegaram a “Fechou” dentro da quinzena (pela data de fechamento). A comissão é{" "}
              <span className="font-medium text-ink">{formatPercent(settings.commission.ratePercent)}</span> desse total.
            </p>
            <Link href="/config#quinzenas" className="mt-3 inline-flex items-center gap-1.5 font-medium text-accent hover:underline">
              <Settings className="size-4" aria-hidden />
              Dias de corte e meta padrão
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
