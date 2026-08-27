import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { listReminders } from "@/features/appointments/queries";

export const dynamic = "force-dynamic";

/** Lembretes das próximas 24h para o watcher do navegador. */
export async function GET() {
  const db = await getDb();
  const now = new Date();
  const items = await listReminders(db, now);
  return NextResponse.json({ now: now.toISOString(), items }, { headers: { "Cache-Control": "no-store" } });
}
