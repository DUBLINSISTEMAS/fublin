"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AlarmClock, Bell, Check, X } from "lucide-react";
import type { ReminderItem } from "@/features/appointments/queries";
import { setAppointmentStatusAction } from "@/features/appointments/actions";
import { playSound, unlockAudio, type SoundId } from "@/lib/sounds";
import { formatCountdown, formatWhen } from "@/lib/dates";
import { APPOINTMENT_KIND_LABELS } from "@/lib/domain";
import { OK } from "@/lib/result";
import { toast } from "@/components/ui/toast";

const POLL_MS = 30_000;
const SNOOZE_MS = 5 * 60_000;
const STORAGE_KEY = "relacionador:alerts";
const KEEP_MS = 2 * 24 * 60 * 60 * 1000;
/** Disparado pelo botão "Testar alerta" em Config: mostra um alerta de mentira com som e notificação. */
export const TEST_ALERT_EVENT = "relacionador:test-alert";

type Memory = { dismissed: Record<string, number>; snoozed: Record<string, number> };
type AlertPrefs = { repeatMinutes: number; sound: SoundId };
type Payload = { now: string; items: ReminderItem[]; alerts: AlertPrefs };

function readMemory(): Memory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: Partial<Memory> = raw ? JSON.parse(raw) : {};
    const cutoff = Date.now() - KEEP_MS;
    const keep = (map: Record<string, number> | undefined) => Object.fromEntries(Object.entries(map ?? {}).filter(([, ts]) => ts > cutoff));
    return { dismissed: keep(parsed.dismissed), snoozed: keep(parsed.snoozed) };
  } catch {
    return { dismissed: {}, snoozed: {} };
  }
}

function writeMemory(memory: Memory) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    /* armazenamento indisponível: seguimos só com o aviso in-app */
  }
}

function describe(item: ReminderItem): { title: string; body: string } {
  return { title: `${APPOINTMENT_KIND_LABELS[item.kind]}: ${item.clientName}`, body: formatWhen(new Date(item.scheduledAt)) };
}

function notify(item: ReminderItem, onOpen: () => void) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const { title, body } = describe(item);
  try {
    const n = new Notification(title, { body, tag: item.id, icon: "/icons/192", requireInteraction: true });
    n.onclick = () => {
      window.focus();
      onOpen();
      n.close();
    };
  } catch {
    /* alguns navegadores móveis só notificam via service worker; o aviso na tela cobre */
  }
}

/**
 * Consulta /api/reminders a cada 30 s. Quando um agendamento entra na janela do
 * lembrete, mostra um alerta que fica na tela (e repete som/notificação no intervalo
 * configurado) até você dispensar, adiar 5 min ou dar baixa.
 */
export function ReminderWatcher() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<ReminderItem[]>([]);
  const [now, setNow] = useState(() => new Date());
  const memory = useRef<Memory>({ dismissed: {}, snoozed: {} });
  const lastFired = useRef<Record<string, number>>({});
  const prefs = useRef<AlertPrefs>({ repeatMinutes: 2, sound: "suave" });

  const fire = useCallback(
    (item: ReminderItem) => {
      lastFired.current[item.id] = Date.now();
      notify(item, () => router.push(`/clientes/${item.clientId}`));
      playSound(prefs.current.sound);
    },
    [router],
  );

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders", { cache: "no-store" });
      if (!res.ok) return;
      const data: Payload = await res.json();
      prefs.current = data.alerts;
      const stamp = Date.now();
      const active = data.items.filter((i) => i.due && !memory.current.dismissed[i.id] && (memory.current.snoozed[i.id] ?? 0) <= stamp);
      setAlerts(active);
      setNow(new Date());
      const repeatMs = prefs.current.repeatMinutes * 60_000;
      for (const item of active) {
        const last = lastFired.current[item.id];
        if (last === undefined || (repeatMs > 0 && stamp - last >= repeatMs)) fire(item);
      }
    } catch {
      /* rede indisponível: tenta de novo no próximo ciclo */
    }
  }, [fire]);

  useEffect(() => {
    memory.current = readMemory();
    void check();
    const timer = window.setInterval(check, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    // O som só pode tocar depois de um gesto: o primeiro clique/tecla libera o áudio.
    const unlock = () => void unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    // "Testar alerta" (Config): um alerta de exemplo daqui a 30 min, com som e notificação.
    const onTest = () => {
      const item: ReminderItem = { id: `teste-${Date.now()}`, clientId: "", clientName: "Cliente de teste", scheduledAt: new Date(Date.now() + 30 * 60_000).toISOString(), kind: "visita", reminderMinutes: 30, due: true };
      setAlerts((prev) => [...prev, item]);
      fire(item);
    };
    window.addEventListener(TEST_ALERT_EVENT, onTest);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener(TEST_ALERT_EVENT, onTest);
    };
  }, [check, fire]);

  // Título da aba mostra quantos alertas estão esperando.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = alerts.length ? `(${alerts.length}) ${base}` : base;
  }, [alerts.length]);

  /** Tira o alerta da tela e lembra disso: dispensado (para sempre) ou adiado (até `until`). */
  function remove(id: string, bucket: keyof Memory, until: number) {
    memory.current = { ...memory.current, [bucket]: { ...memory.current[bucket], [id]: until } };
    writeMemory(memory.current);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  if (alerts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-3 top-3 z-50 flex flex-col gap-2 md:inset-x-auto md:top-auto md:right-4 md:bottom-4 md:w-96"
      role="status"
      aria-live="assertive"
    >
      {alerts.map((item) => (
        <AlertCard
          key={item.id}
          item={item}
          now={now}
          onDismiss={() => remove(item.id, "dismissed", Date.now())}
          onSnooze={() => {
            remove(item.id, "snoozed", Date.now() + SNOOZE_MS);
            toast.info("Alerta adiado por 5 minutos.");
          }}
          onDone={() => {
            remove(item.id, "dismissed", Date.now());
            router.refresh();
          }}
        />
      ))}
    </div>
  );
}

type AlertCardProps = { item: ReminderItem; now: Date; onDismiss: () => void; onSnooze: () => void; onDone: () => void };

function AlertCard({ item, now, onDismiss, onSnooze, onDone }: AlertCardProps) {
  const { title } = describe(item);
  const when = new Date(item.scheduledAt);
  const [pending, startTransition] = useTransition();

  function markDone() {
    startTransition(async () => {
      const data = new FormData();
      data.set("id", item.id);
      data.set("status", "realizado");
      const result = await setAppointmentStatusAction(OK, data);
      if (result.ok) {
        toast.success("Baixa registrada.");
        onDone();
      } else toast.error(result.error);
    });
  }

  return (
    <div className="animate-rise animate-alert pointer-events-auto rounded-card bg-dark p-4 text-white shadow-float">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lime text-lime-ink">
          <Bell className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{title}</p>
          <p className="text-[13px] text-white/70">
            {formatWhen(when, now)} · <span className="text-lime">{formatCountdown(when, now)}</span>
          </p>
        </div>
        <button
          type="button"
          aria-label="Dispensar alerta"
          onClick={onDismiss}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.clientId ? (
          <Link href={`/clientes/${item.clientId}`} className="inline-flex h-9 items-center rounded-control bg-white px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-2">
            Ver cliente
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center rounded-control bg-white/10 px-3.5 text-[13px] text-white/80">Alerta de teste</span>
        )}
        {item.clientId ? (
          <button type="button" onClick={markDone} disabled={pending} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-control bg-white/10 px-3 text-[13px] font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50">
            <Check className="size-4" aria-hidden />
            Realizado
          </button>
        ) : null}
        <button type="button" onClick={onSnooze} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-control px-3 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
          <AlarmClock className="size-4" aria-hidden />
          Soneca 5 min
        </button>
      </div>
    </div>
  );
}
