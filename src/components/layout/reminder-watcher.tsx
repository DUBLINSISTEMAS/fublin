"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import type { ReminderItem } from "@/features/appointments/queries";
import { formatWhen } from "@/lib/dates";
import { APPOINTMENT_KIND_LABELS } from "@/lib/domain";

const POLL_MS = 60_000;
const STORAGE_KEY = "relacionador:notified";
const KEEP_MS = 2 * 24 * 60 * 60 * 1000;

type Notified = Record<string, number>;

function readNotified(): Notified {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: Notified = raw ? JSON.parse(raw) : {};
    const cutoff = Date.now() - KEEP_MS;
    return Object.fromEntries(Object.entries(parsed).filter(([, ts]) => ts > cutoff));
  } catch {
    return {};
  }
}

function writeNotified(value: Notified) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível: seguimos só com o aviso in-app */
  }
}

function describe(item: ReminderItem): { title: string; body: string } {
  return {
    title: `${APPOINTMENT_KIND_LABELS[item.kind]}: ${item.clientName}`,
    body: formatWhen(new Date(item.scheduledAt)),
  };
}

/**
 * Consulta /api/reminders a cada minuto; quando um agendamento entra na janela
 * de lembrete, mostra um aviso in-app e (se permitido) uma notificação do sistema.
 */
export function ReminderWatcher() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<ReminderItem[]>([]);
  const notified = useRef<Notified>({});

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders", { cache: "no-store" });
      if (!res.ok) return;
      const data: { items: ReminderItem[] } = await res.json();
      const fresh = data.items.filter((i) => i.due && !notified.current[i.id]);
      if (fresh.length === 0) return;
      for (const item of fresh) notified.current[item.id] = Date.now();
      writeNotified(notified.current);
      setAlerts((prev) => [...prev, ...fresh]);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        for (const item of fresh) {
          const { title, body } = describe(item);
          const n = new Notification(title, { body, tag: item.id, icon: "/icon.svg" });
          n.onclick = () => {
            window.focus();
            router.push(`/clientes/${item.clientId}`);
            n.close();
          };
        }
      }
    } catch {
      /* rede indisponível: tenta de novo no próximo ciclo */
    }
  }, [router]);

  useEffect(() => {
    notified.current = readNotified();
    void check();
    const timer = window.setInterval(check, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  if (alerts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-50 flex flex-col gap-2 md:inset-x-auto md:right-4 md:bottom-4 md:w-96"
      role="status"
      aria-live="polite"
    >
      {alerts.map((item) => {
        const { title, body } = describe(item);
        return (
          <div key={item.id} className="animate-rise pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-float">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
              <Bell className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{title}</p>
              <p className="text-[13px] text-muted">{body}</p>
              <Link href={`/clientes/${item.clientId}`} className="mt-1.5 inline-block text-[13px] font-medium text-accent hover:underline">
                Ver cliente
              </Link>
            </div>
            <button
              type="button"
              aria-label="Dispensar aviso"
              onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== item.id))}
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
