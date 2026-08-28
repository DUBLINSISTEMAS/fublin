"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isNavActive, MOBILE_TABS } from "./nav";

export function BottomTabs() {
  const pathname = usePathname();
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
