/**
 * Dados de exemplo para experimentar o app: `npm run db:seed`.
 * Não roda se já houver clientes (use `-- --force` para adicionar mesmo assim).
 */
import { count } from "drizzle-orm";
import { addDays, addMinutes, setHours, setMinutes, subDays } from "date-fns";
import { createAppointment, setAppointmentStatus } from "@/features/appointments/service";
import { createClient, addClientNote } from "@/features/clients/service";
import { createLeader } from "@/features/leaders/service";
import { dayKey, formatTime } from "@/lib/dates";
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

  const carlos = await createLeader(db, { name: "Carlos Menezes", phone: "11987650001" });
  const juliana = await createLeader(db, { name: "Juliana Prado", phone: "11987650002" });

  const ana = await createClient(db, {
    name: "Ana Paula Souza",
    phone: "11998877001",
    email: "ana.souza@email.com",
    interest: "imovel",
    interestNotes: "Carta de R$ 300 mil, apto na zona sul",
    status: "novo",
    source: "indicacao",
    leaderId: carlos.id,
    notes: "Indicada pela Marcia. Prefere contato à tarde.",
  });
  const bruno = await createClient(db, {
    name: "Bruno Lima",
    phone: "11998877002",
    interest: "automovel",
    interestNotes: "SUV até R$ 120 mil",
    status: "visitou",
    source: "redes_sociais",
    leaderId: juliana.id,
    firstVisitDay: dayKey(subDays(today, 3)),
  });
  const carla = await createClient(db, {
    name: "Carla Nogueira",
    phone: "11998877003",
    interest: "imovel",
    interestNotes: "Casa em Cotia, R$ 450 mil",
    status: "negociando",
    source: "abordagem",
    leaderId: carlos.id,
    firstVisitDay: dayKey(subDays(today, 10)),
  });
  const diego = await createClient(db, {
    name: "Diego Ferreira",
    phone: "11998877004",
    interest: "moto",
    status: "fechou",
    source: "telefone",
    leaderId: juliana.id,
    firstVisitDay: dayKey(subDays(today, 20)),
  });
  const elaine = await createClient(db, {
    name: "Elaine Castro",
    phone: "11998877005",
    interest: "pesados",
    interestNotes: "Caminhão para transportadora",
    status: "perdido",
    leaderId: carlos.id,
    notes: "Fechou com concorrente.",
  });
  const felipe = await createClient(db, {
    name: "Felipe Andrade",
    phone: "11998877006",
    interest: "servicos",
    interestNotes: "Reforma da casa",
    status: "novo",
    source: "indicacao",
  });

  await addClientNote(db, ana.id, "Ligou perguntando sobre prazos. Vai trazer o marido na visita.");
  await addClientNote(db, carla.id, "Pediu simulação com parcela menor. Carlos vai montar proposta.");

  const mk = (clientId: string, when: Date, kind: "visita" | "ligacao" | "retorno", reminderMinutes = 30, notes?: string) =>
    createAppointment(db, { clientId, day: dayKey(when), time: formatTime(when), kind, reminderMinutes, notes });

  await mk(ana.id, addMinutes(now, 25), "visita", 30, "Trazer documentos");
  await mk(felipe.id, at(today, Math.min(now.getHours() + 3, 18)), "ligacao", 15);
  await mk(carla.id, at(addDays(today, 1), 10, 30), "retorno", 60, "Apresentar nova proposta");
  await mk(bruno.id, at(addDays(today, 2), 15), "visita", 1440);
  const missed = await mk(elaine.id, at(subDays(today, 1), 11), "visita");
  await setAppointmentStatus(db, missed.id, "faltou");
  const done = await mk(diego.id, at(subDays(today, 20), 14), "visita");
  await setAppointmentStatus(db, done.id, "realizado");
  await mk(bruno.id, at(subDays(today, 2), 9), "ligacao");

  console.log("Exemplos criados: 2 líderes, 6 clientes, 7 agendamentos.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
