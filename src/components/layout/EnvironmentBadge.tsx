import { appEnvironment } from "../../lib/supabaseClient";

export function EnvironmentBadge() {
  if (appEnvironment !== "local") return null;

  return (
    <span className="inline-flex rounded-full border border-warning bg-warning-soft px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-warning-dark">
      Local
    </span>
  );
}
