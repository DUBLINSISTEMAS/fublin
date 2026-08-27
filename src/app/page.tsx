import Link from "next/link";
import { addHours, addMinutes } from "date-fns";
import { CalendarPlus, Inbox } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getDb } from "@/db/client";
import { AppointmentRow, type RowVariant } from "@/features/appointments/components/appointment-row";
import { listAppointmentsForDay, listOverdueAppointments } from "@/features/appointments/queries";
import { countClientsByStatus, getMonthStats } from "@/features/clients/queries";
import { dayKey, formatDayLong, fromIso, monthStart, REMINDER_GRACE_MINUTES, shiftDayKey } from "@/lib/dates";
import { CLIENT_STATUS_LABELS, OPEN_CLIENT_STATUSES } from "@/lib/domain";
import { plural } from "@/lib/text";

export const dynamic = "force-dynamic";

const NOW_WINDOW_HOURS = 2;

export default async function TodayPage() {
  const db = await getDb();
  const now = new Date();
  const today = dayKey(now);
  const [todayItems, tomorrowItems, overdue, stats, counts] = await Promise.all([
    listAppointmentsForDay(db, today),
    listAppointmentsForDay(db, shiftDayKey(today, 1)),
    listOverdueAppointments(db, now),
    getMonthStats(db, monthStart(now)),
    countClientsByStatus(db),
  ]);

  const graceStart = addMinutes(now, -REMINDER_GRACE_MINUTES);
  const nowEnd = addHours(now, NOW_WINDOW_HOURS);
  const overdueIds = new Set(overdue.map((a) => a.id));
  const nowItems = todayItems.filter((a) => a.status === "agendado" && fromIso(a.scheduledAt) >= graceStart && fromIso(a.scheduledAt) <= nowEnd);
  const nowIds = new Set(nowItems.map((a) => a.id));
  const restToday = todayItems.filter((a) => !nowIds.has(a.id) && !overdueIds.has(a.id));
  const pendingTomorrow = tomorrowItems.filter((a) => a.status === "agendado");
  const openTotal = OPEN_CLIENT_STATUSES.reduce((sum, s) => sum + counts[s], 0);

  const summary = [plural(todayItems.length, "agendamento"), overdue.length ? `${plural(overdue.length, "atrasado")} sem baixa` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        eyebrow={formatDayLong(now)}
        title="Hoje"
        description={summary}
        actions={
          <ButtonLink href="/agenda/novo" variant="primary" className="max-md:hidden">
            <CalendarPlus className="size-4" aria-hidden />
            Agendar
          </ButtonLink>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10">
        <div className="space-y-8">
          {nowItems.length > 0 ? (
            <Section title="Agora" count={nowItems.length}>
              <Card className="border-accent/30 bg-gradient-to-br from-surface to-accent-soft/30">
                <ul className="divide-y divide-line">
                  {nowItems.map((a) => (
                    <AppointmentRow key={a.id} appointment={a} now={now} variant="now" />
                  ))}
                </ul>
              </Card>
            </Section>
          ) : null}

          <Section title="Hoje" count={restToday.length} action={<Link href={`/agenda?d=${today}`} className="text-[13px] font-medium text-accent hover:underline">Ver agenda</Link>}>
            {restToday.length === 0 && nowItems.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Nada agendado para hoje"
                description="Agende uma visita, ligação ou retorno e o sistema te lembra na hora certa."
                action={
                  <ButtonLink href="/agenda/novo" variant="secondary">
                    <CalendarPlus className="size-4" aria-hidden />
                    Agendar
                  </ButtonLink>
                }
              />
            ) : restToday.length === 0 ? (
              <p className="px-1 text-sm text-muted">Só o que está em “Agora”.</p>
            ) : (
              <Card>
                <ul className="divide-y divide-line">
                  {restToday.map((a) => (
                    <AppointmentRow key={a.id} appointment={a} now={now} variant={rowVariant(a.status)} />
                  ))}
                </ul>
              </Card>
            )}
          </Section>

          {overdue.length > 0 ? (
            <Section title="Atrasados sem baixa" count={overdue.length}>
              <Card className="border-amber-200/80">
                <ul className="divide-y divide-line">
                  {overdue.map((a) => (
                    <AppointmentRow key={a.id} appointment={a} now={now} variant="overdue" showDay />
                  ))}
                </ul>
              </Card>
            </Section>
          ) : null}

          {pendingTomorrow.length > 0 ? (
            <Section title="Amanhã" count={pendingTomorrow.length} action={<Link href={`/agenda?d=${shiftDayKey(today, 1)}`} className="text-[13px] font-medium text-accent hover:underline">Ver dia</Link>}>
              <Card>
                <ul className="divide-y divide-line">
                  {pendingTomorrow.slice(0, 3).map((a) => (
                    <AppointmentRow key={a.id} appointment={a} now={now} />
                  ))}
                </ul>
              </Card>
            </Section>
          ) : null}
        </div>

        <aside className="space-y-8">
          <Section title="Este mês">
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              <Stat label="Novos" value={stats.newClients} />
              <Stat label="Visitas" value={stats.visits} />
              <Stat label="Fechados" value={stats.closed} accent />
            </div>
          </Section>
          <Section title="Funil" count={openTotal} action={<Link href="/clientes?status=abertos" className="text-[13px] font-medium text-accent hover:underline">Abertos</Link>}>
            <Card className="divide-y divide-line">
              {OPEN_CLIENT_STATUSES.map((s) => (
                <Link key={s} href={`/clientes?status=${s}`} className="flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-surface-2">
                  <span className="text-ink-2">{CLIENT_STATUS_LABELS[s]}</span>
                  <span className="font-semibold tabular-nums text-ink">{counts[s]}</span>
                </Link>
              ))}
            </Card>
          </Section>
        </aside>
      </div>
    </>
  );
}

function rowVariant(status: string): RowVariant {
  return status === "agendado" ? "default" : "done";
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${accent ? "text-accent" : "text-ink"}`}>{value}</p>
    </Card>
  );
}
