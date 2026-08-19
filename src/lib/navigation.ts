import {
  CalendarDays,
  CalendarPlus,
  Gauge,
  LucideIcon,
  Printer,
  Settings,
  Sparkles,
  UserRoundCog,
  Users,
} from "lucide-react";

export type NavigationItem = {
  desktopLabel: string;
  desktopSection: "main" | "knowledge" | "management" | "account";
  desktopOrder: number;
  desktopRole?: "coordinator";
  mobileLabel: string;
  path: string;
  icon: LucideIcon;
  mobilePlacement: "primary" | "action" | "secondary" | "hidden";
  mobileOrder: number;
  mobileRole?: "coordinator";
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
    desktopLabel: "Dashboard",
    desktopSection: "main",
    desktopOrder: 1,
    mobileLabel: "Início",
    path: "/",
    icon: Gauge,
    mobilePlacement: "primary",
    mobileOrder: 1,
  },
  {
    desktopLabel: "Pesquisadores",
    desktopSection: "main",
    desktopOrder: 4,
    mobileLabel: "Pessoas",
    path: "/pesquisadores",
    icon: Users,
    mobilePlacement: "primary",
    mobileOrder: 4,
  },
  {
    desktopLabel: "Habilidades",
    desktopSection: "knowledge",
    desktopOrder: 5,
    mobileLabel: "Habilidades",
    path: "/habilidades",
    icon: Sparkles,
    mobilePlacement: "secondary",
    mobileOrder: 2,
  },
  {
    desktopLabel: "Agenda do Laboratório",
    desktopSection: "main",
    desktopOrder: 2,
    mobileLabel: "Agenda",
    path: "/agenda",
    icon: CalendarDays,
    mobilePlacement: "primary",
    mobileOrder: 2,
  },
  {
    desktopLabel: "Impressoras",
    desktopSection: "management",
    desktopOrder: 6,
    mobileLabel: "Impressoras",
    path: "/impressoras",
    icon: Printer,
    mobilePlacement: "secondary",
    mobileOrder: 3,
  },
  {
    desktopLabel: "Reservas",
    desktopSection: "main",
    desktopOrder: 3,
    mobileLabel: "Reservar",
    path: "/reservas",
    icon: CalendarPlus,
    mobilePlacement: "action",
    mobileOrder: 3,
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
    desktopLabel: "Usuários",
    desktopSection: "management",
    desktopOrder: 7,
    desktopRole: "coordinator",
    mobileLabel: "Usuários",
    path: "/usuarios",
    icon: Users,
    mobilePlacement: "secondary",
    mobileOrder: 4,
    mobileRole: "coordinator",
  },
  {
    desktopLabel: "Administração",
    desktopSection: "management",
    desktopOrder: 8,
    desktopRole: "coordinator",
    mobileLabel: "Administração",
    path: "/administracao",
    icon: Settings,
    mobilePlacement: "secondary",
    mobileOrder: 5,
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
