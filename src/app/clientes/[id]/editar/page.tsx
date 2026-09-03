import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/features/auth/session";
import { updateClientAction } from "@/features/clients/actions";
import { ClientForm } from "@/features/clients/components/client-form";
import { pendingScheduleInput } from "@/features/clients/onboarding";
import { findClient } from "@/features/clients/queries";
import { listLeaders } from "@/features/leaders/service";
import { getSettings } from "@/features/settings/service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Editar cliente" };

export default async function EditClientPage(props: PageProps<"/clientes/[id]/editar">) {
  await requireAdmin();
  const { id } = await props.params;
  const db = await getDb();
  const [client, leaders, schedule, settings] = await Promise.all([findClient(db, id), listLeaders(db, { includeInactive: true }), pendingScheduleInput(db, id), getSettings(db)]);
  if (!client) notFound();
  const action = updateClientAction.bind(null, client.id);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow={client.name} backHref={`/clientes/${client.id}`} title="Editar cliente" description="Altere os dados e salve." />
      <ClientForm action={action} leaders={leaders} initial={client} initialSchedule={schedule} cancelHref={`/clientes/${client.id}`} submitLabel="Salvar alterações" defaultRatePercent={settings.commission.ratePercent} />
    </div>
  );
}
