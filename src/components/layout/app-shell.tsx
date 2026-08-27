import { Suspense, type ReactNode } from "react";
import { BottomTabs } from "./bottom-tabs";
import { ReminderWatcher } from "./reminder-watcher";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

/**
 * Moldura do app: canvas cinza-azulado com painéis brancos flutuantes.
 * Desktop: sidebar fixa (240px) + barra de busca no topo. Mobile: tab bar no rodapé.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:p-4">
      <Sidebar />
      <div className="min-h-dvh md:min-h-[calc(100dvh-2rem)] md:pl-[calc(15rem+1rem)]">
        <Suspense fallback={<div className="panel h-16 max-md:rounded-none" />}>
          <TopBar />
        </Suspense>
        <main className="px-4 pt-4 pb-28 sm:px-5 md:px-0 md:pt-4 md:pb-8">{children}</main>
      </div>
      <BottomTabs />
      <ReminderWatcher />
    </div>
  );
}
