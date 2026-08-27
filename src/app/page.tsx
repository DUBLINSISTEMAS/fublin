import Link from "next/link";
import { addHours, addMinutes, startOfMonth, subMonths } from "date-fns";
import { CalendarPlus } from "lucide-react";
import { AreaChart } from "@/components/charts/area-chart";
import { FunnelStrip } from "@/components/charts/funnel-strip";
import { Heatmap } from "@/components/charts/heatmap";
import { Badge, CountBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { getDb } from "@/db/client";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import type { AppointmentVariant } from "@/features/appointments/components/variant";
import { getActivityHeatmap, listAppointmentsForDay, listOverdueAppointments, type AppointmentWithClient } from "@/features/appointments/queries";
import { countClientsByStatus, getDailySeries, getMonthStats } from "@/features/clients/queries";
import { GoalHeroCard } from "@/features/goals/components/goal-card";
import { getCurrentPeriodProgress } from "@/features/goals/queries";
import { getSettings } from "@/features/settings/service";
import { dayKey, formatDayLong, fromIso, REMINDER_GRACE_MINUTES, shiftDayKey } from "@/lib/dates";
import { formatBRLCompact } from "@/lib/money";
import { capitalize, plural } from "@/lib/text";

export const dynamic = "force-dynamic";

const NOW_WINDOW_HOURS = 2;

type Column = { title: string; items: AppointmentWithClient[]; variant: (a: AppointmentWithClient) => AppointmentVariant; empty: string };

export default async function TodayPage() {
  const db = await getDb();
  const now = new Date();
  const today = dayKey(now);
  const thisMonth = startOfMonth(now);
  const lastMonth = startOfMonth(subMonths(now, 1));
  const settings = await getSettings(db);
  const [todayItems, tomorrowItems, overdue, stats, previous, series, heat, counts, goal] = await Promise.all([
    listAppointmentsForDay(db, today),
    listAppointmentsForDay(db, shiftDayKey(today, 1)),
    listOverdueAppointments(db, now),
    getMonthStats(db, thisMonth),
    getMonthStats(db, lastMonth, thisMonth),
    getDailySeries(db, now, 7),
    getActivityHeatmap(db, now, 14),
    countClientsByStatus(db),
    getCurrentPeriodProgress(db, settings.period, now, settings.goals.defaultTargetCents),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-muted">{capitalize(formatDayLong(now))}</p>
          <h1 className="text-[26px] font-medium tracking-tight text-ink md:text-[30px]">Hoje</h1>
        </div>
        <ButtonLink href="/agenda/novo" variant="dark" className="max-md:hidden">
          <CalendarPlus className="size-4" aria-hidden />
          Agendar
        </ButtonLink>
      </div>

      <GoalHeroCard progress={goal}>
        <Link href="/metas" className="text-[13px] font-medium text-accent hover:underline">
          Ver metas e histórico
        </Link>
      </GoalHeroCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_220px]">
        <Card className="p-5 md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[19px] font-normal text-ink">Novos clientes</h2>
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

        <Card className="p-5 md:col-span-2 xl:col-span-1">
          <h2 className="text-[19px] font-normal text-ink">Atividade</h2>
          <p className="text-[12px] text-muted">Agendamentos por hora, últimos 14 dias</p>
          <div className="mt-4">
            <Heatmap data={heat} currentDayIndex={heat.days.length - 1} currentHour={now.getHours()} />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 md:col-span-2 md:grid-cols-4 xl:col-span-1 xl:grid-cols-1">
          <StatCard label="Agendados hoje" value={String(todayPending)} hint={overdue.length ? <Hint tone="warning">{plural(overdue.length, "atrasado")}</Hint> : undefined} />
          <StatCard label="Em análise" value={String(counts.analise)} hint={counts.aprovado ? <Hint tone="success">{plural(counts.aprovado, "aprovado")} aguardando fechamento</Hint> : undefined} />
          <StatCard label="Fechados no mês" value={String(stats.closed)} hint={<Delta current={stats.closed} previous={previous.closed} />} />
          <StatCard label="Adesão no mês" value={formatBRLCompact(stats.adesaoCents)} hint={<Delta current={stats.adesaoCents} previous={previous.adesaoCents} />} compact />
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[19px] font-normal text-ink">Funil</h2>
          <Link href="/clientes" className="text-[13px] font-medium text-accent hover:underline">
            Abrir kanban
          </Link>
        </div>
        <div className="mt-3">
          <FunnelStrip counts={counts} />
        </div>
      </Card>

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

      <p className="text-[13px] text-muted">
        <Link href={`/agenda?d=${today}`} className="font-medium text-accent hover:underline">
          Ver agenda completa
        </Link>
      </p>
    </div>
  );
}

function Hint({ tone, children }: { tone: "success" | "warning"; children: React.ReactNode }) {
  return (
    <Badge tone={tone} className="h-6 text-[11px]">
      {children}
    </Badge>
  );
}

/** Variação em relação ao mês anterior; sem base de comparação, só sinaliza "novo". */
function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return current > 0 ? <Hint tone="success">novo este mês</Hint> : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return <Hint tone="success">{`${pct >= 0 ? "+" : ""}${pct}% vs. mês anterior`}</Hint>;
}
