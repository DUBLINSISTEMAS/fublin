import Link from "next/link";
import { Plus } from "lucide-react";

/** Botão flutuante só no mobile; no desktop as ações ficam na barra superior. */
export function Fab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="fixed right-4 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-30 grid size-14 place-items-center rounded-full bg-accent text-white shadow-float transition-colors duration-150 hover:bg-accent-strong md:hidden"
    >
      <Plus className="size-6" aria-hidden />
    </Link>
  );
}
