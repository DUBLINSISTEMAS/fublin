import { PageHeader } from "@/components/layout/page-header";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/features/auth/session";
import { createClientAction } from "@/features/clients/actions";
import { ClientForm } from "@/features/clients/components/client-form";
import { listLeaders } from "@/features/leaders/service";
import { getSettings } from "@/features/settings/service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Novo cliente" };

export default async function NewClientPage() {
  await requireAdmin();
  const db = await getDb();
  const [leaders, settings] = await Promise.all([listLeaders(db), getSettings(db)]);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Clientes" backHref="/clientes" title="Novo cliente" description="Cadastre quem você trouxe ou vai trazer para a loja." />
      <ClientForm action={createClientAction} leaders={leaders} cancelHref="/clientes" submitLabel="Cadastrar cliente" defaultRatePercent={settings.commission.ratePercent} />
    </div>
  );
}
