import { Link } from "react-router-dom";

import { useT } from "../../i18n";
import type { DecisionItem } from "../../lib/inicio";
import { Card } from "../ui/Card";

// "Precisa da sua decisão": só aparece quando há algo esperando a pessoa (reservas, compras, chamados, pedidos de entrada, sugestões).
export function DecisionCard({ items }: { items: DecisionItem[] }) {
  const t = useT();
  if (items.length === 0) return null;

  return (
    <Card className="border-warning p-4 sm:p-5">
      <h3 className="mb-3 text-xl font-bold text-text">{t("home.decisions")}</h3>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <li key={item.key}>
            <Link to={item.to} className="flex h-full items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition hover:border-primary">
              <span className="min-w-0">
                <span className="block text-base font-bold text-text">{t(`home.decision.${item.key}`)}</span>
                {item.urgent > 0 ? <span className="block text-sm font-semibold text-danger-dark">{t("home.urgentCount", { count: item.urgent })}</span> : null}
              </span>
              <span className="font-display text-3xl font-bold leading-none text-primary-dark">{item.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
