import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = { icon: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string };

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center rounded-card bg-surface px-6 py-12 text-center shadow-card", className)}>
      <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-[17px] font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[14px] text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
