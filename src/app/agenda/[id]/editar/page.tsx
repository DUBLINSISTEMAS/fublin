import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/features/auth/session";
import { deleteAppointmentAction, updateAppointmentAction } from "@/features/appointments/actions";
import { AppointmentForm } from "@/features/appointments/components/appointment-form";
import { findAppointment } from "@/features/appointments/service";
import { listClientOptions } from "@/features/clients/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Editar agendamento" };

export default async function EditAppointmentPage(props: PageProps<"/agenda/[id]/editar">) {
  await requireAdmin();
  const { id } = await props.params;
  const db = await getDb();
  const [appointment, clients] = await Promise.all([findAppointment(db, id), listClientOptions(db)]);
  if (!appointment) notFound();
  const client = clients.find((c) => c.id === appointment.clientId);
  const action = updateAppointmentAction.bind(null, appointment.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow={client?.name ?? "Agenda"} backHref={`/clientes/${appointment.clientId}`} title="Editar agendamento" description="Remarque, mude o tipo ou a duração." />
      <AppointmentForm action={action} clients={clients} lockedClient={client} initial={appointment} returnTo="cliente" cancelHref={`/clientes/${appointment.clientId}`} submitLabel="Salvar alterações" />
      <div className="mt-10 border-t border-line pt-6">
        <ConfirmButton action={deleteAppointmentAction} hidden={{ id: appointment.id }} label="Excluir agendamento" confirmLabel="Excluir" />
      </div>
    </div>
  );
}
