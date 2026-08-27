import { Suspense } from "react";
import { UserPlus } from "lucide-react";
import { Fab } from "@/components/layout/fab";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { ClientFilters } from "@/features/clients/components/client-filters";
import { ClientList } from "@/features/clients/components/client-list";
import { StatusChips } from "@/features/clients/components/status-chips";
import { countClientsByStatus, listClients, parseClientFilters } from "@/features/clients/queries";
import { listLeaders } from "@/features/leaders/service";
import { plural } from "@/lib/text";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clientes" };

export default async function ClientsPage(props: PageProps<"/clientes">) {
  const params = await props.searchParams;
  const filters = parseClientFilters(params);
  const db = await getDb();
  const now = new Date();
  const [items, leaders, counts] = await Promise.all([
    listClients(db, filters, now),
    listLeaders(db, { includeInactive: true }),
    countClientsByStatus(db),
  ]);
  const hasFilters = Boolean(filters.q || filters.status || filters.interest || filters.leaderId);

  return (
    <>
      <PageHeader
        title="Clientes"
        description={plural(items.length, "cliente")}
        actions={
          <ButtonLink href="/clientes/novo" className="max-md:hidden">
            <UserPlus className="size-4" aria-hidden />
            Novo cliente
          </ButtonLink>
        }
      />
      <div className="space-y-4">
        <Suspense>
          <ClientFilters leaders={leaders} filters={filters} />
        </Suspense>
        <StatusChips filters={filters} counts={counts} params={params} />
        <ClientList items={items} now={now} hasFilters={hasFilters} />
      </div>
      <Fab href="/clientes/novo" label="Novo cliente" />
    </>
  );
}
