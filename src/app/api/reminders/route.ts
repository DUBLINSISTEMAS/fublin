import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { listReminders } from "@/features/appointments/queries";
import { getSetting } from "@/features/settings/service";

export const dynamic = "force-dynamic";

/** Lembretes das próximas 24h + preferências de alerta, para o watcher do navegador. */
export async function GET() {
  const db = await getDb();
  const now = new Date();
  const [items, alerts] = await Promise.all([listReminders(db, now), getSetting(db, "alerts")]);
  return NextResponse.json({ now: now.toISOString(), items, alerts: { repeatMinutes: alerts.repeatMinutes, sound: alerts.sound } }, { headers: { "Cache-Control": "no-store" } });
}
