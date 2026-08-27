import { CalendarPlus, CalendarX2 } from "lucide-react";
import { Fab } from "@/components/layout/fab";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getDb } from "@/db/client";
import { AppointmentRow, type RowVariant } from "@/features/appointments/components/appointment-row";
import { DayNav } from "@/features/appointments/components/day-nav";
import { listAppointmentsForDay } from "@/features/appointments/queries";
import { dayBounds, dayKey, formatDayLong, formatRelativeDay, fromIso, isValidDayKey } from "@/lib/dates";
import { capitalize, plural } from "@/lib/text";

export const dynamic = "force-dynamic";

export const metadata = { title: "Agenda" };

export default async function AgendaPage(props: PageProps<"/agenda">) {
  const params = await props.searchParams;
  const requested = Array.isArray(params.d) ? params.d[0] : params.d;
  const now = new Date();
  const day = isValidDayKey(requested) ? requested : dayKey(now);
  const db = await getDb();
  const items = await listAppointmentsForDay(db, day);
  const dayDate = dayBounds(day).start;
  const pendingCount = items.filter((a) => a.status === "agendado").length;

  return (
    <>
      <PageHeader
        eyebrow={formatRelativeDay(dayDate, now)}
        title={capitalize(formatDayLong(dayDate))}
        description={items.length ? `${plural(items.length, "agendamento")}${pendingCount !== items.length ? ` · ${pendingCount} em aberto` : ""}` : "Dia livre"}
        actions={
          <>
            <DayNav day={day} />
            <ButtonLink href={`/agenda/novo?d=${day}`} size="sm" variant="dark" className="max-md:hidden">
              <CalendarPlus className="size-4" aria-hidden />
              Agendar
            </ButtonLink>
          </>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="Nada marcado neste dia"
          description="Marque uma visita à loja, uma ligação ou um retorno."
          action={
            <ButtonLink href={`/agenda/novo?d=${day}`} variant="secondary">
              <CalendarPlus className="size-4" aria-hidden />
              Agendar
            </ButtonLink>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {items.map((a) => (
              <AppointmentRow key={a.id} appointment={a} now={now} showDay={false} variant={variantFor(a.status, fromIso(a.scheduledAt), now)} />
            ))}
          </ul>
        </Card>
      )}
      <Fab href={`/agenda/novo?d=${day}`} label="Novo agendamento" />
    </>
  );
}

function variantFor(status: string, when: Date, now: Date): RowVariant {
  if (status !== "agendado") return "done";
  return when < now ? "overdue" : "default";
}
