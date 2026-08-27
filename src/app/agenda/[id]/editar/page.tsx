import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { getDb } from "@/db/client";
import { deleteAppointmentAction, updateAppointmentAction } from "@/features/appointments/actions";
import { AppointmentForm } from "@/features/appointments/components/appointment-form";
import { getAppointment } from "@/features/appointments/service";
import { listClientOptions } from "@/features/clients/queries";
import { DomainError } from "@/lib/result";

export const dynamic = "force-dynamic";

export const metadata = { title: "Editar agendamento" };

export default async function EditAppointmentPage(props: PageProps<"/agenda/[id]/editar">) {
  const { id } = await props.params;
  const db = await getDb();
  const appointment = await getAppointment(db, id).catch((error: unknown) => {
    if (error instanceof DomainError) return null;
    throw error;
  });
  if (!appointment) notFound();
  const clients = await listClientOptions(db);
  const client = clients.find((c) => c.id === appointment.clientId);
  const action = updateAppointmentAction.bind(null, appointment.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Agenda" title="Editar agendamento" description={client ? `Com ${client.name}` : undefined} />
      <AppointmentForm action={action} clients={clients} lockedClient={client} initial={appointment} returnTo="cliente" cancelHref={`/clientes/${appointment.clientId}`} submitLabel="Salvar alterações" />
      <div className="mt-10 border-t border-line pt-6">
        <ConfirmButton action={deleteAppointmentAction} hidden={{ id: appointment.id }} label="Excluir agendamento" confirmLabel="Excluir" />
      </div>
    </div>
  );
}
