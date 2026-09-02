import { Briefcase, CalendarDays, Paperclip, StickyNote, Tag, UserRound, type LucideIcon } from "lucide-react";
import { formatDate, formatTime, fromIso } from "@/lib/dates";
import type { ActivityType } from "@/lib/domain";
import type { ActivityItem } from "../queries";
import { initials } from "@/lib/text";

const ICONS: Record<ActivityType, LucideIcon> = {
  nota: StickyNote,
  status: Tag,
  agendamento: CalendarDays,
  cliente: UserRound,
  anexo: Paperclip,
  lider: Briefcase,
};

export function Timeline({ items, currentUserId }: { items: ActivityItem[]; currentUserId?: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">Sem histórico ainda.</p>;
  return (
    <ol className="space-y-3">
      {items.map((item) => {
        const Icon = ICONS[item.type];
        const at = fromIso(item.createdAt);
        const authoredNote = item.type === "nota" && item.authorName;
        const mine = authoredNote && item.authorUserId === currentUserId;
        if (authoredNote) {
          return (
            <li key={item.id} className={mine ? "flex flex-row-reverse items-start gap-2.5" : "flex items-start gap-2.5"}>
              <span className={mine ? "grid size-8 shrink-0 place-items-center rounded-full bg-dark text-[10px] font-semibold text-white" : "grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent-ink"}>{initials(item.authorName!)}</span>
              <div className={mine ? "max-w-[85%] rounded-[18px] rounded-tr-md bg-dark px-3.5 py-2.5 text-white sm:max-w-[72%]" : "max-w-[85%] rounded-[18px] rounded-tl-md bg-surface-2 px-3.5 py-2.5 text-ink sm:max-w-[72%]"}>
                <div className="flex items-baseline justify-between gap-4"><p className={mine ? "text-[11px] font-semibold text-white/70" : "text-[11px] font-semibold text-accent-ink"}>{mine ? "Você" : item.authorName}</p><time className={mine ? "text-[10px] tabular-nums text-white/50" : "text-[10px] tabular-nums text-faint"}>{formatDate(at)} · {formatTime(at)}</time></div>
                <p className="mt-1 text-[14px] leading-relaxed whitespace-pre-wrap">{item.content}</p>
              </div>
            </li>
          );
        }
        return (
          <li key={item.id} className="relative ml-2 border-l border-line py-1 pl-7 last:border-transparent">
            <span className="absolute top-1 -left-[11px] grid size-5 place-items-center rounded-full bg-accent-soft text-accent-ink ring-4 ring-surface">
              <Icon className="size-3" aria-hidden />
            </span>
            <p className={item.type === "nota" ? "text-[15px] whitespace-pre-wrap text-ink" : "text-sm text-ink-2"}>{item.content}</p>
            <p className="mt-0.5 text-xs tabular-nums text-faint">
              {item.authorName ? `${item.authorName} · ` : ""}{formatDate(at)} · {formatTime(at)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
