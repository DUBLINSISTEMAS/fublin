import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { getClientDetail, listClients } from "@/features/clients/queries";
import { clientInputSchema } from "@/features/clients/schema";
import { createClient } from "@/features/clients/service";
import { appointmentInputSchema } from "./schema";
import { listAppointmentsForDay } from "./queries";
import { createAppointment, setAppointmentStatus } from "./service";

const now = new Date(2026, 7, 27, 14, 0);
const baseClient = clientInputSchema.parse({ name: "Ana Souza", phone: "11987654321", interest: "imovel" });

let db: Db;
let clientId: string;
beforeEach(async () => {
  db = await createTestDb();
  clientId = (await createClient(db, baseClient, now)).id;
});

const book = (day: string, time: string, kind = "visita") => createAppointment(db, appointmentInputSchema.parse({ clientId, day, time, kind }), now);

describe("numbering the client's meetings", () => {
  it("tells the card which meeting is coming and how many already happened", async () => {
    const first = await book("2026-08-20", "10:00");
    await setAppointmentStatus(db, first.id, "realizado", now);
    const second = await book("2026-08-24", "10:00", "reuniao");
    await setAppointmentStatus(db, second.id, "faltou", now);
    await book("2026-09-03", "14:30");

    const [item] = await listClients(db, {}, now);
    expect(item.nextAppointment?.meetingNumber).toBe(3);
    expect(item.meetingsCount).toBe(1);
    expect(item.meetingsTotal).toBe(3);
  });

  it("ignores calls: they never take a meeting number", async () => {
    await book("2026-08-30", "09:00", "ligacao");
    await book("2026-09-03", "14:30");

    const [item] = await listClients(db, {}, now);
    expect(item.nextAppointment?.kind).toBe("ligacao");
    expect(item.nextAppointment?.meetingNumber).toBeNull();
    // A ligação não entra na conta: a visita continua sendo o 1º encontro.
    expect(item.meetingsTotal).toBe(1);
  });

  it("gives the number to the agenda as well", async () => {
    await book("2026-08-20", "10:00");
    await book("2026-09-03", "14:30");

    const [onTheDay] = await listAppointmentsForDay(db, "2026-09-03");
    expect(onTheDay.meetingNumber).toBe(2);
    expect(onTheDay.client.name).toBe("Ana Souza");
  });

  it("counts the meetings on the client page too", async () => {
    const first = await book("2026-08-20", "10:00");
    await setAppointmentStatus(db, first.id, "realizado", now);
    const dropped = await book("2026-08-25", "10:00");
    await setAppointmentStatus(db, dropped.id, "cancelado", now);

    const detail = await getClientDetail(db, clientId);
    expect(detail?.meetingsCount).toBe(1);
    expect(detail?.meetingsTotal).toBe(1);
  });
});
