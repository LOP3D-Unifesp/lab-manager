import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "function_not_configured" }, 500);
  }

  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    return jsonResponse({ error: "not_authenticated" }, 401);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);

  if (authError || !authData.user) {
    return jsonResponse({ error: "not_authenticated" }, 401);
  }

  const { data: coordinator } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", authData.user.id)
    .eq("role", "coordinator")
    .eq("is_active", true)
    .maybeSingle();

  if (!coordinator) {
    return jsonResponse({ error: "coordinator_required" }, 403);
  }

  let payload: { email?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: "invalid_email" }, 400);
  }

  const ttlHours = Number(Deno.env.get("INVITATION_TTL_HOURS") ?? "24");
  const expiresAt = new Date(
    Date.now() + (Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 24) * 60 * 60 * 1000,
  ).toISOString();

  await adminClient
    .from("invitations")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lte("expires_at", new Date().toISOString());

  const { data: invitation, error: invitationError } = await adminClient
    .from("invitations")
    .insert({
      email,
      invited_by: authData.user.id,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (invitationError) {
    const duplicate = invitationError.code === "23505";
    return jsonResponse(
      { error: duplicate ? "pending_invitation_exists" : "invitation_create_failed" },
      duplicate ? 409 : 500,
    );
  }

  const redirectTo = Deno.env.get("PUBLIC_SITE_URL");
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    redirectTo ? { redirectTo } : undefined,
  );

  if (inviteError || !invited.user) {
    await adminClient
      .from("invitations")
      .update({ status: "revoked" })
      .eq("id", invitation.id);

    return jsonResponse({ error: "auth_invite_failed" }, 502);
  }

  const { error: linkError } = await adminClient
    .from("invitations")
    .update({ auth_user_id: invited.user.id })
    .eq("id", invitation.id);

  if (linkError) {
    await adminClient
      .from("invitations")
      .update({ status: "revoked" })
      .eq("id", invitation.id);
    return jsonResponse({ error: "invitation_link_failed" }, 500);
  }

  return jsonResponse({ invitationId: invitation.id, expiresAt }, 201);
});
