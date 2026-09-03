import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { apiAuth } from "@/features/auth/api";

export const dynamic = "force-dynamic";

type Stamp = {
  clients: number;
  clientsAt: string;
  appointments: number;
  appointmentsAt: string;
  activities: number;
  activitiesAt: string;
  settingsAt: string;
};

/**
 * Marca de mudança do banco: contagem (pega exclusões) + maior `updated_at` (pega edições)
 * das tabelas que a interface mostra. Uma consulta só, sem varrer linha por linha —
 * bem mais barata que o `router.refresh()` que o `<LiveRefresh>` fazia a cada 20 s.
 * `activities` só cresce, então `created_at` basta.
 */
export async function GET() {
  const denied = await apiAuth();
  if (denied) return denied;
  const db = await getDb();
  const rows = await db.all<Stamp>(sql`
    select
      (select count(*) from clients) as clients,
      (select coalesce(max(updated_at), '') from clients) as clientsAt,
      (select count(*) from appointments) as appointments,
      (select coalesce(max(updated_at), '') from appointments) as appointmentsAt,
      (select count(*) from activities) as activities,
      (select coalesce(max(created_at), '') from activities) as activitiesAt,
      (select coalesce(max(updated_at), '') from settings) as settingsAt
  `);
  const s = rows[0];
  const version = s
    ? [s.clients, s.clientsAt, s.appointments, s.appointmentsAt, s.activities, s.activitiesAt, s.settingsAt].join("|")
    : "";
  return NextResponse.json({ version }, { headers: { "Cache-Control": "no-store" } });
}
