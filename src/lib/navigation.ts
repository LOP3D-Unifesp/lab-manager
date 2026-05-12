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
  mobileLabel: string;
  path: string;
  icon: LucideIcon;
  mobilePlacement: "primary" | "action" | "secondary";
  mobileOrder: number;
  mobileRole?: "coordinator";
};

export const navigationItems: NavigationItem[] = [
  {
    desktopLabel: "Dashboard",
    mobileLabel: "Início",
    path: "/",
    icon: Gauge,
    mobilePlacement: "primary",
    mobileOrder: 1,
  },
  {
    desktopLabel: "Pesquisadores",
    mobileLabel: "Pessoas",
    path: "/pesquisadores",
    icon: Users,
    mobilePlacement: "primary",
    mobileOrder: 4,
  },
  {
    desktopLabel: "Habilidades",
    mobileLabel: "Habilidades",
    path: "/habilidades",
    icon: Sparkles,
    mobilePlacement: "secondary",
    mobileOrder: 2,
  },
  {
    desktopLabel: "Agenda do Laboratório",
    mobileLabel: "Agenda",
    path: "/agenda",
    icon: CalendarDays,
    mobilePlacement: "primary",
    mobileOrder: 2,
  },
  {
    desktopLabel: "Impressoras",
    mobileLabel: "Impressoras",
    path: "/impressoras",
    icon: Printer,
    mobilePlacement: "secondary",
    mobileOrder: 3,
    mobileRole: "coordinator",
  },
  {
    desktopLabel: "Reservas",
    mobileLabel: "Reservar",
    path: "/reservas",
    icon: CalendarPlus,
    mobilePlacement: "action",
    mobileOrder: 3,
  },
  {
    desktopLabel: "Meu perfil",
    mobileLabel: "Perfil",
    path: "/perfil",
    icon: UserRoundCog,
    mobilePlacement: "secondary",
    mobileOrder: 1,
  },
  {
    desktopLabel: "Administração",
    mobileLabel: "Administração",
    path: "/administracao",
    icon: Settings,
    mobilePlacement: "secondary",
    mobileOrder: 4,
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
