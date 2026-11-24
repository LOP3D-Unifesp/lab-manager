import { t } from "../../i18n";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

import { MobileNavigation } from "./MobileNavigation";
import { Sidebar } from "./Sidebar";
import { MobileAccountMenu } from "./MobileAccountMenu";
import { EnvironmentBadge } from "./EnvironmentBadge";
import { LanguageSelect } from "../ui/LanguageSelect";
import { ThemeToggle } from "../ui/ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "../../lib/auth";
import { FeedbackProvider } from "../feedback/FeedbackProvider";
import { AttentionProvider } from "./AttentionProvider";
import { NotificationsProvider } from "./NotificationsProvider";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  const { labSettings } = useAuth();
  const acronym = labSettings?.acronym ?? "Lab";

  return (
    <NotificationsProvider>
    <FeedbackProvider>
    <AttentionProvider>
    <div className="min-h-screen bg-background text-text">
      <Sidebar />

      <div className="flex min-h-screen flex-col lg:pl-80">
        <div className="sticky top-0 z-20 hidden items-center justify-end gap-3 border-b border-border bg-surface/95 px-10 py-2 backdrop-blur lg:flex">
          <LanguageSelect />
          <ThemeToggle compact />
          <NotificationBell />
        </div>

        <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
              aria-label={t("nav.home")}
              className="min-w-0 rounded-md transition hover:text-primary focus-visible:outline-offset-4"
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold leading-none text-primary">{acronym}</p>
                <EnvironmentBadge />
              </div>
              <h1 className="mt-1 truncate text-[20px] font-bold leading-none text-text">
                Lab Manager
              </h1>
            </Link>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <MobileAccountMenu />
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 pb-28 pt-6 sm:px-8 lg:px-10 lg:pb-10 lg:pt-10">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        <MobileNavigation />
      </div>
    </div>
    </AttentionProvider>
    </FeedbackProvider>
    </NotificationsProvider>
  );
}
