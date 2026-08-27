"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isNavActive, NAV_ITEMS } from "./nav";

/** Lista de navegação da sidebar (client só para saber a rota ativa). */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isNavActive(href, pathname);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors duration-150",
                active ? "bg-surface-2 font-medium text-ink" : "font-normal text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className="size-[19px]" strokeWidth={active ? 2 : 1.75} aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
