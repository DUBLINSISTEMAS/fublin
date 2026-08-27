import { PageHeader } from "@/components/layout/page-header";
import { getDb } from "@/db/client";
import { createAppointmentAction } from "@/features/appointments/actions";
import { AppointmentForm } from "@/features/appointments/components/appointment-form";
import { listClientOptions } from "@/features/clients/queries";
import { dayKey, isValidDayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata = { title: "Novo agendamento" };

export default async function NewAppointmentPage(props: PageProps<"/agenda/novo">) {
  const params = await props.searchParams;
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const requestedDay = pick(params.d);
  const clientId = pick(params.cliente);
  const day = isValidDayKey(requestedDay) ? requestedDay : dayKey(new Date());

  const db = await getDb();
  const clients = await listClientOptions(db);
  const locked = clientId ? clients.find((c) => c.id === clientId) : undefined;
  const returnTo = locked ? "cliente" : "agenda";
  const cancelHref = locked ? `/clientes/${locked.id}` : `/agenda?d=${day}`;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Agenda" title="Novo agendamento" description="Você recebe um lembrete antes do horário, no computador e no celular." />
      <AppointmentForm action={createAppointmentAction} clients={clients} lockedClient={locked} defaultDay={day} returnTo={returnTo} cancelHref={cancelHref} submitLabel="Agendar" />
    </div>
  );
}
