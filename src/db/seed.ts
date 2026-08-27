/**
 * Dados de exemplo para experimentar o app: `npm run db:seed`.
 * Não roda se já houver clientes (use `-- --force` para adicionar mesmo assim).
 */
import { count } from "drizzle-orm";
import { addDays, addMinutes, setHours, setMinutes, subDays } from "date-fns";
import { createAppointment, setAppointmentStatus } from "@/features/appointments/service";
import { addClientNote, createClient, setClientStatus, updateApproval } from "@/features/clients/service";
import { createLeader } from "@/features/leaders/service";
import { dayKey, formatTime } from "@/lib/dates";
import { DEFAULT_DURATION_BY_KIND } from "@/lib/domain";
import { getDb } from "./client";
import { clients } from "./schema";

function at(base: Date, hours: number, minutes = 0): Date {
  return setMinutes(setHours(base, hours), minutes);
}

async function main() {
  const db = await getDb();
  const [{ total }] = await db.select({ total: count() }).from(clients);
  if (total > 0 && !process.argv.includes("--force")) {
    console.log(`Já existem ${total} clientes. Use "npm run db:seed -- --force" para adicionar os exemplos mesmo assim.`);
    return;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysAgo = (n: number) => subDays(today, n);

  const carlos = await createLeader(db, { name: "Carlos Menezes", phone: "11987650001" });
  const juliana = await createLeader(db, { name: "Juliana Prado", phone: "11987650002" });

  const ana = await createClient(db, {
    name: "Ana Paula Souza",
    phone: "11998877001",
    email: "ana.souza@email.com",
    interest: "imovel",
    interestNotes: "Apto na zona sul",
    credit: 30000000,
    attendance: "presencial",
    status: "novo",
    source: "indicacao",
    leaderId: carlos.id,
    notes: "Indicada pela Marcia. Prefere contato à tarde.",
  });
  const bruno = await createClient(db, {
    name: "Bruno Lima",
    phone: "11998877002",
    interest: "automovel",
    interestNotes: "SUV",
    credit: 12000000,
    attendance: "presencial",
    status: "atendido",
    source: "redes_sociais",
    leaderId: juliana.id,
    firstVisitDay: dayKey(daysAgo(3)),
  });
  const carla = await createClient(db, {
    name: "Carla Nogueira",
    phone: "11998877003",
    interest: "imovel",
    interestNotes: "Casa em Cotia",
    credit: 45000000,
    attendance: "presencial",
    status: "negociando",
    source: "abordagem",
    leaderId: carlos.id,
    firstVisitDay: dayKey(daysAgo(10)),
  });
  const diego = await createClient(db, {
    name: "Diego Ferreira",
    phone: "11998877004",
    interest: "moto",
    credit: 2500000,
    attendance: "presencial",
    status: "atendido",
    source: "telefone",
    leaderId: juliana.id,
    firstVisitDay: dayKey(daysAgo(20)),
  }, daysAgo(22));
  const elaine = await createClient(db, {
    name: "Elaine Castro",
    phone: "11998877005",
    interest: "pesados",
    interestNotes: "Caminhão para transportadora",
    credit: 80000000,
    attendance: "online",
    status: "novo",
    leaderId: carlos.id,
    notes: "Mora em Campinas; atendimento por videochamada.",
  }, daysAgo(15));
  const felipe = await createClient(db, {
    name: "Felipe Andrade",
    phone: "11998877006",
    interest: "servicos",
    interestNotes: "Reforma da casa",
    credit: 6000000,
    attendance: "presencial",
    status: "novo",
    source: "indicacao",
  });
  const gabriela = await createClient(db, {
    name: "Gabriela Rocha",
    phone: "11998877007",
    interest: "imovel",
    interestNotes: "Primeiro imóvel",
    credit: 25000000,
    attendance: "online",
    status: "atendido",
    source: "redes_sociais",
    leaderId: juliana.id,
    firstVisitDay: dayKey(daysAgo(6)),
  }, daysAgo(8));

  // Funil: Diego fechou (com adesão), Gabriela está em análise, Elaine foi perdida.
  await setClientStatus(db, diego.id, "analise", daysAgo(18));
  await setClientStatus(db, diego.id, "aprovado", daysAgo(12));
  await setClientStatus(db, diego.id, "fechou", daysAgo(9));
  await updateApproval(db, { id: diego.id, credit: 2500000, adesao: 180000, approvedDay: undefined, closedDay: undefined }, daysAgo(9));
  await setClientStatus(db, gabriela.id, "analise", daysAgo(2));
  await setClientStatus(db, elaine.id, "perdido", daysAgo(4), { lostReason: "Fechou com concorrente" });

  await addClientNote(db, ana.id, "Ligou perguntando sobre prazos. Vai trazer o marido na visita.");
  await addClientNote(db, carla.id, "Pediu simulação com parcela menor. Carlos vai montar proposta.");

  const mk = (clientId: string, when: Date, kind: "visita" | "reuniao" | "ligacao" | "retorno", reminderMinutes = 30, notes?: string) =>
    createAppointment(db, { clientId, day: dayKey(when), time: formatTime(when), kind, durationMinutes: DEFAULT_DURATION_BY_KIND[kind], reminderMinutes, notes });

  await mk(ana.id, addMinutes(now, 25), "visita", 30, "Trazer documentos");
  await mk(felipe.id, at(today, Math.min(now.getHours() + 3, 18)), "ligacao", 15);
  await mk(carla.id, at(addDays(today, 1), 10, 30), "retorno", 60, "Apresentar nova proposta");
  await mk(bruno.id, at(addDays(today, 2), 15), "visita", 1440);
  await mk(gabriela.id, at(addDays(today, 3), 19), "reuniao", 60, "Videochamada: tirar dúvidas do contrato");
  const missed = await mk(elaine.id, at(daysAgo(1), 11), "reuniao");
  await setAppointmentStatus(db, missed.id, "faltou");
  const done = await mk(diego.id, at(daysAgo(20), 14), "visita");
  await setAppointmentStatus(db, done.id, "realizado");
  const second = await mk(diego.id, at(daysAgo(13), 16), "visita");
  await setAppointmentStatus(db, second.id, "realizado");
  const gabMeeting = await mk(gabriela.id, at(daysAgo(6), 18), "reuniao");
  await setAppointmentStatus(db, gabMeeting.id, "realizado");
  await mk(bruno.id, at(daysAgo(2), 9), "ligacao");

  console.log("Exemplos criados: 2 líderes, 7 clientes, 11 agendamentos.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
