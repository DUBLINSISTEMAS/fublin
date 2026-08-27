import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatBRL, formatBRLCompact } from "@/lib/money";
import { periodDatesLabel, periodTitle } from "@/lib/quinzena";
import { plural } from "@/lib/text";
import { motivationFor } from "../motivation";
import type { PeriodProgress } from "../queries";

const TONE_TEXT = { success: "text-lime-ink", warning: "text-sun-ink", info: "text-accent-ink", neutral: "text-ink-2" } as const;

/** Barra de progresso da meta: azul enquanto corre, limão quando bate. */
export function GoalBar({ percent, className }: { percent: number; className?: string }) {
  const done = percent >= 100;
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-surface-3", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(percent, 100)}>
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", done ? "bg-lime" : "bg-accent")} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}

/** Versão da sidebar: pouco espaço, a frase que importa e o link para a página. */
export function GoalSidebarCard({ progress }: { progress: PeriodProgress }) {
  const m = motivationFor(progress);
  return (
    <Link href="/metas" className="block rounded-card bg-surface-2 p-3.5 transition-colors hover:bg-surface-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Meta · {periodTitle(progress.period)}</span>
        <span className="text-[11px] text-muted">{plural(progress.clock.daysLeft, "dia")}</span>
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[22px] leading-none font-light tabular-nums tracking-tight text-ink">{progress.targetCents ? `${Math.min(progress.percent, 999)}%` : formatBRLCompact(progress.achievedCents)}</span>
        {progress.targetCents ? <span className="text-[12px] tabular-nums text-muted">de {formatBRLCompact(progress.targetCents)}</span> : null}
      </div>
      <GoalBar percent={progress.percent} className="mt-2 h-1.5" />
      <p className={cn("mt-2 line-clamp-2 text-[12px] leading-snug", TONE_TEXT[m.tone])}>{m.headline}</p>
    </Link>
  );
}

/** Versão grande (Hoje e Metas): números, barra, frase e o que falta. */
export function GoalHeroCard({ progress, children }: { progress: PeriodProgress; children?: React.ReactNode }) {
  const m = motivationFor(progress);
  const done = progress.targetCents !== null && progress.achievedCents >= progress.targetCents;
  return (
    <Card className={cn("p-5 md:p-6", done && "bg-lime-soft")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-medium text-muted">
            <Target className="size-4" aria-hidden />
            Meta da {periodTitle(progress.period)} · {periodDatesLabel(progress.period)}
          </p>
          <p className="mt-2 text-[34px] leading-none font-light tabular-nums tracking-tight text-ink md:text-[40px]">
            {formatBRLCompact(progress.achievedCents)}
            {progress.targetCents ? <span className="text-[18px] text-muted md:text-[20px]"> de {formatBRLCompact(progress.targetCents)}</span> : null}
          </p>
          <p className={cn("mt-3 text-[17px] font-medium", TONE_TEXT[m.tone])}>{m.headline}</p>
          <p className="mt-0.5 text-[14px] text-ink-2">{m.detail}</p>
        </div>
        <dl className="grid shrink-0 grid-cols-3 gap-x-5 gap-y-1 text-[13px] sm:text-right">
          <dt className="text-muted sm:col-start-1">Cartas</dt>
          <dt className="text-muted">Faltam</dt>
          <dt className="text-muted">Dias</dt>
          <dd className="text-[20px] font-light tabular-nums text-ink">{progress.closedCount}</dd>
          <dd className="text-[20px] font-light tabular-nums text-ink">{progress.targetCents ? formatBRLCompact(progress.remainingCents) : "—"}</dd>
          <dd className="text-[20px] font-light tabular-nums text-ink">{progress.clock.daysLeft}</dd>
        </dl>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <GoalBar percent={progress.percent} className="flex-1" />
        <span className="w-12 text-right text-[13px] font-medium tabular-nums text-ink">{progress.targetCents ? `${progress.percent}%` : ""}</span>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </Card>
  );
}

/** Linha de resumo para listas (histórico, produção). */
export function GoalRow({ progress, href }: { progress: PeriodProgress; href?: string }) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-ink">
          {periodTitle(progress.period)} <span className="font-normal text-muted">· {periodDatesLabel(progress.period)}</span>
        </p>
        <GoalBar percent={progress.percent} className="mt-2 h-1.5" />
      </div>
      <div className="w-44 shrink-0 text-right text-[13px] tabular-nums">
        <p className="font-medium text-ink">{formatBRL(progress.achievedCents)}</p>
        <p className="text-muted">{progress.targetCents ? `${progress.percent}% de ${formatBRLCompact(progress.targetCents)}` : "sem meta"}</p>
      </div>
      {href ? <ArrowRight className="size-4 shrink-0 text-faint" aria-hidden /> : null}
    </>
  );
  const className = "flex items-center gap-4 px-4 py-3";
  return href ? (
    <Link href={href} className={cn(className, "transition-colors hover:bg-surface-2")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
