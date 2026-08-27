import { Briefcase, CalendarDays, Paperclip, StickyNote, Tag, UserRound, type LucideIcon } from "lucide-react";
import { formatDate, formatTime, fromIso } from "@/lib/dates";
import type { ActivityType } from "@/lib/domain";
import type { ActivityItem } from "../queries";

const ICONS: Record<ActivityType, LucideIcon> = {
  nota: StickyNote,
  status: Tag,
  agendamento: CalendarDays,
  cliente: UserRound,
  anexo: Paperclip,
  lider: Briefcase,
};

export function Timeline({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return <p className="text-sm text-muted">Sem histórico ainda.</p>;
  return (
    <ol className="relative space-y-4 border-l border-line pl-6">
      {items.map((item) => {
        const Icon = ICONS[item.type];
        const at = fromIso(item.createdAt);
        return (
          <li key={item.id} className="relative">
            <span className="absolute top-0.5 -left-[31px] grid size-5 place-items-center rounded-full bg-accent-soft text-accent-ink">
              <Icon className="size-3" aria-hidden />
            </span>
            <p className={item.type === "nota" ? "text-[15px] whitespace-pre-wrap text-ink" : "text-sm text-ink-2"}>{item.content}</p>
            <p className="mt-0.5 text-xs tabular-nums text-faint">
              {formatDate(at)} · {formatTime(at)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
