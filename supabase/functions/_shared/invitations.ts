import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

export const INVITATION_TTL_HOURS = 72;
export const RESEND_COOLDOWN_MINUTES = 5;

export const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function getFunctionClients(request: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accessToken = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return { error: jsonResponse({ error: "function_not_configured" }, 500) } as const;
  }

  if (!accessToken) {
    return { error: jsonResponse({ error: "not_authenticated" }, 401) } as const;
  }

  return {
    accessToken,
    serviceRoleKey,
    authClient: createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    }),
    adminClient: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  } as const;
}

export async function requireCoordinator(
  accessToken: string,
  authClient: SupabaseClient,
  adminClient: SupabaseClient,
): Promise<{ user?: User; error?: Response }> {
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);

  if (authError || !authData.user) {
    return { error: jsonResponse({ error: "not_authenticated" }, 401) };
  }

  const { data: coordinator } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", authData.user.id)
    .eq("role", "coordinator")
    .eq("is_active", true)
    .maybeSingle();

  if (!coordinator) {
    return { error: jsonResponse({ error: "coordinator_required" }, 403) };
  }

  return { user: authData.user };
}

export async function requireInstalledLab(adminClient: SupabaseClient) {
  const { data, error } = await adminClient
    .from("lab_settings")
    .select("name, acronym, privacy_contact_email, setup_completed_at")
    .eq("id", true)
    .maybeSingle();

  if (error) return { error: "lab_settings_unavailable" } as const;
  if (!data?.setup_completed_at) return { error: "installation_incomplete" } as const;
  if (!data.privacy_contact_email) return { error: "privacy_contact_required" } as const;
  return { data } as const;
}

export function invitationExpiresAt() {
  return new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

export async function sendAuthInvitation(
  adminClient: SupabaseClient,
  email: string,
  invitation: { id: string; role: "researcher" | "coordinator"; expiresAt: string },
  lab: { name: string; acronym: string; privacy_contact_email: string },
) {
  const siteUrl = Deno.env.get("PUBLIC_SITE_URL")?.replace(/\/$/, "");
  const roleLabel = invitation.role === "coordinator" ? "Coordenador(a)" : "Pesquisador(a)";

  return adminClient.auth.admin.inviteUserByEmail(email, {
    ...(siteUrl ? { redirectTo: `${siteUrl}/convite/aceitar` } : {}),
    data: {
      invitation_id: invitation.id,
      invitation_role: invitation.role,
      invitation_role_label: roleLabel,
      invitation_expires_at: invitation.expiresAt,
      lab_name: lab.name,
      lab_acronym: lab.acronym,
      privacy_contact_email: lab.privacy_contact_email,
    },
  });
}

export async function deleteIncompleteAuthUser(adminClient: SupabaseClient, userId: string | null) {
  if (!userId) return { deleted: false, missing: true } as const;

  const { data, error: lookupError } = await adminClient.auth.admin.getUserById(userId);
  if (lookupError || !data.user) {
    const message = lookupError?.message?.toLowerCase() ?? "";
    if (!lookupError || lookupError.status === 404 || message.includes("not found")) {
      return { deleted: false, missing: true } as const;
    }
    return { deleted: false, missing: false, error: lookupError } as const;
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId, false);
  if (error) return { deleted: false, missing: false, error } as const;
  return { deleted: true, missing: false } as const;
}

export function invitationErrorStatus(error: string) {
  if (error === "privacy_contact_required" || error === "installation_incomplete") return 409;
  return 500;
}
