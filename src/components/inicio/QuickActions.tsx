import { CalendarPlus, FolderKanban, ShoppingCart, Wrench, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { useT } from "../../i18n";

const linkClass =
  "flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-base font-semibold text-text transition hover:border-primary hover:text-primary";

function ActionLink({ icon: Icon, label, to }: { icon: LucideIcon; label: string; to: string }) {
  return (
    <Link className={linkClass} to={to}>
      <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      {label}
    </Link>
  );
}

// Atalhos para o que a pessoa mais faz: leva para a página onde a ação começa.
export function QuickActions() {
  const t = useT();

  return (
    <nav aria-label={t("home.quickActions")} className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <ActionLink icon={CalendarPlus} label={t("home.actionBooking")} to="/reservas" />
      <ActionLink icon={FolderKanban} label={t("home.actionProjects")} to="/projetos" />
      <ActionLink icon={ShoppingCart} label={t("home.actionPurchase")} to="/compras" />
      <ActionLink icon={Wrench} label={t("home.actionRequest")} to="/equipamentos?vista=chamados" />
    </nav>
  );
}
