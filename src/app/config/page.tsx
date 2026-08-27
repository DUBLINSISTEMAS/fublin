import os from "node:os";
import { Download, Smartphone } from "lucide-react";
import { NotificationSettings } from "@/components/layout/notification-settings";
import { PageHeader } from "@/components/layout/page-header";
import { Card, Section } from "@/components/ui/card";

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

export default function ConfigPage() {
  const port = process.env.PORT ?? "3000";
  const addresses = lanAddresses();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Configurações" description="Lembretes, acesso pelo celular e seus dados." />
      <div className="space-y-8">
        <Section title="Lembretes">
          <Card className="p-4 sm:p-5">
            <NotificationSettings />
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
                <p className="mt-1 text-sm text-muted">Com o app rodando neste computador, abra um destes endereços no navegador do celular. Depois use “Adicionar à tela inicial”.</p>
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

        <Section title="Seus dados">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-medium text-ink">Exportar clientes</p>
                <p className="mt-0.5 text-sm text-muted">Planilha CSV (abre no Excel) com todos os clientes, status, líder e telefone.</p>
              </div>
              <a href="/api/export/clientes" className="inline-flex h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
                <Download className="size-4" aria-hidden />
                Baixar CSV
              </a>
            </div>
            <p className="mt-4 border-t border-line pt-4 text-[13px] text-muted">
              Os dados ficam só neste computador, no arquivo <code className="rounded bg-surface-2 px-1">data/app.db</code>. Faça backup dessa pasta de tempos em tempos.
            </p>
          </Card>
        </Section>
      </div>
    </div>
  );
}
