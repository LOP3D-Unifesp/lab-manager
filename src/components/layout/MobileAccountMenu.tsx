import { Lightbulb, LogOut, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useT } from "../../i18n";
import { useAuth } from "../../lib/auth";
import { useFeedback } from "../feedback/FeedbackProvider";
import { Avatar } from "../ui/Avatar";
import { LanguageSelect } from "../ui/LanguageSelect";
import { ThemeToggle } from "../ui/ThemeToggle";
import { StatusBadge } from "../ui/StatusBadge";

export function MobileAccountMenu() {
  const { profile, signOut } = useAuth();
  const t = useT();
  const { openFeedback } = useFeedback();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  if (!profile) {
    return null;
  }

  async function handleSignOut() {
    setIsOpen(false);
    await signOut();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={t("account.openMenu")}
        onClick={() => setIsOpen((current) => !current)}
        className={[
          "inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border text-sm font-bold transition",
          isOpen
            ? "border-primary bg-primary text-white shadow-soft"
            : "border-border bg-primary-soft text-primary-dark hover:border-primary",
        ].join(" ")}
      >
        <Avatar avatarUrl={profile.avatar_url} name={profile.full_name} className="h-11 w-11" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[3.25rem] z-50 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-surface shadow-soft">
          <div className="border-b border-border p-3">
            <div className="flex min-w-0 items-start gap-3">
              <Avatar avatarUrl={profile.avatar_url} name={profile.full_name} className="h-10 w-10" />
              <div className="min-w-0">
                <p className="truncate text-base font-bold leading-tight text-text">
                  {profile.full_name}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold leading-tight text-muted">
                  {profile.email}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <StatusBadge label={t(profile.role === "coordinator" ? "role.coordinator" : "role.researcher")} variant="info" />
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-bold text-muted">
                MVP
              </span>
            </div>
          </div>

          <div className="grid gap-1.5 border-b border-border px-3 py-2.5">
            <span className="text-sm font-semibold text-muted">{t("account.theme")}</span>
            <ThemeToggle className="w-full" />
            <LanguageSelect className="w-full" />
          </div>

          <div className="grid p-1.5">
            <Link
              to="/perfil"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 text-base font-semibold text-text transition hover:bg-background hover:text-primary"
            >
              <User className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("account.profile")}
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openFeedback();
              }}
              className="flex min-h-11 items-center gap-3 rounded-md bg-accent-soft px-3 text-left text-base font-bold text-accent-dark transition hover:brightness-95"
            >
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
              {t("account.sendFeedback")}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 text-left text-base font-semibold text-danger-dark transition hover:bg-danger-soft"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t("common.signOut")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
