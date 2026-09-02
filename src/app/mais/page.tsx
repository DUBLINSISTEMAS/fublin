import Link from "next/link";
import { BadgeCheck, Briefcase, ChevronRight, Download, KeyRound, Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/features/auth/session";

export const metadata = { title: "Mais" };

const ITEMS = [
  { href: "/aprovados", label: "Aprovados", description: "Quem passou na análise: valores, líder, datas e propostas.", icon: BadgeCheck },
  { href: "/lideres", label: "Líderes de vendas", description: "Quem atende na loja e como cada um está convertendo.", icon: Briefcase },
  { href: "/acessos", label: "Acessos da equipe", description: "Usuários, senhas iniciais e permissões dos líderes.", icon: KeyRound },
  { href: "/config", label: "Configurações", description: "Perfil, quinzenas, alertas, acesso pelo celular e seus dados.", icon: Settings },
  { href: "/api/export/clientes", label: "Exportar clientes (Excel)", description: "Planilha .xlsx pronta para o Excel.", icon: Download },
];

/** Atalhos que não cabem na tab bar do celular. */
export default async function MorePage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Mais" />
      <Card>
        <ul className="divide-y divide-line">
          {ITEMS.map(({ href, label, description, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-ink">{label}</span>
                  <span className="block text-[13px] text-muted">{description}</span>
                </span>
                <ChevronRight className="size-4 text-faint" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
