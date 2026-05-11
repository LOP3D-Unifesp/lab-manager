import {
  CalendarDays,
  Gauge,
  LucideIcon,
  Printer,
  Settings,
  Sparkles,
  Users,
  ClipboardList,
  UserRoundCog,
} from "lucide-react";

export type NavigationItem = {
  desktopLabel: string;
  mobileLabel: string;
  path: string;
  icon: LucideIcon;
  mobilePriority: boolean;
};

export const navigationItems: NavigationItem[] = [
  {
    desktopLabel: "Dashboard",
    mobileLabel: "Dashboard",
    path: "/",
    icon: Gauge,
    mobilePriority: true,
  },
  {
    desktopLabel: "Pesquisadores",
    mobileLabel: "Pesquisadores",
    path: "/pesquisadores",
    icon: Users,
    mobilePriority: false,
  },
  {
    desktopLabel: "Habilidades",
    mobileLabel: "Habilidades",
    path: "/habilidades",
    icon: Sparkles,
    mobilePriority: false,
  },
  {
    desktopLabel: "Agenda do Laboratório",
    mobileLabel: "Agenda",
    path: "/agenda",
    icon: CalendarDays,
    mobilePriority: true,
  },
  {
    desktopLabel: "Impressoras",
    mobileLabel: "Impressoras",
    path: "/impressoras",
    icon: Printer,
    mobilePriority: true,
  },
  {
    desktopLabel: "Reservas",
    mobileLabel: "Reservas",
    path: "/reservas",
    icon: ClipboardList,
    mobilePriority: true,
  },
  {
    desktopLabel: "Meu perfil",
    mobileLabel: "Perfil",
    path: "/perfil",
    icon: UserRoundCog,
    mobilePriority: false,
  },
  {
    desktopLabel: "Administração",
    mobileLabel: "Administração",
    path: "/administracao",
    icon: Settings,
    mobilePriority: false,
  },
];

export const mobilePrimaryNavigationItems = navigationItems.filter(
  (item) => item.mobilePriority,
);

export const mobileSecondaryNavigationItems = navigationItems.filter(
  (item) => !item.mobilePriority,
);
