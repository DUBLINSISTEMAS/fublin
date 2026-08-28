import type { Client, Leader } from "@/db/schema";
import type { ClientListItem, NextAppointment } from "@/features/clients/queries";

export const NOW = new Date(2026, 7, 27, 14, 0);

export function makeLeader(overrides: Partial<Leader> = {}): Leader {
  return { id: "lead-1", name: "Carlos Menezes", phone: null, active: true, photoKey: null, createdAt: NOW.toISOString(), ...overrides };
}

export function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "cli-1",
    name: "Ana Paula Souza",
    phone: "11998877001",
    email: null,
    interest: "imovel",
    interestNotes: "Apto na zona sul",
    status: "novo",
    source: null,
    leaderId: null,
    attendance: "presencial",
    creditCents: 30000000,
    adesaoCents: null,
    firstVisitAt: null,
    analysisStartedAt: null,
    approvedAt: null,
    closedAt: null,
    lostAt: null,
    lostReason: null,
    notes: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

export function makeListItem(overrides: Partial<ClientListItem> = {}): ClientListItem {
  return { ...makeClient(), leader: null, nextAppointment: null, meetingsCount: 0, meetingsTotal: 0, ...overrides };
}

/** Próximo agendamento do card; por padrão a 1ª visita à loja de amanhã às 10h. */
export function makeNextAppointment(overrides: Partial<NextAppointment> = {}): NextAppointment {
  return { id: "apt-1", scheduledAt: new Date(2026, 7, 28, 10, 0).toISOString(), kind: "visita", status: "agendado", meetingNumber: 1, ...overrides };
}
