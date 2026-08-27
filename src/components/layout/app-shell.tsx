import type { ReactNode } from "react";
import { BottomTabs } from "./bottom-tabs";
import { ReminderWatcher } from "./reminder-watcher";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <main className="min-h-dvh pb-24 md:pb-12 md:pl-60">
        <div className="mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6 md:px-10 md:pt-10">{children}</div>
      </main>
      <BottomTabs />
      <ReminderWatcher />
    </div>
  );
}
