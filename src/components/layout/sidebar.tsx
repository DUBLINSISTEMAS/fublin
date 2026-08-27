import Link from "next/link";
import { getDb } from "@/db/client";
import { listUpcomingAppointments } from "@/features/appointments/queries";
import { listLeaders } from "@/features/leaders/service";
import { formatWhen, fromIso } from "@/lib/dates";
import { APPOINTMENT_KIND_LABELS } from "@/lib/domain";
import { initials } from "@/lib/text";
import { NavLinks } from "./nav-links";

/**
 * Sidebar (desktop): marca, navegação, líderes de vendas e o card escuro
 * com o próximo agendamento — espelha o "Members" + "Priority deal" da referência.
 */
export async function Sidebar() {
  const db = await getDb();
  const now = new Date();
  const [leaders, upcoming] = await Promise.all([listLeaders(db), listUpcomingAppointments(db, now, 48)]);
  const next = upcoming[0];

  return (
    <aside className="panel fixed top-4 bottom-4 left-4 z-30 hidden w-60 flex-col overflow-hidden md:flex">
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-accent text-[15px] font-semibold text-white">R</span>
          <span className="text-[19px] font-medium tracking-tight text-ink">Relacionador</span>
        </Link>
      </div>

      <nav aria-label="Principal" className="px-3">
        <NavLinks />
      </nav>

      <div className="mt-7 flex-1 overflow-y-auto px-5">
        <h2 className="text-[17px] font-medium text-ink">Líderes</h2>
        {leaders.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">Nenhum líder ativo.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {leaders.slice(0, 5).map((l) => (
              <li key={l.id}>
                <Link href={`/clientes?lider=${l.id}`} className="flex items-center gap-2.5 text-[14px] text-ink-2 transition-colors hover:text-ink">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-ink">{initials(l.name)}</span>
                  <span className="truncate">{l.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-3">
        <div className="rounded-card bg-dark p-4 text-white">
          <p className="text-[17px] font-medium">{next ? "Próximo" : "Agenda livre"}</p>
          {next ? (
            <>
              <p className="mt-1.5 text-[13px] leading-snug text-white/70">
                {APPOINTMENT_KIND_LABELS[next.kind]} com <span className="text-white">{next.client.name}</span>, {formatWhen(fromIso(next.scheduledAt), now).toLowerCase()}.
              </p>
              <Link href={`/clientes/${next.clientId}`} className="mt-4 flex h-10 items-center justify-center rounded-control bg-white text-[13px] font-medium text-ink transition-colors hover:bg-surface-2">
                Ver cliente
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-[13px] leading-snug text-white/70">Nada marcado nas próximas 48 h. Que tal ligar para um cliente em aberto?</p>
              <Link href="/agenda/novo" className="mt-4 flex h-10 items-center justify-center rounded-control bg-white text-[13px] font-medium text-ink transition-colors hover:bg-surface-2">
                Agendar
              </Link>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
