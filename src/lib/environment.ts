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
  if (!supabaseUrl) return "VITE_SUPABASE_URL nao foi configurada.";

  if (environment === "local" && !isLoopbackSupabaseUrl(supabaseUrl)) {
    return "O modo local aceita somente o Supabase Docker em localhost.";
  }

  if (environment !== "local" && isLoopbackSupabaseUrl(supabaseUrl)) {
    return "O modo remoto nao pode usar uma URL local do Supabase.";
  }

  return null;
}
