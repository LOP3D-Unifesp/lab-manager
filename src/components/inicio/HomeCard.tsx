import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useT } from "../../i18n";
import { Card } from "../ui/Card";

type HomeCardProps = {
  title: string;
  /** Página dona do assunto; mostra o "Ver tudo". */
  to?: string;
  children: ReactNode;
  className?: string;
};

// Moldura dos cartões da Inicial: título, "Ver tudo" e conteúdo enxuto.
export function HomeCard({ children, className = "", title, to }: HomeCardProps) {
  const t = useT();
  return (
    <Card className={`h-full min-w-0 p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-xl font-bold text-text">{title}</h3>
        {to ? (
          <Link className="shrink-0 text-sm font-semibold text-primary hover:text-primary-dark" to={to}>
            {t("home.seeAll")}
          </Link>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

export function HomeEmpty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border bg-background p-3 text-base text-muted">{children}</p>;
}
