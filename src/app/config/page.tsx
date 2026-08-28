import os from "node:os";
import { Download, Smartphone } from "lucide-react";
import { NotificationSettings } from "@/components/layout/notification-settings";
import { PageHeader } from "@/components/layout/page-header";
import { DensityToggle, ThemeToggle } from "@/components/layout/theme-toggle";
import { Card, Section } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { BackupPanel } from "@/features/backup/components/backup-panel";
import { listBackups, resolveBackupDir } from "@/features/backup/service";
import { AlertsForm, CommissionForm, GoalDefaultsForm, PeriodForm, ProfileForm } from "@/features/settings/components/settings-forms";
import { getSettings } from "@/features/settings/service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Configurações" };

/** Endereços IPv4 da rede local, para abrir o app no celular. */
function lanAddresses(): string[] {
  const out: string[] = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) out.push(entry.address);
    }
  }
  return out;
}

const EXPORTS = [
  { href: "/api/export/clientes", title: "Clientes", description: "Todos os clientes: etapa, carta, adesão, líder, telefone e datas." },
  { href: "/api/export/aprovados?periodo=todos", title: "Aprovados", description: "Quem passou na análise, com valores e datas de aprovação e fechamento." },
  { href: "/api/export/recebimentos", title: "Recebimentos", description: "Produção e comissão de cada quinzena (a atual e as 11 anteriores)." },
];

export default async function ConfigPage() {
  const port = process.env.PORT ?? "3000";
  const addresses = lanAddresses();
  const backupDir = resolveBackupDir();
  const [settings, backups] = await Promise.all([getSettings(await getDb()), listBackups(backupDir)]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Configurações" description="Seu perfil, quinzenas e metas, alertas, acesso pelo celular e seus dados." />
      <div className="space-y-8">
        <Section title="Perfil">
          <Card className="p-4 sm:p-5">
            <ProfileForm profile={settings.profile} />
          </Card>
        </Section>

        <Section title="Quinzenas, metas e comissão" className="scroll-mt-24">
          <div id="quinzenas" className="grid gap-4 md:grid-cols-2">
            <Card className="p-4 sm:p-5 md:row-span-2">
              <PeriodForm period={settings.period} />
            </Card>
            <Card className="p-4 sm:p-5">
              <GoalDefaultsForm goals={settings.goals} />
            </Card>
            <Card className="p-4 sm:p-5">
              <CommissionForm commission={settings.commission} />
            </Card>
          </div>
        </Section>

        <Section title="Aparência">
          <Card className="divide-y divide-line">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div>
                <p className="text-[15px] font-medium text-ink">Tema</p>
                <p className="mt-0.5 text-sm text-muted">Escuro é azul-marinho, não preto. Automático segue o celular ou o computador.</p>
              </div>
              <ThemeToggle />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div>
                <p className="text-[15px] font-medium text-ink">Tamanho no computador</p>
                <p className="mt-0.5 text-sm text-muted">Compacto mostra mais coisa na tela, como um zoom de 85%. No celular e no tablet não muda nada.</p>
              </div>
              <DensityToggle />
            </div>
          </Card>
        </Section>

        <Section title="Alertas e sons">
          <Card className="p-4 sm:p-5">
            <AlertsForm alerts={settings.alerts} />
            <div className="mt-5 border-t border-line pt-5">
              <NotificationSettings />
            </div>
          </Card>
        </Section>

        <Section title="Acesso pelo celular">
          <Card className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2">
                <Smartphone className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-ink">Mesma rede Wi-Fi</p>
                <p className="mt-1 text-sm text-muted">Com o app rodando neste computador, abra um destes endereços no navegador do celular. Depois use “Adicionar à tela inicial”: ele abre como aplicativo, sem a barra do navegador.</p>
                {addresses.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {addresses.map((ip) => (
                      <li key={ip}>
                        <code className="rounded-md bg-surface-2 px-2.5 py-1.5 text-sm font-medium tabular-nums text-ink">
                          http://{ip}:{port}
                        </code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted">Nenhuma rede detectada agora.</p>
                )}
              </div>
            </div>
          </Card>
        </Section>

        <Section title="Planilhas (Excel)">
          <Card>
            <ul className="divide-y divide-line">
              {EXPORTS.map((item) => (
                <li key={item.href} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-ink">{item.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{item.description}</p>
                  </div>
                  <a href={item.href} className="inline-flex h-10 items-center gap-2 rounded-control border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
                    <Download className="size-4" aria-hidden />
                    Baixar Excel
                  </a>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-4 py-3 text-[13px] text-muted sm:px-5">Arquivos .xlsx nativos: abrem direto no Excel, com moeda e datas já formatadas.</p>
          </Card>
        </Section>

        <Section title="Backup dos seus dados" className="scroll-mt-24">
          <div id="backup">
            <Card className="p-4 sm:p-5">
              <BackupPanel backups={backups} backupDir={backupDir} />
              <p className="mt-5 border-t border-line pt-4 text-[13px] text-muted">
                Os dados ficam só neste computador, na pasta <code className="rounded bg-surface-2 px-1">data/</code> (banco, fotos e anexos). Com o instalador do Windows, o backup das 00:05 roda mesmo com o sistema fechado.
              </p>
            </Card>
          </div>
        </Section>
      </div>
    </div>
  );
}
