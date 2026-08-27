import { Suspense } from "react";
import { Fab } from "@/components/layout/fab";
import { getDb } from "@/db/client";
import { ClientFilters, ViewToggle } from "@/features/clients/components/client-filters";
import { ClientList } from "@/features/clients/components/client-list";
import { Pipeline } from "@/features/clients/components/pipeline";
import { StatusChips } from "@/features/clients/components/status-chips";
import { countClientsByStatus, listClients, parseClientFilters } from "@/features/clients/queries";
import { listLeaders } from "@/features/leaders/service";
import { pickParam } from "@/lib/search-params";
import { plural } from "@/lib/text";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clientes" };

export default async function ClientsPage(props: PageProps<"/clientes">) {
  const params = await props.searchParams;
  const filters = parseClientFilters(params);
  const requestedView = pickParam(params, "view");
  const db = await getDb();
  const now = new Date();
  const [items, leaders, counts] = await Promise.all([
    listClients(db, filters, now),
    listLeaders(db, { includeInactive: true }),
    countClientsByStatus(db),
  ]);
  const hasFilters = Boolean(filters.q || filters.status || filters.interest || filters.leaderId);
  // Busca ou filtro de status pedem lista; sem eles, o funil em colunas conta a história.
  const view: "funil" | "lista" = requestedView === "lista" || filters.q || filters.status ? "lista" : "funil";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-medium tracking-tight text-ink md:text-[30px]">Clientes</h1>
          <p className="text-[14px] text-muted">
            {plural(items.length, "cliente")}
            {filters.q ? ` para “${filters.q}”` : ""}
          </p>
        </div>
        <Suspense>
          <ViewToggle view={view} />
        </Suspense>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <StatusChips filters={filters} counts={counts} params={params} />
        <Suspense>
          <ClientFilters leaders={leaders} filters={filters} />
        </Suspense>
      </div>
      {view === "funil" ? <Pipeline items={items} leaders={leaders.filter((l) => l.active)} now={now} /> : <ClientList items={items} now={now} hasFilters={hasFilters} />}
      <Fab href="/clientes/novo" label="Novo cliente" />
    </div>
  );
}
