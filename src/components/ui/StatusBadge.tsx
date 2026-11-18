export type StatusVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

type StatusBadgeProps = {
  label: string;
  variant?: StatusVariant;
};

const variantClasses: Record<StatusVariant, string> = {
  neutral: "border-border bg-background text-muted",
  success: "border-success bg-success-soft text-success-dark",
  warning: "border-warning-dark bg-warning text-text",
  danger: "border-danger bg-danger-soft text-danger-dark",
  info: "border-primary bg-primary-soft text-primary-dark",
};

export function StatusBadge({
  label,
  variant = "neutral",
}: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1 text-base font-semibold leading-none",
        variantClasses[variant],
      ].join(" ")}
    >
      {label}
    </span>
  );
}
