import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Controles com preenchimento cinza e sem borda (foco em azul), como na referência. */
export const controlClasses =
  "w-full rounded-control border border-transparent bg-surface-2 px-4 text-[15px] text-ink placeholder:text-faint transition-colors duration-150 hover:bg-surface-3 focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/15 aria-[invalid=true]:border-rose-ink/40 aria-[invalid=true]:bg-rose/40 disabled:opacity-60";

const CHEVRON =
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[position:right_0.9rem_center] bg-no-repeat";

type FieldProps = {
  label: ReactNode;
  htmlFor: string;
  error?: string[] | string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-2">
        {label}
        {required ? (
          <span className="ml-0.5 text-rose-ink" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {message ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-[13px] text-rose-ink">
          {message}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type Invalid = { invalid?: boolean };

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & Invalid) {
  return <input aria-invalid={invalid || undefined} className={cn(controlClasses, "h-12", className)} {...props} />;
}

export function Select({ className, invalid, children, ...props }: ComponentProps<"select"> & Invalid) {
  return (
    <select aria-invalid={invalid || undefined} className={cn(controlClasses, CHEVRON, "h-12 appearance-none pr-10", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, invalid, ...props }: ComponentProps<"textarea"> & Invalid) {
  return <textarea aria-invalid={invalid || undefined} className={cn(controlClasses, "min-h-24 py-3 leading-relaxed", className)} {...props} />;
}
