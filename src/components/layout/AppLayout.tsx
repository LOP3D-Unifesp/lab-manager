import { ReactNode } from "react";

import { MobileNavigation } from "./MobileNavigation";
import { Sidebar } from "./Sidebar";
import { AuthUserMenu } from "./AuthUserMenu";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-text">
      <Sidebar />

      <div className="flex min-h-screen flex-col lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-5 py-4 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-primary">LO&P3D</p>
              <h1 className="text-[22px] font-bold leading-tight text-text">
                Lab Manager
              </h1>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-base font-semibold text-muted">
              MVP
            </div>
          </div>
          <div className="mt-3">
            <AuthUserMenu />
          </div>
        </header>

        <main className="flex-1 px-5 pb-32 pt-6 sm:px-8 lg:px-10 lg:pb-10 lg:pt-10">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        <MobileNavigation />
      </div>
    </div>
  );
}
