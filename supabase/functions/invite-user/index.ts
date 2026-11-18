import {
  corsHeaders,
  getFunctionClients,
  invitationErrorStatus,
  invitationExpiresAt,
  jsonResponse,
  requireCoordinator,
  requireInstalledLab,
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

  let payload: { email?: unknown; role?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const role = payload.role ?? "researcher";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: "invalid_email" }, 400);
  }
  if (role !== "researcher" && role !== "coordinator") {
    return jsonResponse({ error: "invalid_role" }, 400);
  }

  const lab = await requireInstalledLab(clients.adminClient);
  if ("error" in lab) {
    return jsonResponse({ error: lab.error }, invitationErrorStatus(lab.error));
  }

  const expiresAt = invitationExpiresAt();
  const now = new Date().toISOString();
  await clients.adminClient
    .from("invitations")
    .update({ status: "expired", email: null })
    .eq("status", "pending")
    .lte("expires_at", now);

  const { data: invitation, error: invitationError } = await clients.adminClient
    .from("invitations")
    .insert({
      email,
      role,
      invited_by: authorization.user.id,
      expires_at: expiresAt,
      send_count: 1,
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

  const { data: invited, error: inviteError } = await sendAuthInvitation(
    clients.adminClient,
    email,
    { id: invitation.id, role, expiresAt },
    lab.data,
  );

  if (inviteError || !invited.user) {
    await clients.adminClient
      .from("invitations")
      .update({ status: "revoked", email: null })
      .eq("id", invitation.id);
    return jsonResponse({ error: "auth_invite_failed" }, 502);
  }

  const { error: linkError } = await clients.adminClient
    .from("invitations")
    .update({ auth_user_id: invited.user.id })
    .eq("id", invitation.id)
    .eq("status", "pending");

  if (linkError) {
    await clients.adminClient.auth.admin.deleteUser(invited.user.id, false);
    await clients.adminClient
      .from("invitations")
      .update({ status: "revoked", email: null, auth_user_id: null })
      .eq("id", invitation.id);
    return jsonResponse({ error: "invitation_link_failed" }, 500);
  }

  return jsonResponse({ invitationId: invitation.id, expiresAt, role }, 201);
});
