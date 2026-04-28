import { LucideIcon } from "lucide-react";

import { Card } from "./Card";
import { StatusBadge, StatusVariant } from "./StatusBadge";

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  status?: {
    label: string;
    variant: StatusVariant;
  };
};

export function StatCard({
  description,
  icon: Icon,
  status,
  title,
  value,
}: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-muted">{title}</p>
          <p className="mt-2 text-[34px] font-bold leading-none text-text">
            {value}
          </p>
        </div>
        <div className="rounded-lg bg-primary-soft p-3 text-primary-dark">
          <Icon aria-hidden="true" className="h-6 w-6" />
        </div>
      </div>
      <p className="mt-4 text-base leading-6 text-muted">{description}</p>
      {status ? (
        <div className="mt-4">
          <StatusBadge label={status.label} variant={status.variant} />
        </div>
      ) : null}
    </Card>
  );
}
