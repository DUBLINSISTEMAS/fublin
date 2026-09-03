import Link from "next/link";
import { Suspense } from "react";
import { ListTodo } from "lucide-react";
import { Fab } from "@/components/layout/fab";
import { getDb } from "@/db/client";
import { ClientFilters, ScheduleFilter, ViewToggle } from "@/features/clients/components/client-filters";
import { ClientList } from "@/features/clients/components/client-list";
import { Pipeline } from "@/features/clients/components/pipeline";
import { StatusChips } from "@/features/clients/components/status-chips";
import { countClientsByStatus, listClients, parseClientFilters } from "@/features/clients/queries";
import { listLeaders } from "@/features/leaders/service";
import { getSetting } from "@/features/settings/service";
import { requireUser } from "@/features/auth/session";
import { pickParam } from "@/lib/search-params";
import { plural } from "@/lib/text";

export const dynamic = "force-dynamic";

/** Um acesso de líder sem líder vinculado não pode ver a carteira de ninguém: este id não casa com nenhum. */
const NO_LEADER = "__sem_lider__";

export const metadata = { title: "Clientes" };

export default async function ClientsPage(props: PageProps<"/clientes">) {
  const params = await props.searchParams;
  const user = await requireUser();
  const filters = parseClientFilters(params);
  if (user.role === "leader") filters.leaderId = user.leaderId ?? NO_LEADER;
  const requestedView = pickParam(params, "view");
  const db = await getDb();
  const now = new Date();
  const [items, leaders, counts, alerts] = await Promise.all([
    listClients(db, filters, now),
    listLeaders(db, { includeInactive: true }),
    countClientsByStatus(db, user.role === "leader" ? user.leaderId ?? NO_LEADER : undefined),
    getSetting(db, "alerts"),
  ]);
  const hasFilters = Boolean(filters.q || filters.status || filters.interest || filters.leaderId || filters.priority || filters.schedule);
  const visibleLeaders = user.role === "admin" ? leaders : leaders.filter((leader) => leader.id === user.leaderId);
  // Busca ou filtro de status pedem lista; sem eles, o funil em colunas conta a história.
  const view: "funil" | "lista" = requestedView === "lista" || filters.q || filters.status || filters.priority ? "lista" : "funil";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-medium tracking-tight text-ink md:text-[30px]">Clientes</h1>
          <p className="text-[14px] text-muted">
            {user.role === "leader" ? "Minha carteira · " : ""}{plural(items.length, "cliente")}
            {filters.q ? ` para “${filters.q}”` : ""}
          </p>
        </div>
        <Suspense>
          <ViewToggle view={view} />
        </Suspense>
      </div>
      <Suspense>
        <ScheduleFilter value={filters.schedule} />
      </Suspense>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChips filters={filters} counts={counts} params={params} />
          <Link href={filters.priority ? "/clientes" : "/clientes?prioridade=1&view=lista"} className={filters.priority ? "inline-flex h-9 items-center gap-1.5 rounded-full bg-sun px-3 text-[12px] font-medium text-sun-ink" : "inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-[12px] font-medium text-ink shadow-card hover:bg-surface-2"}>
            <ListTodo className="size-3.5" aria-hidden /> Prioridade hoje
          </Link>
        </div>
        <Suspense>
          <ClientFilters leaders={visibleLeaders} filters={filters} showLeader={user.role === "admin"} />
        </Suspense>
      </div>
      {items.length === 0 ? <ClientList items={items} now={now} hasFilters={hasFilters} /> : view === "funil" ? <Pipeline items={items} leaders={visibleLeaders.filter((l) => l.active)} now={now} moveSound={alerts.kanbanSound} canManage={user.role === "admin"} /> : <ClientList items={items} now={now} hasFilters={hasFilters} />}
      <Fab href="/clientes/novo" label="Novo cliente" />
    </div>
  );
}
