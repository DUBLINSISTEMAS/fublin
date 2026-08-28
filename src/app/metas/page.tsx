import Link from "next/link";
import { Suspense } from "react";
import { CalendarCheck, Download, Settings, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BarChart } from "@/components/charts/bar-chart";
import { ButtonLink } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { commissionCents, formatPercent } from "@/features/goals/commission";
import { GoalHeroCard, GoalRow } from "@/features/goals/components/goal-card";
import { GoalForm } from "@/features/goals/components/goal-form";
import { PeriodNav } from "@/features/goals/components/period-nav";
import { ShareActions, type ShareCardData } from "@/features/goals/components/share-card";
import { motivationFor } from "@/features/goals/motivation";
import { buildPayoutRows } from "@/features/goals/payouts";
import { getPeriodProgress, getProductionProgress, getWeeklyAppointments, listPeriodHistory, type PeriodProgress } from "@/features/goals/queries";
import { appointmentsTrend } from "@/features/goals/trend";
import { getSettings } from "@/features/settings/service";
import { cn } from "@/lib/cn";
import { formatDate, fromIso } from "@/lib/dates";
import { formatBRL, formatBRLCompact } from "@/lib/money";
import { isValidPeriodKey, periodDatesLabel, periodFor, periodShortLabel, periodTitle, productionLabel, shiftPeriod } from "@/lib/quinzena";
import { pickParam } from "@/lib/search-params";
import { plural } from "@/lib/text";

export const dynamic = "force-dynamic";

export const metadata = { title: "Metas" };

const WEEKS_IN_CHART = 8;
const PAYOUT_ROWS = 6;

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;
const TREND_TONE = { up: "bg-lime text-lime-ink", down: "bg-rose text-rose-ink", flat: "bg-surface-2 text-ink-2" } as const;

function shareData(name: string, progress: PeriodProgress, ratePercent: number): ShareCardData {
  const m = motivationFor(progress);
  const footer = progress.clock.isPast ? "Quinzena encerrada" : progress.clock.isCurrent ? `${plural(progress.clock.daysLeft, "dia")} restantes` : "Quinzena ainda não começou";
  return {
    title: `${name} · ${periodTitle(progress.period)} · ${periodDatesLabel(progress.period)}`,
    achievedCents: progress.achievedCents,
    targetCents: progress.targetCents,
    percent: progress.percent,
    closedCount: progress.closedCount,
    commissionCents: commissionCents(progress.achievedCents, ratePercent),
    headline: m.headline,
    footer,
  };
}

export default async function GoalsPage(props: PageProps<"/metas">) {
  const params = await props.searchParams;
  const db = await getDb();
  const now = new Date();
  const settings = await getSettings(db);
  const cuts = settings.period;
  const defaults = settings.goals;
  const rate = settings.commission.ratePercent;
  const currentKey = periodFor(now, cuts).key;
  const requested = pickParam(params, "q");
  const key = isValidPeriodKey(requested) ? requested : currentKey;

  const [progress, production, history, weeks] = await Promise.all([
    getPeriodProgress(db, key, cuts, now, defaults),
    getProductionProgress(db, key, cuts, now, defaults),
    listPeriodHistory(db, cuts, now, defaults, PAYOUT_ROWS),
    getWeeklyAppointments(db, now, WEEKS_IN_CHART),
  ]);
  const current = key === currentKey ? progress : await getPeriodProgress(db, currentKey, cuts, now, defaults);
  const label = `${periodTitle(progress.period)} · ${periodDatesLabel(progress.period)}`;
  const trend = appointmentsTrend(weeks);
  const TrendIcon = TREND_ICON[trend.direction];
  const thisWeek = weeks[weeks.length - 1];
  const weeklyGoal = defaults.appointmentsPerWeek;
  const payouts = buildPayoutRows([current, ...history], rate, now);
  const earnings = [...history].reverse().concat(current);

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

      <div className="space-y-3">
        <GoalHeroCard progress={progress} ratePercent={rate}>
          <GoalForm periodKey={key} targetCents={progress.targetCents} isDefault={progress.isDefaultTarget} />
        </GoalHeroCard>
        <ShareActions data={shareData(settings.profile.name, progress, rate)} filename={`meta-${key}.png`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Section title="Agendamentos por semana" className="scroll-mt-4" action={<span id="agendamentos" />}>
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] text-muted">Esta semana</p>
                  <p className="mt-0.5 text-[28px] leading-none font-light tabular-nums tracking-tight text-ink">
                    {thisWeek?.created ?? 0}
                    {weeklyGoal ? <span className="text-[15px] text-muted"> de {weeklyGoal}</span> : null}
                  </p>
                </div>
                <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium", TREND_TONE[trend.direction])}>
                  <TrendIcon className="size-4" aria-hidden />
                  {trend.headline}
                </div>
              </div>
              <p className="mt-2 text-[13px] text-muted">{trend.detail}</p>
              <BarChart
                className="mt-5"
                points={weeks.map((w, i) => ({ key: w.weekStart, label: w.label, value: w.created, secondary: w.done, current: i === weeks.length - 1 }))}
                goal={weeklyGoal}
                ariaLabel={`Agendamentos criados por semana nas últimas ${WEEKS_IN_CHART} semanas`}
                legend={{ primary: "Agendamentos marcados", secondary: "Visitas realizadas", goal: "Meta semanal" }}
              />
              {!weeklyGoal ? (
                <p className="mt-3 text-[13px] text-muted">
                  <Link href="/config#quinzenas" className="font-medium text-accent hover:underline">
                    Defina uma meta de agendamentos por semana
                  </Link>{" "}
                  para ver a linha da meta aqui e o progresso no menu.
                </p>
              ) : null}
            </Card>
          </Section>

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

          <Section
            title="Recebimentos"
            className="scroll-mt-4"
            action={
              <ButtonLink href="/api/export/recebimentos" variant="secondary" size="sm" id="recebimentos">
                <Download className="size-4" aria-hidden />
                Exportar Excel
              </ButtonLink>
            }
          >
            <Card className="p-4 sm:p-5">
              <p className="text-[13px] text-muted">Comissão de {formatPercent(rate)} sobre as cartas fechadas em cada quinzena.</p>
              <BarChart
                className="mt-4"
                points={earnings.map((p) => ({ key: p.period.key, label: periodShortLabel(p.period), value: commissionCents(p.achievedCents, rate), current: p.period.key === currentKey }))}
                formatValue={formatBRLCompact}
                ariaLabel="Comissão por quinzena"
              />
              <ul className="mt-4 divide-y divide-line">
                {payouts.map((row) => (
                  <li key={row.periodKey} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                    <Link href={`/metas?q=${row.periodKey}`} className={cn("min-w-0 truncate", row.periodKey === key ? "font-medium text-ink" : "text-ink-2 hover:text-ink")}>
                      {row.title} <span className="text-muted">· {formatDate(fromIso(row.start))} a {formatDate(fromIso(row.end))}</span>
                    </Link>
                    <span className="shrink-0 text-right tabular-nums">
                      <span className="font-medium text-ink">{formatBRL(row.commissionCents)}</span>
                      <span className="ml-2 text-[12px] text-muted">{row.status === "Em andamento" ? "em andamento" : row.status === "Fechada" ? plural(row.closedCount, "carta") : "futura"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </Section>

          <Section title="Quinzenas anteriores">
            {history.every((h) => h.achievedCents === 0 && h.targetCents === null) ? (
              <Card className="px-5 py-6 text-[14px] text-muted">O histórico aparece aqui conforme as quinzenas fecham.</Card>
            ) : (
              <Card>
                <ul className="divide-y divide-line">
                  {history.map((h) => (
                    <li key={h.period.key}>
                      <GoalRow progress={h} ratePercent={rate} href={`/metas?q=${h.period.key}`} />
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
                  <li key={h.period.key} className="py-3">
                    <div className="flex items-center justify-between gap-3 text-[13px]">
                      <Link href={`/metas?q=${h.period.key}`} className={h.period.key === key ? "font-medium text-ink" : "text-ink-2 hover:text-ink"}>
                        {periodTitle(h.period)} <span className="text-muted">· {periodDatesLabel(h.period)}</span>
                      </Link>
                      <span className="tabular-nums text-ink">
                        {formatBRLCompact(h.achievedCents)} <span className="text-muted">· {plural(h.closedCount, "carta")}</span>
                      </span>
                    </div>
                    <div className="mt-2">
                      <GoalForm periodKey={h.period.key} targetCents={h.targetCents} isDefault={h.isDefaultTarget} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </Section>
          <Card className="p-4 text-[13px] text-muted">
            <p className="flex items-start gap-2">
              <CalendarCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                A meta conta o <span className="font-medium text-ink">valor da carta</span> dos clientes que chegaram a “Fechou” dentro da quinzena (pela data de fechamento). A comissão é{" "}
                <span className="font-medium text-ink">{formatPercent(rate)}</span> desse total.
              </span>
            </p>
            <Link href="/config#quinzenas" className="mt-3 inline-flex items-center gap-1.5 font-medium text-accent hover:underline">
              <Settings className="size-4" aria-hidden />
              Dias de corte e metas padrão
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
