import { PageHeader } from "@/components/layout/page-header";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/features/auth/session";
import { createAppointmentAction } from "@/features/appointments/actions";
import { AppointmentForm } from "@/features/appointments/components/appointment-form";
import { listClientOptions } from "@/features/clients/queries";
import { getSettings } from "@/features/settings/service";
import { dayKey, isValidDayKey, isValidTime } from "@/lib/dates";
import { pickParam } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export const metadata = { title: "Novo agendamento" };

export default async function NewAppointmentPage(props: PageProps<"/agenda/novo">) {
  await requireAdmin();
  const params = await props.searchParams;
  const requestedDay = pickParam(params, "d");
  const requestedTime = pickParam(params, "h");
  const clientId = pickParam(params, "cliente");
  const day = isValidDayKey(requestedDay) ? requestedDay : dayKey(new Date());
  const time = isValidTime(requestedTime) ? requestedTime : undefined;

  const db = await getDb();
  const [clients, settings] = await Promise.all([listClientOptions(db), getSettings(db)]);
  const locked = clientId ? clients.find((c) => c.id === clientId) : undefined;
  const returnTo = locked ? "cliente" : "agenda";
  const cancelHref = locked ? `/clientes/${locked.id}` : `/agenda?d=${day}`;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow={locked ? locked.name : "Agenda"} backHref={cancelHref} title="Novo agendamento" description="Você recebe um alerta antes do horário, no computador e no celular." />
      <AppointmentForm
        action={createAppointmentAction}
        clients={clients}
        lockedClient={locked}
        defaultDay={day}
        defaultTime={time}
        defaultReminderMinutes={settings.alerts.leadMinutes}
        returnTo={returnTo}
        cancelHref={cancelHref}
        submitLabel="Agendar"
      />
    </div>
  );
}
