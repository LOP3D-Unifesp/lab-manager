import { t } from "../i18n";
export type AppEnvironment = "local" | "remote" | "production";

export function isLoopbackSupabaseUrl(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function validateSupabaseEnvironment(
  environment: AppEnvironment,
  supabaseUrl: string | undefined,
) {
  if (!supabaseUrl) return t("env.errUrl");

  if (environment === "local" && !isLoopbackSupabaseUrl(supabaseUrl)) {
    return t("env.errLocalOnly");
  }

  if (environment !== "local" && isLoopbackSupabaseUrl(supabaseUrl)) {
    return t("env.errRemote");
  }

  return null;
}
