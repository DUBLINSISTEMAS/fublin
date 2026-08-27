import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, MessageCircle, Pencil, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { getDb } from "@/db/client";
import { AppointmentRow } from "@/features/appointments/components/appointment-row";
import { deleteClientAction } from "@/features/clients/actions";
import { NoteForm } from "@/features/clients/components/note-form";
import { StatusPicker } from "@/features/clients/components/status-picker";
import { Timeline } from "@/features/clients/components/timeline";
import { getClientDetail } from "@/features/clients/queries";
import { formatDate, fromIso } from "@/lib/dates";
import { INTEREST_LABELS, labelOf, SOURCE_LABELS } from "@/lib/domain";
import { formatPhone, telUrl, whatsappUrl } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/clientes/[id]">) {
  const { id } = await props.params;
  const db = await getDb();
  const client = await getClientDetail(db, id);
  return { title: client?.name ?? "Cliente" };
}

export default async function ClientPage(props: PageProps<"/clientes/[id]">) {
  const { id } = await props.params;
  const db = await getDb();
  const client = await getClientDetail(db, id);
  if (!client) notFound();

  const now = new Date();
  const withClient = client.appointments.map((a) => ({ ...a, client }));
  const pending = withClient.filter((a) => a.status === "agendado").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const past = withClient.filter((a) => a.status !== "agendado");
  const eyebrow = [INTEREST_LABELS[client.interest], client.interestNotes].filter(Boolean).join(" · ");

  const facts: [string, string][] = [
    ["Telefone", formatPhone(client.phone)],
    ["E-mail", client.email ?? "—"],
    ["Origem", labelOf(SOURCE_LABELS, client.source)],
    ["Líder de vendas", client.leader?.name ?? "—"],
    ["Veio à loja em", client.firstVisitAt ? formatDate(fromIso(client.firstVisitAt)) : "Ainda não veio"],
    ["Cadastrado em", formatDate(fromIso(client.createdAt))],
  ];

  return (
    <>
      <Link href="/clientes" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink md:hidden">
        <ArrowLeft className="size-4" aria-hidden />
        Clientes
      </Link>
      <PageHeader
        eyebrow={eyebrow}
        title={client.name}
        actions={
          <>
            <ButtonLink href={`/clientes/${client.id}/editar`} variant="secondary" size="sm">
              <Pencil className="size-4" aria-hidden />
              Editar
            </ButtonLink>
            <ButtonLink href={`/agenda/novo?cliente=${client.id}`} size="sm">
              <CalendarPlus className="size-4" aria-hidden />
              Agendar
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-2">
            <a href={whatsappUrl(client.phone)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white shadow-card transition-colors hover:bg-accent-strong">
              <MessageCircle className="size-4" aria-hidden />
              WhatsApp
            </a>
            <a href={telUrl(client.phone)} className="inline-flex h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
              <Phone className="size-4" aria-hidden />
              Ligar
            </a>
            <span className="ml-1 text-sm tabular-nums text-muted">{formatPhone(client.phone)}</span>
          </div>

          <Section title="Status no funil">
            <div className="max-w-xs">
              <StatusPicker id={client.id} status={client.status} />
            </div>
          </Section>

          <Section title="Agendamentos" count={withClient.length} action={<Link href={`/agenda/novo?cliente=${client.id}`} className="text-[13px] font-medium text-accent hover:underline">Novo</Link>}>
            {pending.length === 0 && past.length === 0 ? (
              <p className="text-sm text-muted">Nenhum agendamento ainda. Marque uma visita, ligação ou retorno.</p>
            ) : (
              <Card>
                <ul className="divide-y divide-line">
                  {pending.map((a) => (
                    <AppointmentRow key={a.id} appointment={a} now={now} showDay hideClient variant={fromIso(a.scheduledAt) < now ? "overdue" : "default"} />
                  ))}
                  {past.map((a) => (
                    <AppointmentRow key={a.id} appointment={a} now={now} showDay hideClient variant="done" />
                  ))}
                </ul>
              </Card>
            )}
          </Section>

          <Section title="Histórico" count={client.activities.length}>
            <Card className="space-y-6 p-4 sm:p-5">
              <NoteForm clientId={client.id} />
              <Timeline items={client.activities} />
            </Card>
          </Section>
        </div>

        <aside className="space-y-8">
          <Section title="Dados">
            <Card className="divide-y divide-line">
              {facts.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm">
                  <dt className="shrink-0 text-muted">{label}</dt>
                  <dd className="truncate text-right font-medium text-ink">{value}</dd>
                </div>
              ))}
            </Card>
          </Section>
          {client.notes ? (
            <Section title="Observações">
              <p className="text-sm whitespace-pre-wrap text-ink-2">{client.notes}</p>
            </Section>
          ) : null}
          <div className="pt-2">
            <ConfirmButton action={deleteClientAction} hidden={{ id: client.id }} label="Excluir cliente" confirmLabel="Excluir" />
          </div>
        </aside>
      </div>
    </>
  );
}
