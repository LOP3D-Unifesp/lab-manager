import { ReactNode } from "react";
import { Link } from "react-router-dom";

import { MobileNavigation } from "./MobileNavigation";
import { Sidebar } from "./Sidebar";
import { MobileAccountMenu } from "./MobileAccountMenu";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-text">
      <Sidebar />

      <div className="flex min-h-screen flex-col lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
              aria-label="Ir para o início"
              className="min-w-0 rounded-md transition hover:text-primary focus-visible:outline-offset-4"
            >
              <p className="text-sm font-bold leading-none text-primary">
                LO&P3D
              </p>
              <h1 className="mt-1 truncate text-[20px] font-bold leading-none text-text">
                Lab Manager
              </h1>
            </Link>
            <MobileAccountMenu />
          </div>
        </header>

        <main className="flex-1 px-5 pb-28 pt-6 sm:px-8 lg:px-10 lg:pb-10 lg:pt-10">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        <MobileNavigation />
      </div>
    </div>
  );
}
