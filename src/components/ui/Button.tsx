import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary-dark text-white hover:bg-primary dark:bg-primary dark:hover:bg-primary/85",
  secondary:
    "border border-primary bg-surface text-primary hover:bg-primary-soft",
  success: "bg-success-dark text-white hover:bg-success dark:bg-success dark:hover:bg-success/85",
  warning: "bg-warning text-[#102033] hover:bg-warning/80",
  danger: "bg-danger text-white hover:bg-danger-dark dark:hover:bg-danger/85",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
};

export function Button({
  children,
  className = "",
  fullWidth = false,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
