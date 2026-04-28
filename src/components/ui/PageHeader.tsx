import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({ action, description, title }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-[30px] font-bold leading-tight text-text md:text-[32px]">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-lg leading-7 text-muted">
          {description}
        </p>
      </div>
      {action ? <div className="w-full md:w-auto">{action}</div> : null}
    </div>
  );
}
