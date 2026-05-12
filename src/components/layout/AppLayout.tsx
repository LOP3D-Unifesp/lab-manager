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
        <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold leading-none text-primary">
                LO&P3D
              </p>
              <h1 className="mt-1 text-[20px] font-bold leading-none text-text">
                Lab Manager
              </h1>
            </div>
            <div className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm font-bold text-muted">
              MVP
            </div>
          </div>
          <div className="mt-2">
            <AuthUserMenu />
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
