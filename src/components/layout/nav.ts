import { BadgeCheck, Briefcase, CalendarDays, House, KeyRound, Menu, Settings, Target, Users, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; /** Rotas extras que contam como "ativas" para este item. */ also?: string[] };

/** Sidebar (desktop). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Hoje", icon: House },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/aprovados", label: "Aprovados", icon: BadgeCheck },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/lideres", label: "Líderes", icon: Briefcase },
  { href: "/acessos", label: "Acessos", icon: KeyRound },
  { href: "/config", label: "Config", icon: Settings },
];

/** Tab bar (mobile): no máximo 5 itens; o resto fica em "Mais". */
export const MOBILE_TABS: NavItem[] = [
  { href: "/", label: "Hoje", icon: House },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/mais", label: "Mais", icon: Menu, also: ["/aprovados", "/lideres", "/config"] },
];

export function isNavActive(item: NavItem, pathname: string): boolean {
  const matches = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  return matches(item.href) || (item.also ?? []).some(matches);
}
