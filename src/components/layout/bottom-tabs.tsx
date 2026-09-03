"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, CalendarRange } from "lucide-react";
import { cn } from "@/lib/cn";
import type { UserRole } from "@/lib/domain";
import { isNavActive, MOBILE_TABS } from "./nav";

export function BottomTabs({ role = "admin" }: { role?: UserRole }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (role === "leader") {
    const period = searchParams.get("agenda");
    const items = [
      { href: "/clientes", label: "Carteira", icon: BriefcaseBusiness, active: pathname === "/clientes" && !period },
      { href: "/clientes?agenda=today", label: "Hoje", icon: CalendarDays, active: pathname === "/clientes" && period === "today" },
      { href: "/clientes?agenda=week", label: "Semana", icon: CalendarRange, active: pathname === "/clientes" && period === "week" },
    ];
    return (
      <nav aria-label="Carteira" className="safe-bottom fixed inset-x-3 bottom-3 z-30 rounded-[20px] glass-bar md:hidden print:hidden">
        <ul className="grid grid-cols-3 p-1.5">
          {items.map(({ href, label, icon: Icon, active }) => <li key={href}><Link href={href} aria-current={active ? "page" : undefined} className={cn("tap-scale flex h-12 items-center justify-center gap-2 rounded-[14px] text-[12px] font-medium", active ? "bg-dark text-white shadow-card" : "text-muted")}><Icon className="size-[18px]" aria-hidden />{label}</Link></li>)}
        </ul>
      </nav>
    );
  }
  return (
    <nav aria-label="Principal" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden print:hidden">
      <ul className="grid grid-cols-5">
        {MOBILE_TABS.map((item) => {
          const { href, label, icon: Icon } = item;
          const active = isNavActive(item, pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
                  active ? "text-accent" : "text-muted hover:text-ink",
                )}
              >
                <span className={cn("grid h-7 w-11 place-items-center rounded-full transition-colors", active && "bg-accent-soft")}>
                  <Icon className="size-[20px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
