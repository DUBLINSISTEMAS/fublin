import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, Section } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { UserForm } from "@/features/auth/components/user-form";
import { UserRow } from "@/features/auth/components/user-row";
import { requireAdmin } from "@/features/auth/session";
import { isLocked, listUsers, type ManagedUser } from "@/features/auth/service";
import { listLeaders } from "@/features/leaders/service";
import { formatTime, fromIso } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acessos" };

/** "Bloqueado até 14:32" enquanto o bloqueio por senha errada vale; nada depois disso. */
function lockedLabel(user: ManagedUser, now: Date): string | undefined {
  if (!user.lockedUntil || !isLocked(user.lockedUntil, now)) return undefined;
  return `Bloqueado até ${formatTime(fromIso(user.lockedUntil))}`;
}

export default async function AccessPage() {
  const admin = await requireAdmin();
  const db = await getDb();
  const [users, leaders] = await Promise.all([listUsers(db), listLeaders(db)]);
  const leaderNames = new Map(leaders.map((l) => [l.id, l.name]));
  const now = new Date();
  return <div className="mx-auto max-w-3xl"><PageHeader title="Acessos da equipe" description="Crie uma entrada individual para cada líder. Nunca compartilhe a sua senha de administrador." />
    <div className="space-y-6"><Section title={<span className="flex items-center gap-2"><KeyRound className="size-5" aria-hidden />Novo acesso</span>}><Card className="p-4 sm:p-5"><UserForm leaders={leaders} /></Card></Section>
      <Section title="Pessoas" count={users.length}><Card><ul className="divide-y divide-line">{users.map((user) => <UserRow key={user.id} user={user} leaderName={user.leaderId ? leaderNames.get(user.leaderId) : undefined} current={user.id === admin.id} lockedLabel={lockedLabel(user, now)} />)}</ul></Card></Section>
    </div></div>;
}
