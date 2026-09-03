import { Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toast";
import { BottomTabs } from "./bottom-tabs";
import { ReminderWatcher } from "./reminder-watcher";
import { Shortcuts } from "./shortcuts";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { currentUser } from "@/features/auth/session";
import { LiveRefresh } from "./live-refresh";

/**
 * Moldura do app: canvas cinza-azulado com painéis brancos flutuantes.
 * Desktop: sidebar fixa (240px) + barra de busca no topo. Mobile: tab bar no rodapé.
 */
export async function AppShell({ children }: { children: ReactNode }) {
  const user = await currentUser();
  // A rota /entrar usa somente o layout raiz; páginas protegidas validam a sessão no servidor.
  if (!user) return <>{children}</>;
  return (
    <div data-zoom-root className="min-h-dvh md:p-4 print:p-0">
      <Sidebar user={user} />
      <div className="min-h-dvh md:min-h-[calc(100dvh-2rem)] md:pl-[calc(15rem+1rem)] print:pl-0">
        <Suspense fallback={<div className="panel h-16 max-md:rounded-none" />}>
          <TopBar role={user.role} />
        </Suspense>
        <main className="px-4 pt-4 pb-28 sm:px-5 md:px-0 md:pt-4 md:pb-8 print:p-0">{children}</main>
      </div>
      <BottomTabs role={user.role} />
      {/* Os lembretes (rota só do admin) ficam com quem agenda; um líder não ficaria batendo num 403 a cada 30 s. */}
      {user.role === "admin" ? <ReminderWatcher userId={user.id} /> : null}
      <LiveRefresh />
      <Shortcuts />
      <Toaster />
    </div>
  );
}
