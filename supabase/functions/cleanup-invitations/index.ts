import {
  corsHeaders,
  deleteIncompleteAuthUser,
  jsonResponse,
} from "../_shared/invitations.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accessToken = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "function_not_configured" }, 500);
  if (!accessToken || accessToken !== serviceRoleKey) {
    return jsonResponse({ error: "cleanup_secret_required" }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();
  const { error: expireError } = await adminClient
    .from("invitations")
    .update({ status: "expired", email: null })
    .eq("status", "pending")
    .lte("expires_at", now);
  if (expireError) return jsonResponse({ error: "expiration_failed" }, 500);

  const { data: pendingCleanup, error: loadError } = await adminClient
    .from("invitations")
    .select("id, auth_user_id")
    .in("status", ["expired", "revoked"])
    .not("auth_user_id", "is", null)
    .limit(100);
  if (loadError) return jsonResponse({ error: "cleanup_load_failed" }, 500);

  let removed = 0;
  const failures: string[] = [];
  for (const invitation of pendingCleanup ?? []) {
    const deletion = await deleteIncompleteAuthUser(adminClient, invitation.auth_user_id);
    if (deletion.error) {
      failures.push(invitation.id);
      continue;
    }
    const { error } = await adminClient
      .from("invitations")
      .update({ auth_user_id: null, email: null })
      .eq("id", invitation.id)
      .in("status", ["expired", "revoked"]);
    if (error) failures.push(invitation.id);
    else removed += 1;
  }

  return jsonResponse({ expiredAt: now, removed, failures }, failures.length ? 207 : 200);
});
