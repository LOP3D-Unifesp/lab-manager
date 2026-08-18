import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import {
  validateSupabaseEnvironment,
  type AppEnvironment,
} from "./environment";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;
const defaultEnvironment =
  import.meta.env.MODE === "remote"
    ? "remote"
    : import.meta.env.MODE === "production"
      ? "production"
      : "local";
export const appEnvironment = (import.meta.env.VITE_APP_ENV ??
  defaultEnvironment) as AppEnvironment;
export const supabaseConfigurationError =
  validateSupabaseEnvironment(appEnvironment, supabaseUrl) ??
  (!supabaseAnonKey ? "VITE_SUPABASE_ANON_KEY nao foi configurada." : null);

export const supabase =
  !supabaseConfigurationError && supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey)
    : null;

export function supabaseEstaConfigurado() {
  return Boolean(supabase);
}
