import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type NotificationItemProps = {
  to: string;
  icon: LucideIcon;
  title: string;
  /** Linhas de detalhe (equipamento, motivo, quem decidiu...). */
  children?: ReactNode;
  /** Selo à direita do título (status, "2 urgentes"). */
  badge?: ReactNode;
  /** Texto de tempo relativo, ex.: "há 2 h". */
  time?: string;
  /** Mostra o ponto de "novo". */
  unread?: boolean;
  onNavigate?: () => void;
};

// Linha clicável de notificação: ícone, título, selo, detalhes e tempo. Usada no sino e nas listas de histórico.
export function NotificationItem({ badge, children, icon: Icon, onNavigate, time, title, to, unread = false }: NotificationItemProps) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="relative flex min-h-11 items-start gap-2.5 rounded-md px-3 py-2 text-sm leading-tight transition hover:bg-primary-soft"
    >
      <span className="relative mt-0.5 shrink-0 text-muted">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {unread ? <span aria-hidden="true" className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent" /> : null}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex items-start justify-between gap-2">
          <span className={["min-w-0 break-words text-text", unread ? "font-bold" : "font-semibold"].join(" ")}>{title}</span>
          {badge ? <span className="shrink-0">{badge}</span> : null}
        </span>
        {children}
        {time ? <span className="text-xs text-muted">{time}</span> : null}
      </span>
    </Link>
  );
}
