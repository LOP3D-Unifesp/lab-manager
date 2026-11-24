import { ReactNode } from "react";

type AlertVariant = "error" | "success" | "warning" | "info";

const variantClasses: Record<AlertVariant, string> = {
  error: "border-danger bg-danger-soft text-danger-dark",
  success: "border-success bg-success-soft text-success-dark",
  warning: "border-warning-dark bg-warning-soft text-warning-dark",
  info: "border-primary bg-primary-soft text-primary-dark",
};

export function Alert({
  children,
  className = "",
  variant = "error",
}: {
  children: ReactNode;
  className?: string;
  variant?: AlertVariant;
}) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={["rounded-lg border px-4 py-3 text-base font-semibold", variantClasses[variant], className].join(" ")}
    >
      {children}
    </div>
  );
}
