import { Suspense } from "react";
import { addMonths } from "date-fns";
import { Fab } from "@/components/layout/fab";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/features/auth/session";
import { CalendarHeader } from "@/features/appointments/components/calendar/calendar-header";
import { KindFilter } from "@/features/appointments/components/calendar/kind-filter";
import { MiniCalendar } from "@/features/appointments/components/calendar/mini-calendar";
import { MonthGrid } from "@/features/appointments/components/calendar/month-grid";
import { TimeGrid } from "@/features/appointments/components/calendar/time-grid";
import { isCalendarView, toCalendarEvent, type CalendarView } from "@/features/appointments/components/calendar/types";
import { countAppointmentsByDay, listAppointmentsBetween } from "@/features/appointments/queries";
import { capitalize, plural } from "@/lib/text";
import { dayBounds, dayKey, dayKeysFrom, formatDayLong, formatDayRange, formatMonthLong, isValidDayKey, monthGridStartKey, shiftDayKey, weekStartKey, type DayKey } from "@/lib/dates";
import { APPOINTMENT_KINDS, type AppointmentKind } from "@/lib/domain";
import { pickParam, type SearchParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export const metadata = { title: "Agenda" };

function parseKinds(raw: string | undefined): AppointmentKind[] {
  const wanted = (raw ?? "").split(",").filter((k): k is AppointmentKind => (APPOINTMENT_KINDS as readonly string[]).includes(k));
  return wanted.length ? APPOINTMENT_KINDS.filter((k) => wanted.includes(k)) : [...APPOINTMENT_KINDS];
}

/** Dias visíveis e o intervalo [start, end) de cada visão. */
function visibleDays(view: CalendarView, day: DayKey): DayKey[] {
  if (view === "dia") return [day];
  if (view === "semana") return dayKeysFrom(weekStartKey(day), 7);
  return dayKeysFrom(monthGridStartKey(day), 42);
}

/** Um passo de navegação: dia, semana ou mês. */
function step(view: CalendarView, day: DayKey, direction: 1 | -1): DayKey {
  if (view === "dia") return shiftDayKey(day, direction);
  if (view === "semana") return shiftDayKey(day, 7 * direction);
  return dayKey(addMonths(dayBounds(day).start, direction));
}

export default async function AgendaPage(props: PageProps<"/agenda">) {
  await requireAdmin();
  const params = (await props.searchParams) as SearchParams;
  const now = new Date();
  const today = dayKey(now);
  const requestedView = pickParam(params, "view");
  const view: CalendarView = isCalendarView(requestedView) ? requestedView : "semana";
  const requestedDay = pickParam(params, "d");
  const day = isValidDayKey(requestedDay) ? requestedDay : today;
  const kinds = parseKinds(pickParam(params, "tipo"));
  const hideDone = pickParam(params, "ocultar") === "1";

  const days = visibleDays(view, day);
  const rangeStart = dayBounds(days[0]).start;
  const rangeEnd = dayBounds(shiftDayKey(days[days.length - 1], 1)).start;
  // O mini-calendário mostra o mês do dia selecionado, que pode ir além da semana visível.
  const miniDays = dayKeysFrom(monthGridStartKey(day), 42);
  const miniStart = dayBounds(miniDays[0]).start;
  const miniEnd = dayBounds(shiftDayKey(miniDays[41], 1)).start;

  const db = await getDb();
  const [rows, counts] = await Promise.all([listAppointmentsBetween(db, rangeStart, rangeEnd), countAppointmentsByDay(db, miniStart, miniEnd)]);
  const events = rows.filter((a) => kinds.includes(a.kind) && (!hideDone || a.status === "agendado")).map(toCalendarEvent);

  const hrefFor = (patch: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const base: Record<string, string | undefined> = { view: view === "semana" ? undefined : view, d: day, tipo: pickParam(params, "tipo"), ocultar: hideDone ? "1" : undefined, ...patch };
    for (const [k, v] of Object.entries(base)) if (v) query.set(k, v);
    const s = query.toString();
    return s ? `/agenda?${s}` : "/agenda";
  };

  const selectedDate = dayBounds(day).start;
  const title = view === "dia" ? capitalize(formatDayLong(selectedDate)) : formatMonthLong(selectedDate);
  const subtitle = view === "semana" ? `Semana de ${formatDayRange(dayBounds(days[0]).start, dayBounds(days[6]).start)}` : view === "dia" ? plural(events.length, "agendamento") : plural(events.length, "agendamento");

  return (
    <div>
      <Suspense>
        <CalendarHeader view={view} day={day} title={title} subtitle={subtitle} previousDay={step(view, day, -1)} nextDay={step(view, day, 1)} isToday={day === today} />
      </Suspense>

      <div className="mb-3 lg:hidden">
        <Suspense>
          <KindFilter selected={kinds} hideDone={hideDone} layout="chips" />
        </Suspense>
      </div>

      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="panel sticky top-4 space-y-5 p-4">
            <MiniCalendar month={day} selected={day} today={today} counts={counts} hrefFor={(d) => hrefFor({ d })} />
            <Suspense>
              <KindFilter selected={kinds} hideDone={hideDone} layout="list" />
            </Suspense>
          </div>
        </aside>

        <div className="min-w-0">
          {view === "mes" ? (
            <MonthGrid days={days} month={day} events={events} today={today} hrefForDay={(d) => hrefFor({ view: "dia", d })} />
          ) : (
            <TimeGrid days={days} events={events} today={today} focusDay={day} nowIso={now.toISOString()} />
          )}
        </div>
      </div>
      <Fab href={`/agenda/novo?d=${day}`} label="Novo agendamento" />
    </div>
  );
}
