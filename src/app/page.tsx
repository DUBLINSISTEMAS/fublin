import Link from "next/link";
import { addHours, addMinutes, startOfMonth, subMonths } from "date-fns";
import { CalendarPlus } from "lucide-react";
import { AreaChart } from "@/components/charts/area-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { Badge, CountBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { AppointmentCard, type CardVariant } from "@/features/appointments/components/appointment-card";
import { getActivityHeatmap, listAppointmentsForDay, listOverdueAppointments } from "@/features/appointments/queries";
import { getDailySeries, getMonthStats } from "@/features/clients/queries";
import { capitalize, plural } from "@/lib/text";
import { dayKey, formatDayLong, fromIso, REMINDER_GRACE_MINUTES, shiftDayKey } from "@/lib/dates";
import type { AppointmentWithClient } from "@/features/appointments/queries";

export const dynamic = "force-dynamic";

const NOW_WINDOW_HOURS = 2;

export default async function TodayPage() {
  const db = await getDb();
  const now = new Date();
  const today = dayKey(now);
  const thisMonth = startOfMonth(now);
  const lastMonth = startOfMonth(subMonths(now, 1));
  const [todayItems, tomorrowItems, overdue, stats, previous, series, heat] = await Promise.all([
    listAppointmentsForDay(db, today),
    listAppointmentsForDay(db, shiftDayKey(today, 1)),
    listOverdueAppointments(db, now),
    getMonthStats(db, thisMonth),
    getMonthStats(db, lastMonth, thisMonth),
    getDailySeries(db, now, 7),
    getActivityHeatmap(db, now, 14),
  ]);

  const graceStart = addMinutes(now, -REMINDER_GRACE_MINUTES);
  const nowEnd = addHours(now, NOW_WINDOW_HOURS);
  const overdueIds = new Set(overdue.map((a) => a.id));
  const nowItems = todayItems.filter((a) => a.status === "agendado" && fromIso(a.scheduledAt) >= graceStart && fromIso(a.scheduledAt) <= nowEnd);
  const nowIds = new Set(nowItems.map((a) => a.id));
  const restToday = todayItems.filter((a) => !nowIds.has(a.id) && !overdueIds.has(a.id));
  const pendingTomorrow = tomorrowItems.filter((a) => a.status === "agendado");
  const todayPending = todayItems.filter((a) => a.status === "agendado").length;

  const columns: { title: string; items: AppointmentWithClient[]; variant: (a: AppointmentWithClient) => CardVariant; empty: string }[] = [
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_200px]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[19px] font-normal text-ink">Novos clientes</h2>
            <span className="flex items-center gap-3 text-[12px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-accent" /> Novos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-lime" /> Visitas
              </span>
            </span>
          </div>
          <div className="mt-3">
            <AreaChart points={series} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-[19px] font-normal text-ink">Atividade</h2>
          <p className="text-[12px] text-muted">Agendamentos por hora, últimos 14 dias</p>
          <div className="mt-4">
            <Heatmap data={heat} currentDayIndex={heat.days.length - 1} currentHour={now.getHours()} />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Stat label="Agendados hoje" value={todayPending} hint={overdue.length ? `${plural(overdue.length, "atrasado")}` : undefined} hintTone="warning" />
          <Stat label="Fechados no mês" value={stats.closed} hint={delta(stats.closed, previous.closed)} hintTone="success" />
        </div>
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

      <p className="text-[13px] text-muted">
        <Link href={`/agenda?d=${today}`} className="font-medium text-accent hover:underline">
          Ver agenda completa
        </Link>
      </p>
    </div>
  );
}

function delta(current: number, previous: number): string | undefined {
  if (previous === 0) return current > 0 ? `+${current} vs. mês anterior` : undefined;
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}% vs. mês anterior`;
}

function Stat({ label, value, hint, hintTone }: { label: string; value: number; hint?: string; hintTone: "success" | "warning" }) {
  return (
    <Card className="flex flex-col justify-between p-5">
      <p className="text-[15px] text-ink-2">{label}</p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
        <p className="text-[40px] leading-none font-light tabular-nums tracking-tight text-ink">{value}</p>
        {hint ? <Badge tone={hintTone}>{hint}</Badge> : null}
      </div>
    </Card>
  );
}
