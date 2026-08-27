"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { isNavActive, NAV_ITEMS } from "./nav";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface md:flex">
      <div className="px-6 pt-7 pb-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-white">R</span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">Relacionador</span>
        </Link>
        <p className="mt-2 text-xs text-muted">Seus clientes, sua agenda.</p>
      </div>
      <nav aria-label="Principal" className="flex-1 px-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                    active ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={active ? 2.25 : 2} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4">
        <Link
          href="/clientes/novo"
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-ink text-sm font-semibold text-white shadow-card transition-colors duration-150 hover:bg-ink-2"
        >
          <Plus className="size-4" aria-hidden />
          Novo cliente
        </Link>
      </div>
    </aside>
  );
}
