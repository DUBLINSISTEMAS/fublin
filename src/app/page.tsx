import Link from "next/link";
import { Suspense } from "react";
import { addHours, addMinutes, differenceInCalendarDays } from "date-fns";
import { CalendarPlus, ChevronRight, Hourglass, MessageCircle, Wallet } from "lucide-react";
import { AreaChart } from "@/components/charts/area-chart";
import { FunnelStrip } from "@/components/charts/funnel-strip";
import { ClientStatusBadge, CountBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { PeriodPicker } from "@/components/ui/period-picker";
import { StatCard } from "@/components/ui/stat-card";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/features/auth/session";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import type { AppointmentVariant } from "@/features/appointments/components/variant";
import { listAppointmentsForDay, listOverdueAppointments, type AppointmentWithClient } from "@/features/appointments/queries";
import { countClientsByStatus, getCommercialBreakdown, getDailySeries, getPeriodStats, listClientsNeedingAction, type ActionItem, type ConversionItem } from "@/features/clients/queries";
import { dealsCommissionCents } from "@/features/goals/commission";
import { GoalHeroCard, PayoutCard } from "@/features/goals/components/goal-card";
import { getCurrentPeriodProgress, getPeriodProgress } from "@/features/goals/queries";
import { DEFAULT_SETTINGS } from "@/features/settings/schema";
import { getSettings } from "@/features/settings/service";
import { dayBounds, dayKey, formatDayLong, fromIso, REMINDER_GRACE_MINUTES, shiftDayKey } from "@/lib/dates";
import { INTEREST_LABELS, SOURCE_LABELS } from "@/lib/domain";
import { formatBRLCompact } from "@/lib/money";
import { resolvePeriodFilter } from "@/lib/period-filter";
import { periodFor, shiftPeriod } from "@/lib/quinzena";
import type { SearchParams } from "@/lib/search-params";
import { capitalize, plural } from "@/lib/text";

export const dynamic = "force-dynamic";

const NOW_WINDOW_HOURS = 2;
/** A série diária de "Resultados" nunca passa disso (um mês cheio). */
const MAX_SERIES_DAYS = 31;

type Column = { title: string; items: AppointmentWithClient[]; variant: (a: AppointmentWithClient) => AppointmentVariant; empty: string };

function greeting(now: Date, name: string): string {
  const hour = now.getHours();
  const hello = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const first = name === DEFAULT_SETTINGS.profile.name ? "" : name.split(" ")[0];
  return first ? `${hello}, ${first}` : hello;
}

export default async function TodayPage(props: PageProps<"/">) {
  await requireAdmin();
  const params = (await props.searchParams) as SearchParams;
  const db = await getDb();
  const now = new Date();
  const today = dayKey(now);
  const settings = await getSettings(db);
  const period = resolvePeriodFilter(params, settings.period, now);
  const rate = settings.commission.ratePercent;
  const previousKey = shiftPeriod(periodFor(now, settings.period).key, -1, settings.period).key;

  // Série diária do período escolhido: do início até hoje (ou até o fim do período), no máximo um mês.
  const seriesFirstDay = period.range ? dayKey(period.range.start) : shiftDayKey(today, -29);
  const seriesLastDay = period.range && period.range.end <= now ? shiftDayKey(dayKey(period.range.end), -1) : today;
  const seriesDays = Math.min(MAX_SERIES_DAYS, Math.max(1, differenceInCalendarDays(dayBounds(seriesLastDay).start, dayBounds(seriesFirstDay).start) + 1));

  const [todayItems, tomorrowItems, overdue, stats, series, counts, goal, previousGoal, needs, breakdown] = await Promise.all([
    listAppointmentsForDay(db, today),
    listAppointmentsForDay(db, shiftDayKey(today, 1)),
    listOverdueAppointments(db, now),
    getPeriodStats(db, period.range?.start ?? new Date(0), period.range?.end),
    getDailySeries(db, seriesFirstDay, seriesDays),
    countClientsByStatus(db),
    getCurrentPeriodProgress(db, settings.period, now, settings.goals),
    getPeriodProgress(db, previousKey, settings.period, now, settings.goals),
    listClientsNeedingAction(db, now),
    getCommercialBreakdown(db, period.range?.start, period.range?.end),
  ]);

  const graceStart = addMinutes(now, -REMINDER_GRACE_MINUTES);
  const nowEnd = addHours(now, NOW_WINDOW_HOURS);
  const overdueIds = new Set(overdue.map((a) => a.id));
  const nowItems = todayItems.filter((a) => a.status === "agendado" && fromIso(a.scheduledAt) >= graceStart && fromIso(a.scheduledAt) <= nowEnd);
  const nowIds = new Set(nowItems.map((a) => a.id));
  const restToday = todayItems.filter((a) => !nowIds.has(a.id) && !overdueIds.has(a.id));
  const pendingTomorrow = tomorrowItems.filter((a) => a.status === "agendado");
  const todayPending = todayItems.filter((a) => a.status === "agendado").length;

  const columns: Column[] = [
    { title: "Agora", items: nowItems, variant: () => "now", empty: "Nada nas próximas 2 h." },
    { title: "Hoje", items: restToday, variant: (a) => (a.status === "agendado" ? "default" : "done"), empty: "Dia livre." },
    { title: "Atrasados", items: overdue, variant: () => "overdue", empty: "Tudo com baixa." },
    { title: "Amanhã", items: pendingTomorrow, variant: () => "default", empty: "Nada marcado ainda." },
  ];
  const actionTotal = needs.noNextStep.length + needs.stuckInAnalysis.length + needs.missingAdesao.length + overdue.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-muted">{capitalize(formatDayLong(now))}</p>
          <h1 className="text-[26px] font-medium tracking-tight text-ink md:text-[30px]">{greeting(now, settings.profile.name)}</h1>
          <p className="mt-1 text-[14px] text-muted">
            {todayPending ? `${plural(todayPending, "agendamento")} em aberto hoje` : "Nada em aberto hoje"}
            {actionTotal ? ` · ${plural(actionTotal, "cliente")} pedindo ação` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/clientes/novo" variant="secondary" className="max-md:hidden">
            Novo cliente
          </ButtonLink>
          <ButtonLink href="/agenda/novo" variant="dark" className="max-md:hidden">
            <CalendarPlus className="size-4" aria-hidden />
            Agendar
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <GoalHeroCard progress={goal} ratePercent={rate} />
        <PayoutCard current={goal} previous={previousGoal} ratePercent={rate} />
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 no-scrollbar scroll-pl-4 sm:-mx-5 sm:px-5 sm:scroll-pl-5 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:scroll-pl-0 xl:grid-cols-4">
        {columns.map((col) => (
          <section key={col.title} className="w-[82vw] shrink-0 snap-start space-y-3 sm:w-[60vw] md:w-auto">
            <h2 className="flex items-center gap-2.5 text-[19px] font-normal text-ink">
              {col.title}
              <CountBadge value={col.items.length} />
            </h2>
            {col.items.length === 0 ? (
              <p className="rounded-card border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-muted">{col.empty}</p>
            ) : (
              col.items.map((a) => <AppointmentCard key={a.id} appointment={a} now={now} variant={col.variant(a)} />)
            )}
          </section>
        ))}
      </div>

      <Section title="Precisa de ação" count={needs.noNextStep.length + needs.stuckInAnalysis.length + needs.missingAdesao.length}>
        <div className="grid gap-4 md:grid-cols-3">
          <ActionList title="Sem próximo passo" hint="Abertos sem nenhum agendamento marcado — os parados há mais tempo primeiro." items={needs.noNextStep} icon={MessageCircle} cta="Agendar" ctaHref={(c) => `/agenda/novo?cliente=${c.id}`} empty="Todo mundo em aberto tem um próximo passo." />
          <ActionList title="Parados em análise" hint="Há 5 dias ou mais esperando resposta. Cobre o líder." items={needs.stuckInAnalysis} icon={Hourglass} empty="Ninguém preso na análise." />
          <ActionList title="Aprovados sem adesão" hint="Registre o valor da adesão para fechar a conta." items={needs.missingAdesao} icon={Wallet} cta="Registrar" ctaHref={(c) => `/clientes/${c.id}`} empty="Todas as adesões registradas." />
        </div>
      </Section>

      <Section
        title="Resultados"
        action={
          <Suspense>
            <PeriodPicker mode={period.mode} label={period.label} previousKey={period.previousKey} nextKey={period.nextKey} isCurrent={period.isCurrent} />
          </Suspense>
        }
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Novos clientes" value={String(stats.newClients)} />
          <StatCard label="Atendimentos" value={String(stats.visits)} />
          <StatCard label="Aprovados" value={String(stats.approved)} />
          <StatCard label="Fechados" value={String(stats.closed)} />
          <StatCard label="Cartas fechadas" value={formatBRLCompact(stats.creditCents)} compact />
          <StatCard label="Comissão" value={formatBRLCompact(dealsCommissionCents(stats.closedDeals, rate))} hint={`adesão ${formatBRLCompact(stats.adesaoCents)}`} compact />
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[17px] font-normal text-ink">Novos clientes × atendimentos</h3>
              <span className="flex items-center gap-3 text-[12px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-accent" /> Novos
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-lime" /> Atendidos
                </span>
              </span>
            </div>
            <div className="mt-3">
              <AreaChart points={series} />
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[17px] font-normal text-ink">Funil agora</h3>
              <Link href="/clientes" className="text-[13px] font-medium text-accent hover:underline">
                Abrir kanban
              </Link>
            </div>
            <div className="mt-3">
              <FunnelStrip counts={counts} />
            </div>
          </Card>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ConversionCard title="Conversão por origem" items={breakdown.bySource} label={(key) => key === "nao_informada" ? "Não informada" : SOURCE_LABELS[key as keyof typeof SOURCE_LABELS]} />
          <ConversionCard title="Conversão por interesse" items={breakdown.byInterest} label={(key) => INTEREST_LABELS[key as keyof typeof INTEREST_LABELS]} />
        </div>
      </Section>
    </div>
  );
}

function ConversionCard({ title, items, label }: { title: string; items: ConversionItem[]; label: (key: string) => string }) {
  return (
    <Card className="p-5">
      <h3 className="text-[17px] font-normal text-ink">{title}</h3>
      {items.length === 0 ? <p className="mt-3 text-[13px] text-muted">Sem dados no período.</p> : (
        <div className="mt-3 space-y-3">
          {items.slice(0, 6).map((item) => (
            <div key={item.key}>
              <div className="flex items-center justify-between gap-3 text-[13px]"><span className="truncate font-medium text-ink">{label(item.key)}</span><span className="shrink-0 tabular-nums text-muted">{item.closed}/{item.total} · <strong className="text-ink">{item.conversion}%</strong></span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-accent" style={{ width: `${item.conversion}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

type ActionListProps = {
  title: string;
  hint: string;
  items: ActionItem[];
  icon: typeof MessageCircle;
  empty: string;
  cta?: string;
  ctaHref?: (c: ActionItem) => string;
};

/** Lista curta de clientes que pedem uma atitude, com o atalho certo ao lado. */
function ActionList({ title, hint, items, icon: Icon, empty, cta, ctaHref }: ActionListProps) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start gap-3 p-4 pb-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
            {title}
            {items.length ? <CountBadge value={items.length} className="h-5 min-w-5 text-[11px]" /> : null}
          </p>
          <p className="text-[12px] text-muted">{hint}</p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="px-4 pb-4 text-[13px] text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-4 py-2.5">
              <Link href={`/clientes/${c.id}`} className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-medium text-ink hover:underline">{c.name}</span>
                  <ClientStatusBadge status={c.status} className="h-5 text-[11px]" />
                </span>
                <span className="block text-[12px] text-muted">
                  {c.leaderName ?? "Sem líder"} · há {plural(c.days, "dia")}
                </span>
              </Link>
              {cta && ctaHref ? (
                <Link href={ctaHref(c)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-surface-2 px-3 text-[12px] font-medium text-ink transition-colors hover:bg-surface-3">
                  {cta}
                  <ChevronRight className="size-3.5" aria-hidden />
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
