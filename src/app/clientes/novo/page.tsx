import { PageHeader } from "@/components/layout/page-header";
import { getDb } from "@/db/client";
import { createClientAction } from "@/features/clients/actions";
import { ClientForm } from "@/features/clients/components/client-form";
import { listLeaders } from "@/features/leaders/service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Novo cliente" };

export default async function NewClientPage() {
  const db = await getDb();
  const leaders = await listLeaders(db);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Clientes" backHref="/clientes" title="Novo cliente" description="Cadastre quem você trouxe ou vai trazer para a loja." />
      <ClientForm action={createClientAction} leaders={leaders} cancelHref="/clientes" submitLabel="Cadastrar cliente" />
    </div>
  );
}
