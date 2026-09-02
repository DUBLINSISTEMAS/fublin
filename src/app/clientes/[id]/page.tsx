import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarPlus, MessageCircle, Pencil, Phone, Store, Video } from "lucide-react";
import { Badge, ClientStatusBadge, InterestChip } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { getDb } from "@/db/client";
import { AppointmentRow } from "@/features/appointments/components/appointment-row";
import { variantFor } from "@/features/appointments/components/variant";
import { meetingNumber } from "@/features/appointments/sequence";
import { AttachmentsPanel } from "@/features/attachments/components/attachments-panel";
import { deleteClientAction } from "@/features/clients/actions";
import { ApprovalForm } from "@/features/clients/components/approval-form";
import { ContactForm } from "@/features/clients/components/contact-form";
import { NoteForm } from "@/features/clients/components/note-form";
import { MessageTemplates } from "@/features/clients/components/message-templates";
import { StatusPicker } from "@/features/clients/components/status-picker";
import { Timeline } from "@/features/clients/components/timeline";
import { findClient, getClientDetail } from "@/features/clients/queries";
import { formatDate, fromIso } from "@/lib/dates";
import { ATTENDANCE_LABELS, labelOf, OPEN_CLIENT_STATUSES, SOURCE_LABELS } from "@/lib/domain";
import { formatBRL } from "@/lib/money";
import { formatPhone, telUrl, whatsappUrl } from "@/lib/phone";
import { initials, plural } from "@/lib/text";
import { canAccessClient, requireUser } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/clientes/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const client = await findClient(await getDb(), id);
  return { title: client && canAccessClient(user, client.leaderId) ? client.name : "Cliente" };
}

export default async function ClientPage(props: PageProps<"/clientes/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const db = await getDb();
  const client = await getClientDetail(db, id);
  if (!client) notFound();
  if (!canAccessClient(user, client.leaderId)) redirect("/clientes");

  const now = new Date();
  const withClient = client.appointments.map((a) => ({ ...a, client, meetingNumber: meetingNumber(client.appointments, a.id) }));
  const pending = withClient.filter((a) => a.status === "agendado").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const past = withClient.filter((a) => a.status !== "agendado");
  const AttendanceIcon = client.attendance === "online" ? Video : Store;
  const needsAdesao = (client.status === "aprovado" || client.status === "fechou") && !client.adesaoCents;
  const missingNextStep = (OPEN_CLIENT_STATUSES as readonly string[]).includes(client.status) && pending.length === 0;
  const dateOrDash = (iso: string | null) => (iso ? formatDate(fromIso(iso)) : "—");

  const facts: [string, string][] = [
    ["Telefone", formatPhone(client.phone)],
    ["E-mail", client.email ?? "—"],
    ["Atendimento", ATTENDANCE_LABELS[client.attendance]],
    ["Origem", labelOf(SOURCE_LABELS, client.source)],
    ["Líder de vendas", client.leader?.name ?? "—"],
    ["1º atendimento", client.firstVisitAt ? formatDate(fromIso(client.firstVisitAt)) : "Ainda não"],
    ["Atendimentos feitos", String(client.meetingsCount)],
    ["Encontros marcados", String(client.meetingsTotal)],
    ["Em análise desde", dateOrDash(client.analysisStartedAt)],
    ["Aprovado em", dateOrDash(client.approvedAt)],
    ["Fechou em", dateOrDash(client.closedAt)],
    ["Cadastrado em", formatDate(fromIso(client.createdAt))],
  ];

  return (
    <div className="space-y-5">
      <Link href="/clientes" className="inline-flex h-8 items-center gap-1 rounded-full pr-2 text-[13px] font-medium text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        Clientes
      </Link>

      <Card className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-accent-soft text-[18px] font-semibold text-accent-ink">{initials(client.name)}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <ClientStatusBadge status={client.status} />
                <InterestChip interest={client.interest} />
                <span className="inline-flex h-7 items-center gap-1 rounded-chip bg-surface-2 px-2 text-[12px] text-muted">
                  <AttendanceIcon className="size-3.5" aria-hidden />
                  {ATTENDANCE_LABELS[client.attendance]}
                </span>
                {needsAdesao ? <Badge tone="warning">Adesão pendente</Badge> : null}
              </div>
              <h1 className="mt-1.5 text-[26px] font-medium tracking-tight text-ink md:text-[30px]">{client.name}</h1>
              <p className="text-[14px] text-muted">
                {client.creditCents ? <span className="font-medium text-ink">Carta de {formatBRL(client.creditCents)}</span> : null}
                {client.creditCents && client.interestNotes ? " · " : null}
                {client.interestNotes}
                {client.meetingsCount ? ` · ${plural(client.meetingsCount, "atendimento")}` : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={whatsappUrl(client.phone)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-control bg-lime px-4 text-[14px] font-medium text-lime-ink transition-colors hover:bg-lime-soft">
              <MessageCircle className="size-4" aria-hidden />
              WhatsApp
            </a>
            <a href={telUrl(client.phone)} className="inline-flex h-11 items-center gap-2 rounded-control bg-surface-2 px-4 text-[14px] font-medium text-ink transition-colors hover:bg-surface-3">
              <Phone className="size-4" aria-hidden />
              Ligar
            </a>
            {user.role === "admin" ? <ButtonLink href={`/clientes/${client.id}/editar`} variant="secondary">
              <Pencil className="size-4" aria-hidden />
              Editar
            </ButtonLink> : null}
            {user.role === "admin" ? <ButtonLink href={`/agenda/novo?cliente=${client.id}`} variant="dark">
              <CalendarPlus className="size-4" aria-hidden />
              Agendar
            </ButtonLink> : null}
          </div>
        </div>
      </Card>

      {missingNextStep && user.role === "admin" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-sun p-4 text-sun-ink">
          <div><p className="font-semibold">Este cliente está sem próximo passo</p><p className="text-[13px]">Marque uma ligação, retorno, visita ou reunião para ele não sair do radar.</p></div>
          <ButtonLink href={`/agenda/novo?cliente=${client.id}`} variant="dark"><CalendarPlus className="size-4" aria-hidden />Definir próxima ação</ButtonLink>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Section title="Agendamentos" count={withClient.length} action={user.role === "admin" ? <Link href={`/agenda/novo?cliente=${client.id}`} className="text-[13px] font-medium text-accent hover:underline">Novo</Link> : undefined}>
            {withClient.length === 0 ? (
              <Card className="px-5 py-6 text-[14px] text-muted">Nenhum agendamento ainda. Marque uma visita, reunião online, ligação ou retorno.</Card>
            ) : (
              <Card>
                <ul className="divide-y divide-line">
                  {[...pending, ...past].map((a) => (
                    <AppointmentRow key={a.id} appointment={a} now={now} showDay hideClient readOnly={user.role === "leader"} variant={variantFor(a.status, fromIso(a.scheduledAt), now)} />
                  ))}
                </ul>
              </Card>
            )}
          </Section>

          {user.role === "admin" ? <Section title="Propostas e documentos" count={client.attachments.length}>
            <Card className="p-4 sm:p-5">
              <AttachmentsPanel clientId={client.id} attachments={client.attachments} />
            </Card>
          </Section> : null}

          <Section title="Comunicação e histórico" count={client.activities.length}>
            <Card className="space-y-6 p-4 sm:p-5">
              <div className="space-y-2">
                <p className="text-[13px] font-semibold text-ink">Mensagens rápidas</p>
                <MessageTemplates name={client.name} phone={client.phone} nextAt={pending[0]?.scheduledAt} />
              </div>
              <ContactForm clientId={client.id} />
              <NoteForm clientId={client.id} />
              <Timeline items={client.activities} currentUserId={user.id} />
            </Card>
          </Section>
        </div>

        <aside className="space-y-5">
          <Section title="Etapa do funil">
            <Card className="p-4">
              <StatusPicker id={client.id} status={client.status} lostReason={client.lostReason} />
            </Card>
          </Section>
          {user.role === "admin" ? <Section title="Aprovação" action={needsAdesao ? <Badge tone="warning" className="h-6 text-[11px]">Falta a adesão</Badge> : undefined}>
            <Card className="p-4">
              <ApprovalForm client={client} />
            </Card>
          </Section> : null}
          <Section title="Dados">
            <Card>
              <dl className="divide-y divide-line">
                {facts.map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-[14px]">
                    <dt className="shrink-0 text-muted">{label}</dt>
                    <dd className="truncate text-right font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </Section>
          {client.notes ? (
            <Section title="Observações">
              <Card className="p-4 text-[14px] whitespace-pre-wrap text-ink-2">{client.notes}</Card>
            </Section>
          ) : null}
          {user.role === "admin" ? <div className="pt-1">
            <ConfirmButton action={deleteClientAction} hidden={{ id: client.id }} label="Excluir cliente" confirmLabel="Excluir" />
          </div> : null}
        </aside>
      </div>
    </div>
  );
}
