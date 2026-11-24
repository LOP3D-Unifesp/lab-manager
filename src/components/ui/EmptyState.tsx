import { ReactNode } from "react";

export function EmptyState({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children?: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background px-5 py-8 text-center">
      <p className="text-lg font-bold text-text">{title}</p>
      {children ? <p className="mt-1 text-base text-muted">{children}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
