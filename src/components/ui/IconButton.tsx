import { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> & {
  label: string;
  children: ReactNode;
  tone?: "neutral" | "danger";
};

// Botão só com ícone: o rótulo é obrigatório (aria-label + tooltip) e a área de toque tem 44px.
export function IconButton({ children, className = "", label, tone = "neutral", type = "button", ...props }: IconButtonProps) {
  const toneClasses =
    tone === "danger" ? "text-danger-dark hover:bg-danger-soft" : "text-muted hover:bg-background hover:text-text";
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-60",
        toneClasses,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
