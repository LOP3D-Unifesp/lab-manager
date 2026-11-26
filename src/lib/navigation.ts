import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Boxes,
  CalendarPlus,
  Cpu,
  FolderKanban,
  Gauge,
  MessageSquare,
  History,
  LucideIcon,
  Settings,
  ShoppingCart,
  Sparkles,
  UserRoundCog,
  Users,
} from "lucide-react";

export type NavigationSection = "main" | "work" | "resources" | "people" | "admin" | "account";

// Títulos das seções do menu lateral (a seção principal e a da conta não têm título).
export const navigationSectionLabels: Record<NavigationSection, string | null> = {
  main: null,
  work: "Trabalho",
  resources: "Recursos",
  people: "Pessoas",
  admin: "Gestão",
  account: null,
};

export type NavigationItem = {
  desktopLabel: string;
  desktopSection: NavigationSection;
  desktopOrder: number;
  desktopRole?: "coordinator" | "researcher";
  mobileLabel: string;
  path: string;
  icon: LucideIcon;
  mobilePlacement: "primary" | "action" | "secondary" | "hidden";
  mobileOrder: number;
  mobileRole?: "coordinator" | "researcher";
};

export function getSafeInternalRedirect(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  const normalized = value.toLowerCase();
  if (value.includes("\\") || normalized.includes("%5c") || /[\u0000-\u001f]/.test(value)) {
    return "/";
  }

  return value;
}

export const navigationItems: NavigationItem[] = [
  {
    desktopLabel: "Início",
    desktopSection: "main",
    desktopOrder: 1,
    mobileLabel: "Início",
    path: "/",
    icon: Gauge,
    mobilePlacement: "primary",
    mobileOrder: 1,
  },
  {
    desktopLabel: "Indicadores",
    desktopSection: "work",
    desktopOrder: 5.5,
    mobileLabel: "Indicadores",
    path: "/analytics",
    icon: BarChart3,
    mobilePlacement: "secondary",
    mobileOrder: 1.5,
  },
  {
    desktopLabel: "Pesquisadores",
    desktopSection: "people",
    desktopOrder: 8,
    mobileLabel: "Pessoas",
    path: "/pesquisadores",
    icon: Users,
    mobilePlacement: "primary",
    mobileOrder: 4,
  },
  {
    desktopLabel: "Projetos",
    desktopSection: "work",
    desktopOrder: 5,
    mobileLabel: "Projetos",
    path: "/projetos",
    icon: FolderKanban,
    mobilePlacement: "secondary",
    mobileOrder: 1,
  },
  {
    desktopLabel: "Habilidades",
    desktopSection: "people",
    desktopOrder: 9,
    mobileLabel: "Habilidades",
    path: "/habilidades",
    icon: Sparkles,
    mobilePlacement: "secondary",
    mobileOrder: 5,
  },
  {
    desktopLabel: "Agenda",
    desktopSection: "work",
    desktopOrder: 2,
    mobileLabel: "Agenda",
    path: "/agenda",
    icon: CalendarDays,
    mobilePlacement: "primary",
    mobileOrder: 2,
  },
  {
    desktopLabel: "Equipamentos",
    desktopSection: "resources",
    desktopOrder: 6,
    mobileLabel: "Equipamentos",
    path: "/equipamentos",
    icon: Cpu,
    mobilePlacement: "secondary",
    mobileOrder: 3,
  },
  {
    desktopLabel: "Reservas",
    desktopSection: "work",
    desktopOrder: 3,
    mobileLabel: "Reservar",
    path: "/reservas",
    icon: CalendarPlus,
    mobilePlacement: "action",
    mobileOrder: 3,
  },
  {
    desktopLabel: "Minhas reservas",
    desktopSection: "work",
    desktopOrder: 4,
    desktopRole: "researcher",
    mobileLabel: "Minhas reservas",
    path: "/reservas/minhas",
    icon: CalendarCheck,
    mobilePlacement: "secondary",
    mobileOrder: 2,
    mobileRole: "researcher",
  },
  {
    desktopLabel: "Meu perfil",
    desktopSection: "account",
    desktopOrder: 1,
    mobileLabel: "Perfil",
    path: "/perfil",
    icon: UserRoundCog,
    mobilePlacement: "hidden",
    mobileOrder: 1,
  },
  {
    desktopLabel: "Inventário",
    desktopSection: "resources",
    desktopOrder: 7,
    mobileLabel: "Inventário",
    path: "/inventario",
    icon: Boxes,
    mobilePlacement: "secondary",
    mobileOrder: 4,
  },
  {
    desktopLabel: "Compras",
    desktopSection: "resources",
    desktopOrder: 7.5,
    mobileLabel: "Compras",
    path: "/compras",
    icon: ShoppingCart,
    mobilePlacement: "secondary",
    mobileOrder: 4.5,
  },
  {
    desktopLabel: "Usuários",
    desktopSection: "admin",
    desktopOrder: 10,
    desktopRole: "coordinator",
    mobileLabel: "Usuários",
    path: "/usuarios",
    icon: Users,
    mobilePlacement: "secondary",
    mobileOrder: 6,
    mobileRole: "coordinator",
  },
  {
    desktopLabel: "Sugestões",
    desktopSection: "admin",
    desktopOrder: 12,
    desktopRole: "coordinator",
    mobileLabel: "Sugestões",
    path: "/feedback",
    icon: MessageSquare,
    mobilePlacement: "secondary",
    mobileOrder: 7.5,
    mobileRole: "coordinator",
  },
  {
    desktopLabel: "Configurações",
    desktopSection: "admin",
    desktopOrder: 13,
    desktopRole: "coordinator",
    mobileLabel: "Configurações",
    path: "/administracao",
    icon: Settings,
    mobilePlacement: "secondary",
    mobileOrder: 8,
    mobileRole: "coordinator",
  },
  {
    desktopLabel: "Histórico de reservas",
    desktopSection: "admin",
    desktopOrder: 11,
    desktopRole: "coordinator",
    mobileLabel: "Histórico",
    path: "/reservas/historico",
    icon: History,
    mobilePlacement: "secondary",
    mobileOrder: 7,
    mobileRole: "coordinator",
  },
];

export const mobilePrimaryNavigationItems = navigationItems
  .filter((item) => item.mobilePlacement === "primary")
  .sort((a, b) => a.mobileOrder - b.mobileOrder);

export const mobileActionNavigationItem = navigationItems.find(
  (item) => item.mobilePlacement === "action",
);

export const mobileSecondaryNavigationItems = navigationItems
  .filter((item) => item.mobilePlacement === "secondary")
  .sort((a, b) => a.mobileOrder - b.mobileOrder);
