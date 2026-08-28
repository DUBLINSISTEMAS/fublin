import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  title: ReactNode;
  /** Texto pequeno acima do título; com `backHref`, vira o link de voltar. */
  eyebrow?: ReactNode;
  backHref?: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Cabeçalho de página: setinha de voltar, título grande e leve, ações à direita. */
export function PageHeader({ title, eyebrow, backHref, description, actions, className }: Props) {
  return (
    <header className={cn("mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 md:mb-6", className)}>
      <div className="min-w-0">
        {backHref ? (
          <Link href={backHref} className="mb-1 inline-flex h-8 items-center gap-1 rounded-full pr-2 text-[13px] font-medium text-muted transition-colors hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden />
            {eyebrow ?? "Voltar"}
          </Link>
        ) : eyebrow ? (
          <p className="mb-1 text-[13px] font-medium text-muted">{eyebrow}</p>
        ) : null}
        <h1 className="text-[26px] font-medium tracking-tight text-ink md:text-[30px]">{title}</h1>
        {description ? <p className="mt-1 text-[14px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
