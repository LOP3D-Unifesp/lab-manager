import {
  corsHeaders,
  deleteIncompleteAuthUser,
  getFunctionClients,
  invitationExpiresAt,
  jsonResponse,
  requireCoordinator,
  requireInstalledLab,
  RESEND_COOLDOWN_MINUTES,
  sendAuthInvitation,
} from "../_shared/invitations.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const clients = getFunctionClients(request);
  if ("error" in clients) return clients.error;
  const authorization = await requireCoordinator(
    clients.accessToken,
    clients.authClient,
    clients.adminClient,
  );
  if (authorization.error || !authorization.user) return authorization.error!;

  let payload: { invitationId?: unknown; action?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const invitationId = typeof payload.invitationId === "string" ? payload.invitationId : "";
  if (!/^[0-9a-f-]{36}$/i.test(invitationId)) {
    return jsonResponse({ error: "invalid_invitation_id" }, 400);
  }
  if (payload.action !== "resend" && payload.action !== "revoke") {
    return jsonResponse({ error: "invalid_action" }, 400);
  }

  const { data: invitation, error: loadError } = await clients.adminClient
    .from("invitations")
    .select("id, email, role, status, auth_user_id, expires_at, last_sent_at, send_count")
    .eq("id", invitationId)
    .maybeSingle();

  if (loadError) return jsonResponse({ error: "invitation_load_failed" }, 500);
  if (!invitation) return jsonResponse({ error: "invitation_not_found" }, 404);
  if (invitation.status !== "pending" || !invitation.email) {
    return jsonResponse({ error: "invitation_not_pending" }, 409);
  }

  if (payload.action === "resend") {
    const availableAt = new Date(invitation.last_sent_at).getTime() + RESEND_COOLDOWN_MINUTES * 60_000;
    if (availableAt > Date.now()) {
      return jsonResponse({ error: "resend_cooldown", availableAt: new Date(availableAt).toISOString() }, 429);
    }
  }

  const { data: claimed, error: claimError } = await clients.adminClient
    .from("invitations")
    .update({ status: "revoked", email: null })
    .eq("id", invitationId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (claimError) return jsonResponse({ error: "invitation_update_failed" }, 500);
  if (!claimed) return jsonResponse({ error: "invitation_changed" }, 409);

  const deletion = await deleteIncompleteAuthUser(clients.adminClient, invitation.auth_user_id);
  if (deletion.error) {
    return jsonResponse({ error: "auth_delete_failed" }, 502);
  }

  await clients.adminClient
    .from("invitations")
    .update({ auth_user_id: null })
    .eq("id", invitationId)
    .eq("status", "revoked");

  if (payload.action === "revoke") {
    return jsonResponse({ invitationId, status: "revoked" });
  }

  const lab = await requireInstalledLab(clients.adminClient);
  if ("error" in lab) return jsonResponse({ error: lab.error }, 409);

  const expiresAt = invitationExpiresAt();
  const { data: invited, error: inviteError } = await sendAuthInvitation(
    clients.adminClient,
    invitation.email,
    { id: invitation.id, role: invitation.role, expiresAt },
    lab.data,
  );

  if (inviteError || !invited.user) {
    return jsonResponse({ error: "auth_invite_failed", invitationId }, 502);
  }

  const now = new Date().toISOString();
  const { error: restoreError } = await clients.adminClient
    .from("invitations")
    .update({
      email: invitation.email,
      status: "pending",
      auth_user_id: invited.user.id,
      opened_at: null,
      accepted_by: null,
      accepted_at: null,
      invited_by: authorization.user.id,
      expires_at: expiresAt,
      last_sent_at: now,
      send_count: invitation.send_count + 1,
    })
    .eq("id", invitationId)
    .eq("status", "revoked");

  if (restoreError) {
    await clients.adminClient.auth.admin.deleteUser(invited.user.id, false);
    return jsonResponse({ error: "invitation_restore_failed", invitationId }, 500);
  }

  return jsonResponse({ invitationId, status: "pending", expiresAt });
});
