import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, Download, Paperclip } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, ClientStatusBadge, InterestChip } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { getDb } from "@/db/client";
import { requireAdmin } from "@/features/auth/session";
import { ApprovedFilters } from "@/features/clients/components/approved-filters";
import { listApproved, type ApprovedItem } from "@/features/clients/queries";
import { listLeaders } from "@/features/leaders/service";
import { getSettings } from "@/features/settings/service";
import { formatDate, fromIso } from "@/lib/dates";
import { formatBRL, formatBRLCompact } from "@/lib/money";
import { resolvePeriodFilter } from "@/lib/period-filter";
import { formatPhone } from "@/lib/phone";
import { pickParam, type SearchParams } from "@/lib/search-params";
import { initials, plural } from "@/lib/text";

export const dynamic = "force-dynamic";

export const metadata = { title: "Aprovados" };

export default async function ApprovedPage(props: PageProps<"/aprovados">) {
  await requireAdmin();
  const params = (await props.searchParams) as SearchParams;
  const now = new Date();
  const db = await getDb();
  const settings = await getSettings(db);
  const period = resolvePeriodFilter(params, settings.period, now);
  const leaderId = pickParam(params, "lider") || undefined;

  const [items, leaders] = await Promise.all([
    listApproved(db, { periodStart: period.range?.start, periodEnd: period.range?.end, leaderId }),
    listLeaders(db, { includeInactive: true }),
  ]);
  const closed = items.filter((c) => c.status === "fechou");
  const adesaoTotal = closed.reduce((sum, c) => sum + (c.adesaoCents ?? 0), 0);
  const creditTotal = items.reduce((sum, c) => sum + (c.creditCents ?? 0), 0);
  const ticket = closed.length ? Math.round(adesaoTotal / closed.length) : 0;
  const query = new URLSearchParams(period.query);
  if (leaderId) query.set("lider", leaderId);
  const exportHref = `/api/export/aprovados${query.size ? `?${query}` : ""}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Aprovados"
        description="Quem passou na análise: valores, líder, datas e propostas guardadas."
        actions={
          <ButtonLink href={exportHref} variant="secondary" size="sm">
            <Download className="size-4" aria-hidden />
            Exportar Excel
          </ButtonLink>
        }
      />
      <Suspense>
        <ApprovedFilters period={period} leaders={leaders} leaderId={leaderId} />
      </Suspense>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Aprovados" value={String(items.length)} />
        <StatCard label="Fechados" value={String(closed.length)} hint={items.length ? `${Math.round((closed.length / items.length) * 100)}% dos aprovados` : undefined} />
        <StatCard label="Adesão total" value={formatBRLCompact(adesaoTotal)} hint={ticket ? `ticket ${formatBRLCompact(ticket)}` : undefined} compact />
        <StatCard label="Cartas aprovadas" value={formatBRLCompact(creditTotal)} compact />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={BadgeCheck} title="Nenhum aprovado neste período" description="Quando um cliente passar na análise, arraste o card para “Aprovado” no funil e ele aparece aqui." action={<ButtonLink href="/clientes" variant="secondary">Abrir funil</ButtonLink>} />
      ) : (
        <>
          {/* Tabela no desktop */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-[14px]">
              <thead className="bg-surface-2 text-left text-[12px] font-medium uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Líder</th>
                  <th className="px-4 py-3">Carta</th>
                  <th className="px-4 py-3">Aprovado</th>
                  <th className="px-4 py-3">Fechou</th>
                  <th className="px-4 py-3 text-right">Adesão</th>
                  <th className="px-4 py-3 text-center">Anexos</th>
                  <th className="px-4 py-3">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <Link href={`/clientes/${c.id}`} className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent-ink">{initials(c.name)}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink hover:underline">{c.name}</span>
                          <span className="block text-[12px] text-muted">{formatPhone(c.phone)}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{c.leader?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <InterestChip interest={c.interest} className="h-6 text-[12px]" />
                        <span className="tabular-nums text-ink-2">{formatBRLCompact(c.creditCents)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-2">{c.approvedAt ? formatDate(fromIso(c.approvedAt)) : "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-ink-2">{c.closedAt ? formatDate(fromIso(c.closedAt)) : "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.adesaoCents ? <span className="font-medium text-ink">{formatBRL(c.adesaoCents)}</span> : <Badge tone="warning" className="h-6 text-[11px]">pendente</Badge>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/clientes/${c.id}`} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink" aria-label={`${plural(c.attachmentsCount, "anexo")}`}>
                        <Paperclip className="size-4" aria-hidden />
                        <span className="tabular-nums">{c.attachmentsCount}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <ClientStatusBadge status={c.status} className="h-6 text-[12px]" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-2 text-[13px] font-medium text-ink">
                <tr>
                  <td className="px-4 py-3" colSpan={5}>
                    {plural(items.length, "cliente")} · {plural(closed.length, "fechado")}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBRL(adesaoTotal)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </Card>

          {/* Cards no celular */}
          <ul className="space-y-3 md:hidden">
            {items.map((c) => (
              <li key={c.id}>
                <ApprovedCard client={c} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ApprovedCard({ client: c }: { client: ApprovedItem }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/clientes/${c.id}`} className="min-w-0">
          <span className="block truncate text-[16px] font-medium text-ink">{c.name}</span>
          <span className="block text-[13px] text-muted">{c.leader?.name ?? "Sem líder"}</span>
        </Link>
        <ClientStatusBadge status={c.status} className="h-6 text-[12px]" />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        <div>
          <dt className="text-muted">Carta</dt>
          <dd className="font-medium tabular-nums text-ink">{formatBRLCompact(c.creditCents)}</dd>
        </div>
        <div>
          <dt className="text-muted">Adesão</dt>
          <dd className="font-medium tabular-nums text-ink">{c.adesaoCents ? formatBRL(c.adesaoCents) : "pendente"}</dd>
        </div>
        <div>
          <dt className="text-muted">Aprovado</dt>
          <dd className="tabular-nums text-ink-2">{c.approvedAt ? formatDate(fromIso(c.approvedAt)) : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Fechou</dt>
          <dd className="tabular-nums text-ink-2">{c.closedAt ? formatDate(fromIso(c.closedAt)) : "—"}</dd>
        </div>
      </dl>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted">
        <Paperclip className="size-3.5" aria-hidden />
        {plural(c.attachmentsCount, "anexo")} · {plural(c.meetingsCount, "atendimento")}
      </p>
    </Card>
  );
}
