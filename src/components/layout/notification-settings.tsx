"use client";

import { useSyncExternalStore } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Permission = NotificationPermission | "unsupported" | "loading";

/* Mini store: a permissão vive no navegador; avisamos os assinantes quando ela muda. */
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = (): Permission => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);
const getServerSnapshot = (): Permission => "loading";
const emit = () => listeners.forEach((l) => l());

const STATUS: Record<Permission, { tone: "success" | "warning" | "danger" | "neutral"; label: string }> = {
  granted: { tone: "success", label: "Ativadas" },
  denied: { tone: "danger", label: "Bloqueadas no navegador" },
  default: { tone: "warning", label: "Não ativadas" },
  unsupported: { tone: "neutral", label: "Não suportadas aqui" },
  loading: { tone: "neutral", label: "Verificando…" },
};

export function NotificationSettings() {
  const permission = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  async function request() {
    if (typeof Notification === "undefined") return;
    await Notification.requestPermission();
    emit();
  }

  function test() {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    new Notification("Relacionador", { body: "Assim você será avisado antes de cada agendamento.", icon: "/icon.svg" });
  }

  const status = STATUS[permission];
  const Icon = permission === "granted" ? BellRing : permission === "denied" ? BellOff : Bell;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-medium text-ink">Notificações do navegador</p>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Com o app aberto (mesmo em outra aba), você recebe um aviso do sistema antes de cada agendamento, conforme o lembrete escolhido. No celular, adicione o
            app à tela inicial para funcionar melhor.
          </p>
          {permission === "denied" ? <p className="mt-2 text-sm text-rose-700">Para liberar, abra as permissões do site nas configurações do navegador.</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:pl-13">
        {permission === "default" ? (
          <Button onClick={request} variant="accent">
            Ativar notificações
          </Button>
        ) : null}
        {permission === "granted" ? (
          <Button onClick={test} variant="secondary">
            Testar notificação
          </Button>
        ) : null}
      </div>
    </div>
  );
}
