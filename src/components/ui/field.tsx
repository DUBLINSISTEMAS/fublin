import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const controlClasses =
  "w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-faint transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/15 disabled:bg-surface-2";

const CHEVRON =
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2357534e%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[position:right_0.75rem_center] bg-no-repeat";

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
          <span className="ml-0.5 text-red-600" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {message ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-[13px] text-red-600">
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
  return <input aria-invalid={invalid || undefined} className={cn(controlClasses, "h-11", className)} {...props} />;
}

export function Select({ className, invalid, children, ...props }: ComponentProps<"select"> & Invalid) {
  return (
    <select aria-invalid={invalid || undefined} className={cn(controlClasses, CHEVRON, "h-11 appearance-none pr-10", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, invalid, ...props }: ComponentProps<"textarea"> & Invalid) {
  return <textarea aria-invalid={invalid || undefined} className={cn(controlClasses, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}
