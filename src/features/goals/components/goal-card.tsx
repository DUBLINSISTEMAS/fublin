import Link from "next/link";
import { ArrowRight, Target, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatBRL, formatBRLCompact } from "@/lib/money";
import { periodDatesLabel, periodTitle } from "@/lib/quinzena";
import { plural } from "@/lib/text";
import { commissionCents, formatPercent } from "../commission";
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

type AppointmentsGoalProps = { created: number; previous: number; goal: number | null };

/** Sidebar: agendamentos marcados nesta semana contra a meta semanal, com a tendência vs. semana passada. */
export function AppointmentsGoalCard({ created, previous, goal }: AppointmentsGoalProps) {
  const percent = goal ? Math.round((created / goal) * 100) : 0;
  const delta = created - previous;
  return (
    <Link href="/metas#agendamentos" className="block rounded-card bg-surface-2 p-3.5 transition-colors hover:bg-surface-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Agendamentos · semana</span>
        <span className={cn("text-[11px] tabular-nums", delta > 0 ? "text-lime-ink" : delta < 0 ? "text-rose-ink" : "text-muted")}>{delta > 0 ? `+${delta}` : delta === 0 ? "=" : delta} vs. anterior</span>
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[22px] leading-none font-light tabular-nums tracking-tight text-ink">{created}</span>
        <span className="text-[12px] tabular-nums text-muted">{goal ? `de ${goal}` : "defina a meta"}</span>
      </div>
      <GoalBar percent={goal ? percent : 0} className="mt-2 h-1.5" />
    </Link>
  );
}

type HeroProps = { progress: PeriodProgress; ratePercent?: number; children?: React.ReactNode };

/** Versão grande (Hoje e Metas): números, barra, frase, o que falta e a comissão prevista. */
export function GoalHeroCard({ progress, ratePercent, children }: HeroProps) {
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
        <dl className="grid shrink-0 grid-cols-2 gap-x-5 gap-y-1 text-[13px] sm:grid-cols-4 sm:text-right">
          <dt className="text-muted">Cartas</dt>
          <dt className="text-muted">Faltam</dt>
          <dt className="text-muted">Dias</dt>
          <dt className="text-muted">Comissão</dt>
          <dd className="text-[20px] font-light tabular-nums text-ink">{progress.closedCount}</dd>
          <dd className="text-[20px] font-light tabular-nums text-ink">{progress.targetCents ? formatBRLCompact(progress.remainingCents) : "—"}</dd>
          <dd className="text-[20px] font-light tabular-nums text-ink">{progress.clock.daysLeft}</dd>
          <dd className="text-[20px] font-light tabular-nums text-lime-ink" title={ratePercent !== undefined ? `${formatPercent(ratePercent)} das cartas fechadas` : undefined}>
            {ratePercent !== undefined ? formatBRLCompact(commissionCents(progress.achievedCents, ratePercent)) : "—"}
          </dd>
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
export function GoalRow({ progress, ratePercent, href }: { progress: PeriodProgress; ratePercent?: number; href?: string }) {
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
        <p className="text-muted">
          {progress.targetCents ? `${progress.percent}% de ${formatBRLCompact(progress.targetCents)}` : "sem meta"}
          {ratePercent !== undefined && progress.achievedCents ? ` · ${formatBRLCompact(commissionCents(progress.achievedCents, ratePercent))} de comissão` : ""}
        </p>
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

type PayoutProps = { current: PeriodProgress; previous: PeriodProgress; ratePercent: number };

/** Recebimentos: comissão da quinzena atual e da anterior (a que cai no próximo pagamento). */
export function PayoutCard({ current, previous, ratePercent }: PayoutProps) {
  const now = commissionCents(current.achievedCents, ratePercent);
  const last = commissionCents(previous.achievedCents, ratePercent);
  return (
    <Card className="flex flex-col justify-between p-5">
      <div>
        <p className="flex items-center gap-2 text-[13px] font-medium text-muted">
          <Wallet className="size-4" aria-hidden />
          Recebimentos · {formatPercent(ratePercent)} por carta
        </p>
        <p className="mt-2 text-[30px] leading-none font-light tabular-nums tracking-tight text-ink">{formatBRL(now)}</p>
        <p className="mt-1 text-[13px] text-ink-2">
          nesta {periodTitle(current.period)} · {plural(current.closedCount, "carta")} · {formatBRLCompact(current.achievedCents)}
        </p>
      </div>
      <div className="mt-4 border-t border-line pt-3">
        <p className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="text-muted">
            {periodTitle(previous.period)} passada · {periodDatesLabel(previous.period)}
          </span>
          <span className="font-medium tabular-nums text-ink">{formatBRL(last)}</span>
        </p>
        <Link href="/metas" className="mt-2 inline-block text-[13px] font-medium text-accent hover:underline">
          Ver metas e histórico
        </Link>
      </div>
    </Card>
  );
}
