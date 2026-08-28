import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { getDb } from "@/db/client";
import { listUpcomingAppointments } from "@/features/appointments/queries";
import { GoalSidebarCard } from "@/features/goals/components/goal-card";
import { getCurrentPeriodProgress } from "@/features/goals/queries";
import { listLeaders } from "@/features/leaders/service";
import { DEFAULT_SETTINGS } from "@/features/settings/schema";
import { getSettings } from "@/features/settings/service";
import { NavLinks } from "./nav-links";
import { NextUpCard } from "./next-up-card";
import { ThemeToggle } from "./theme-toggle";

/**
 * Sidebar (desktop): seu perfil, navegação, meta da quinzena, líderes de vendas
 * e o card escuro com o próximo agendamento.
 */
export async function Sidebar() {
  const db = await getDb();
  const now = new Date();
  const [settings, leaders, upcoming] = await Promise.all([getSettings(db), listLeaders(db), listUpcomingAppointments(db, now, 48)]);
  const progress = await getCurrentPeriodProgress(db, settings.period, now, settings.goals.defaultTargetCents);
  const next = upcoming[0];
  const { profile } = settings;

  return (
    <aside className="panel fixed top-4 bottom-4 left-4 z-30 hidden w-60 flex-col overflow-hidden md:flex">
      <div className="px-4 pt-5 pb-4">
        <Link href="/config" className="flex items-center gap-3 rounded-card p-1 transition-colors hover:bg-surface-2" title="Seu perfil">
          <Avatar name={profile.name} photoKey={profile.photoKey} size={40} />
          <span className="min-w-0">
            <span className="block truncate text-[16px] font-medium tracking-tight text-ink">{profile.name}</span>
            <span className="block text-[12px] text-muted">{profile.name === DEFAULT_SETTINGS.profile.name ? "Coloque seu nome e foto" : "Relacionador"}</span>
          </span>
        </Link>
      </div>

      <nav aria-label="Principal" className="px-3">
        <NavLinks />
      </nav>

      <div className="mt-4 flex-1 space-y-5 overflow-y-auto px-4 pb-2">
        <GoalSidebarCard progress={progress} />
        <div>
          <h2 className="text-[15px] font-medium text-ink">Líderes</h2>
          {leaders.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted">Nenhum líder ativo.</p>
          ) : (
            <ul className="mt-2.5 space-y-2.5">
              {leaders.slice(0, 6).map((l) => (
                <li key={l.id}>
                  <Link href={`/clientes?lider=${l.id}`} className="flex items-center gap-2.5 text-[14px] text-ink-2 transition-colors hover:text-ink">
                    <Avatar name={l.name} photoKey={l.photoKey} size={30} />
                    <span className="truncate">{l.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-2 p-3">
        <NextUpCard next={next ? { clientId: next.clientId, clientName: next.client.name, kind: next.kind, scheduledAt: next.scheduledAt } : null} nowIso={now.toISOString()} />
        <ThemeToggle compact />
      </div>
    </aside>
  );
}
