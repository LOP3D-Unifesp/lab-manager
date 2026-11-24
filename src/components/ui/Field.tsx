import { ReactNode } from "react";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
};

// Rótulo + controle + dica/erro, com espaçamento padronizado.
export function Field({ children, className = "", error, hint, label }: FieldProps) {
  return (
    <label className={["grid gap-2 text-base font-semibold text-text", className].join(" ")}>
      {label}
      {children}
      {hint && !error ? <span className="text-sm font-normal text-muted">{hint}</span> : null}
      {error ? (
        <span role="alert" className="text-sm font-semibold text-danger-dark">
          {error}
        </span>
      ) : null}
    </label>
  );
}
