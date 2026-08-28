"use client";

import { useSyncExternalStore } from "react";
import { Bell, BellOff, BellRing, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { unlockAudio } from "@/lib/sounds";
import { TEST_ALERT_EVENT } from "./reminder-watcher";

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
  unsupported: { tone: "neutral", label: "Só o aviso na tela" },
  loading: { tone: "neutral", label: "Verificando…" },
};

export function NotificationSettings() {
  const permission = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Sem https (ex.: pelo IP da rede no celular) o navegador não oferece notificação do sistema.
  const insecure = typeof window !== "undefined" && !window.isSecureContext;

  async function request() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    emit();
    if (result === "granted") toast.success("Notificações ativadas.");
  }

  function testAlert() {
    void unlockAudio().then(() => {
      window.dispatchEvent(new CustomEvent(TEST_ALERT_EVENT));
      toast.info("Alerta de teste disparado.");
    });
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
            <p className="text-[15px] font-medium text-ink">Notificações do sistema</p>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            O alerta na tela e o som funcionam sempre que o app estiver aberto. A notificação do sistema (aquela que aparece mesmo em outra aba) precisa da sua permissão.
          </p>
          {permission === "denied" ? <p className="mt-2 text-sm text-rose-ink">Para liberar, abra as permissões do site nas configurações do navegador.</p> : null}
          {permission === "unsupported" && insecure ? (
            <p className="mt-2 text-sm text-sun-ink">Pelo endereço da rede (http://192…) o navegador não oferece notificação do sistema; no computador, use http://localhost:3000. O aviso na tela e o som continuam funcionando aqui.</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:pl-13">
        {permission === "default" ? <Button onClick={request}>Ativar notificações</Button> : null}
        <Button onClick={testAlert} variant="secondary">
          <Play className="size-4" aria-hidden />
          Testar alerta agora
        </Button>
      </div>
    </div>
  );
}
