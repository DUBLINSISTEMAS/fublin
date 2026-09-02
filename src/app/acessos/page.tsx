import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, Section } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { UserForm } from "@/features/auth/components/user-form";
import { UserRow } from "@/features/auth/components/user-row";
import { requireAdmin } from "@/features/auth/session";
import { listUsers } from "@/features/auth/service";
import { listLeaders } from "@/features/leaders/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acessos" };

export default async function AccessPage() {
  const admin = await requireAdmin();
  const db = await getDb();
  const [users, leaders] = await Promise.all([listUsers(db), listLeaders(db)]);
  const leaderNames = new Map(leaders.map((l) => [l.id, l.name]));
  return <div className="mx-auto max-w-3xl"><PageHeader title="Acessos da equipe" description="Crie uma entrada individual para cada líder. Nunca compartilhe a sua senha de administrador." />
    <div className="space-y-6"><Section title={<span className="flex items-center gap-2"><KeyRound className="size-5" aria-hidden />Novo acesso</span>}><Card className="p-4 sm:p-5"><UserForm leaders={leaders} /></Card></Section>
      <Section title="Pessoas" count={users.length}><Card><ul className="divide-y divide-line">{users.map((user) => <UserRow key={user.id} user={user} leaderName={user.leaderId ? leaderNames.get(user.leaderId) : undefined} current={user.id === admin.id} />)}</ul></Card></Section>
    </div></div>;
}
