import { getDb } from "@/db/client";
import { buildPayoutRows, type PayoutRow } from "@/features/goals/payouts";
import { getPeriodProgress } from "@/features/goals/queries";
import { getSettings } from "@/features/settings/service";
import { periodFor, shiftPeriod } from "@/lib/quinzena";
import { buildWorkbook, xlsxResponse, type XlsxColumn } from "@/lib/xlsx";
import { apiAuth } from "@/features/auth/api";

export const dynamic = "force-dynamic";

/** Quinzenas anteriores à atual que entram na planilha. */
const PREVIOUS_PERIODS = 11;

const COLUMNS: XlsxColumn<PayoutRow>[] = [
  { label: "Quinzena", type: "text", width: 14, get: (r) => r.title },
  { label: "Início", type: "date", get: (r) => r.start },
  { label: "Fim", type: "date", get: (r) => r.end },
  { label: "Cartas fechadas", type: "integer", width: 16, get: (r) => r.closedCount },
  { label: "Produção (R$)", type: "money", width: 18, get: (r) => r.salesCents },
  { label: "Comissão (R$)", type: "money", width: 18, get: (r) => r.commissionCents },
  { label: "Situação", type: "text", width: 14, get: (r) => r.status },
];

/** Exporta em Excel a quinzena atual + as 11 anteriores, com produção e comissão de cada uma. */
export async function GET() {
  const denied = await apiAuth(true); if (denied) return denied;
  const db = await getDb();
  const now = new Date();
  const settings = await getSettings(db);
  const cuts = settings.period;
  const current = periodFor(now, cuts).key;
  const keys = [current, ...Array.from({ length: PREVIOUS_PERIODS }, (_, i) => shiftPeriod(current, -(i + 1), cuts).key)];
  const periods = await Promise.all(keys.map((key) => getPeriodProgress(db, key, cuts, now, settings.goals)));
  const rows = buildPayoutRows(periods, settings.commission.ratePercent, now);
  const buffer = await buildWorkbook({ sheetName: "Recebimentos", columns: COLUMNS, rows });
  return xlsxResponse(buffer, "recebimentos.xlsx");
}
