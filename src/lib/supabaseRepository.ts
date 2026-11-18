import { supabase } from "./supabaseClient";
import {
  AvailabilitySlot,
  AcademicAffiliation,
  BookingAlertSummary,
  BookingStatus,
  FundingAgency,
  FundingGrant,
  InvitationStage,
  InvitationSummary,
  InstallationState,
  LabSchedulePeriod,
  LabSettings,
  MaintenanceBlock,
  Material,
  Printer,
  PrinterBooking,
  PrinterMaterial,
  PrinterStatus,
  PublicProfile,
  PublicLabIdentity,
  ProfileRole,
  ProfileSkill,
  Skill,
  WorkMode,
  mapPublicProfile,
  getScheduleSortOrder,
  type PeriodoId,
} from "./domain";

function client() {
  if (!supabase) {
    throw new Error("Supabase nao esta configurado.");
  }

  return supabase;
}

function throwIfError(error: unknown) {
  if (!error) return;
  if (error instanceof Error) throw error;

  if (typeof error === "object" && error !== null) {
    const typedError = error as Record<string, unknown>;
    const text = [typedError.message, typedError.details, typedError.hint, typedError.code]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" | ");
    throw new Error(text || JSON.stringify(typedError));
  }

  throw new Error(String(error));
}

export const publicProfileSelect = [
  "id",
  "full_name",
  "email",
  "role",
  "academic_affiliation",
  "funding_grants:profile_funding_grants(agency, agency_other, grant_name, weekly_hours, monthly_value)",
  "weekly_workload_hours",
  "lattes_url",
  "nationality_country_code",
  "phone",
  "bio",
  "is_active",
  "requires_booking_approval",
  "avatar_url",
  "created_at",
  "updated_at",
].join(", ");

export type ProfileInput = {
  fullName: string;
  academicAffiliation: AcademicAffiliation | null;
  birthDate: string | null;
  fundingGrants: FundingGrant[];
  weeklyWorkloadHours: number | null;
  lattesUrl: string | null;
  cpf: string | null;
  rg: string | null;
  postalCode: string | null;
  street: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  nationalityCountryCode: string | null;
  phone: string | null;
  bio: string | null;
};

async function replaceMyFundingGrants(profileId: string, grants: FundingGrant[]) {
  const { data, error } = await client().rpc("replace_profile_funding_grants", {
    p_profile_id: profileId,
    p_grants: grants.map((grant) => ({
      agency: grant.agency,
      agency_other: grant.agency === "other" ? grant.agency_other : null,
      grant_name: grant.grant_name,
      weekly_hours: grant.weekly_hours,
      monthly_value: grant.monthly_value,
    })),
  });
  throwIfError(error);

  return ((data ?? []) as FundingGrant[]).map((grant) => ({
    agency: grant.agency,
    agency_other: grant.agency_other,
    grant_name: grant.grant_name,
    weekly_hours: grant.weekly_hours,
    monthly_value: grant.monthly_value,
  }));
}

function profileRpcArgs(params: ProfileInput) {
  return {
    p_full_name: params.fullName,
    p_academic_affiliation: params.academicAffiliation ?? undefined,
    p_birth_date: params.birthDate ?? undefined,
    p_weekly_workload_hours: params.weeklyWorkloadHours ?? undefined,
    p_lattes_url: params.lattesUrl ?? undefined,
    p_cpf: params.cpf ?? undefined,
    p_rg: params.rg ?? undefined,
    p_postal_code: params.postalCode ?? undefined,
    p_street: params.street ?? undefined,
    p_address_number: params.addressNumber ?? undefined,
    p_address_complement: params.addressComplement ?? undefined,
    p_neighborhood: params.neighborhood ?? undefined,
    p_city: params.city ?? undefined,
    p_state: params.state ?? undefined,
    p_country: params.country ?? undefined,
    p_nationality_country_code: params.nationalityCountryCode ?? undefined,
    p_phone: params.phone ?? undefined,
    p_bio: params.bio ?? undefined,
  };
}

export async function listProfiles() {
  const { data, error } = await client()
    .from("profiles")
    .select(publicProfileSelect)
    .eq("is_active", true)
    .order("full_name");

  throwIfError(error);
  return ((data ?? []) as unknown as Array<Omit<PublicProfile, "first_name" | "last_name">>).map(
    mapPublicProfile,
  );
}

export async function updateMyProfile(params: ProfileInput) {
  const { data, error } = await client().rpc("update_my_profile", profileRpcArgs(params));
  throwIfError(error);
  const profileRow = data as unknown as Omit<
    PublicProfile,
    "first_name" | "last_name" | "funding_grants"
  >;
  const funding_grants = await replaceMyFundingGrants(profileRow.id, params.fundingGrants);
  return mapPublicProfile({ ...profileRow, funding_grants });
}

export async function createMyProfile(params: ProfileInput) {
  const { data, error } = await client().rpc("create_profile", profileRpcArgs(params));
  throwIfError(error);
  const profileRow = data as unknown as Omit<
    PublicProfile,
    "first_name" | "last_name" | "funding_grants"
  >;
  const funding_grants = await replaceMyFundingGrants(profileRow.id, params.fundingGrants);
  return mapPublicProfile({ ...profileRow, funding_grants });
}

export async function inviteUser(email: string, role: ProfileRole) {
  const { data, error } = await client().functions.invoke("invite-user", {
    body: { email: email.trim().toLowerCase(), role },
  });
  throwIfError(error);
  return data;
}

async function invitationFunction(action: "resend" | "revoke", invitationId: string) {
  const { data, error } = await client().functions.invoke("manage-invitation", {
    body: { action, invitationId },
  });
  throwIfError(error);
  return data;
}

export async function resendInvitation(invitationId: string) {
  return invitationFunction("resend", invitationId);
}

export async function revokeInvitation(invitationId: string) {
  return invitationFunction("revoke", invitationId);
}

export async function markInvitationOpened() {
  const { error } = await client().rpc("record_invitation_opened");
  throwIfError(error);
}

export async function getPublicLabIdentity(): Promise<PublicLabIdentity | null> {
  const { data, error } = await client().rpc("get_public_lab_identity");
  throwIfError(error);
  return ((data ?? [])[0] ?? null) as PublicLabIdentity | null;
}

export async function listInvitations(): Promise<InvitationSummary[]> {
  const { data, error } = await client()
    .from("invitations")
    .select(
      "id, email, role, status, invited_by, accepted_by, created_at, opened_at, accepted_at, expires_at, last_sent_at, send_count",
    )
    .order("created_at", { ascending: false });
  throwIfError(error);

  const invitations = (data ?? []) as Array<{
    id: string;
    email: string | null;
    role: ProfileRole;
    status: "pending" | "accepted" | "expired" | "revoked";
    invited_by: string;
    accepted_by: string | null;
    created_at: string;
    opened_at: string | null;
    accepted_at: string | null;
    expires_at: string;
    last_sent_at: string;
    send_count: number;
  }>;
  const profileIds = Array.from(
    new Set(invitations.flatMap((item) => [item.invited_by, item.accepted_by].filter(Boolean))),
  ) as string[];
  const { data: profiles, error: profilesError } = profileIds.length
    ? await client().from("profiles").select("id, full_name, email").in("id", profileIds)
    : { data: [], error: null };
  throwIfError(profilesError);
  const byId = new Map((profiles ?? []).map((item) => [item.id, item]));

  return invitations.map((invitation) => {
    const stage: InvitationStage = invitation.status === "pending"
      ? invitation.opened_at ? "opened" : "sent"
      : invitation.status;
    const acceptedProfile = invitation.accepted_by ? byId.get(invitation.accepted_by) : null;

    return {
      id: invitation.id,
      role: invitation.role,
      stage,
      recipient: invitation.email ?? acceptedProfile?.email ?? acceptedProfile?.full_name ?? "Dados removidos",
      invitedBy: byId.get(invitation.invited_by)?.full_name ?? "Coordenador não disponível",
      createdAt: invitation.created_at,
      openedAt: invitation.opened_at,
      acceptedAt: invitation.accepted_at,
      expiresAt: invitation.expires_at,
      lastSentAt: invitation.last_sent_at,
      sendCount: invitation.send_count,
    };
  });
}

export async function setMyPassword(password: string) {
  const { error } = await client().auth.updateUser({ password });
  throwIfError(error);
}

export async function uploadMyAvatar(file: File) {
  const { data: userData, error: userError } = await client().auth.getUser();
  throwIfError(userError);

  const userId = userData.user?.id;
  if (!userId) {
    throw new Error("Usuario nao autenticado.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/avatar.${extension}`;

  const { error: uploadError } = await client()
    .storage.from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  throwIfError(uploadError);

  const { data: publicUrlData } = client().storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { data, error } = await client().rpc("set_my_avatar_url", { p_avatar_url: avatarUrl });
  throwIfError(error);

  return (data as { avatar_url: string | null }).avatar_url;
}

export async function getInstallationState(): Promise<InstallationState> {
  const { data, error } = await client()
    .from("lab_settings")
    .select(
      "id, name, acronym, timezone, workspace_capacity, operating_weekdays, lunch_starts_at, lunch_ends_at, dinner_starts_at, dinner_ends_at, privacy_contact_email, setup_completed_at, created_by, updated_by, created_at, updated_at",
    )
    .eq("id", true)
    .maybeSingle();

  throwIfError(error);
  const settings = (data ?? null) as LabSettings | null;
  return { settings, completed: Boolean(settings?.setup_completed_at) };
}

export async function completeInstallation(params: {
  name: string;
  acronym: string;
  timezone: string;
  privacyContactEmail: string;
}) {
  const { data, error } = await client().rpc("complete_lab_installation", {
    p_name: params.name.trim(),
    p_acronym: params.acronym.trim(),
    p_timezone: params.timezone,
    p_privacy_contact_email: params.privacyContactEmail.trim().toLowerCase(),
  });

  throwIfError(error);
  return data as LabSettings;
}

export async function updateLabSettings(params: {
  name: string;
  acronym: string;
  timezone: string;
  privacyContactEmail: string;
  workspaceCapacity: number;
  operatingWeekdays: number[];
}) {
  const { data, error } = await client().rpc("update_lab_configuration", {
    p_name: params.name.trim(),
    p_acronym: params.acronym.trim(),
    p_timezone: params.timezone,
    p_privacy_contact_email: params.privacyContactEmail.trim().toLowerCase(),
    p_workspace_capacity: params.workspaceCapacity,
    p_operating_weekdays: params.operatingWeekdays,
  });

  throwIfError(error);
  return data as LabSettings;
}

export async function listLabSchedulePeriods(includeInactive = false) {
  let query = client().from("lab_schedule_periods")
    .select("id, starts_at, ends_at, sort_order, is_active, created_at, updated_at")
    .order("starts_at").order("ends_at");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  throwIfError(error);
  return (data ?? []) as LabSchedulePeriod[];
}

export async function saveLabSchedulePeriod(params: {
  id?: string; startsAt: string; endsAt: string; isActive: boolean;
}) {
  const { data, error } = await client().rpc("save_lab_schedule_period", {
    p_id: params.id ?? (null as unknown as string), p_starts_at: params.startsAt, p_ends_at: params.endsAt,
    p_sort_order: getScheduleSortOrder(params.startsAt), p_is_active: params.isActive,
  });
  throwIfError(error);
  return data as LabSchedulePeriod;
}

export async function updateLabBreaks(params: {
  lunchStartsAt: string; lunchEndsAt: string; dinnerStartsAt: string; dinnerEndsAt: string;
}) {
  const { data, error } = await client().rpc("update_lab_breaks", {
    p_lunch_starts_at: params.lunchStartsAt,
    p_lunch_ends_at: params.lunchEndsAt,
    p_dinner_starts_at: params.dinnerStartsAt,
    p_dinner_ends_at: params.dinnerEndsAt,
  });
  throwIfError(error);
  return data as LabSettings;
}

export async function updateProfileRole(profileId: string, role: ProfileRole) {
  const { data, error } = await client()
    .from("profiles")
    .update({ role })
    .eq("id", profileId)
    .select(publicProfileSelect)
    .single();

  throwIfError(error);
  return mapPublicProfile(data as unknown as Omit<PublicProfile, "first_name" | "last_name">);
}

export async function updateRequiresBookingApproval(profileId: string, value: boolean) {
  const { data, error } = await client()
    .from("profiles")
    .update({ requires_booking_approval: value })
    .eq("id", profileId)
    .select(publicProfileSelect)
    .single();

  throwIfError(error);
  return mapPublicProfile(data as unknown as Omit<PublicProfile, "first_name" | "last_name">);
}

export async function listSkills(includeInactive = false) {
  let query = client()
    .from("skills")
    .select("id, name, description, is_active")
    .order("name");

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  throwIfError(error);
  return (data ?? []) as Skill[];
}

export async function createSkill(params: { name: string; description: string | null }) {
  const { data, error } = await client()
    .from("skills")
    .insert({ name: params.name.trim(), description: params.description, is_active: true })
    .select("id, name, description, is_active")
    .single();
  throwIfError(error);
  return data as Skill;
}

export async function updateSkill(
  id: string,
  params: { name: string; description: string | null; isActive: boolean },
) {
  const { data, error } = await client()
    .from("skills")
    .update({
      name: params.name.trim(),
      description: params.description,
      is_active: params.isActive,
    })
    .eq("id", id)
    .select("id, name, description, is_active")
    .single();
  throwIfError(error);
  return data as Skill;
}

export async function listProfileSkills() {
  const { data, error } = await client().from("profile_skills").select("profile_id, skill_id");
  throwIfError(error);
  return (data ?? []) as ProfileSkill[];
}

export async function toggleMySkill(profileId: string, skillId: string, enabled: boolean) {
  if (enabled) {
    const { error } = await client()
      .from("profile_skills")
      .upsert({ profile_id: profileId, skill_id: skillId }, { onConflict: "profile_id,skill_id" });
    throwIfError(error);
    return;
  }

  const { error } = await client()
    .from("profile_skills")
    .delete()
    .eq("profile_id", profileId)
    .eq("skill_id", skillId);
  throwIfError(error);
}

export async function listAvailability() {
  const { data, error } = await client()
    .from("availability_slots")
    .select("id, profile_id, weekday, starts_at, ends_at, schedule_period_id, work_mode")
    .order("weekday")
    .order("starts_at");
  throwIfError(error);

  return ((data ?? []) as Omit<AvailabilitySlot, "periodo">[]).map((slot) => ({
    ...slot,
    periodo: slot.schedule_period_id,
  }));
}

export async function addAvailabilitySlots(
  profileId: string,
  slots: Array<{ weekday: number; periodo: PeriodoId; workMode?: WorkMode }>,
) {
  const [availability, activePeriods, installation] = await Promise.all([
    listAvailability(), listLabSchedulePeriods(), getInstallationState(),
  ]);
  const activeIds = new Set(activePeriods.map((period) => period.id));
  const openDays = installation.settings?.operating_weekdays ?? [1, 2, 3, 4, 5];
  const current = availability.filter((item) => item.profile_id === profileId
    && activeIds.has(item.periodo) && openDays.includes(item.weekday));
  const byKey = new Map(current.map((slot) => [`${slot.weekday}-${slot.periodo}`, {
    weekday: slot.weekday, periodo: slot.periodo, workMode: slot.work_mode,
  }]));
  slots.forEach((slot) => byKey.set(`${slot.weekday}-${slot.periodo}`, {
    weekday: slot.weekday, periodo: slot.periodo,
    workMode: slot.workMode ?? ("onsite" satisfies WorkMode),
  }));
  await saveProfileAvailability(profileId, [...byKey.values()]);
}

export async function saveProfileAvailability(
  profileId: string,
  slots: Array<{ weekday: number; periodo: PeriodoId; workMode: WorkMode }>,
) {
  const rows = slots.map((slot) => ({
    weekday: slot.weekday,
    schedule_period_id: slot.periodo,
    work_mode: slot.workMode,
  }));

  const { error } = await client().rpc("replace_profile_availability", {
    p_profile_id: profileId,
    p_slots: rows,
  });
  throwIfError(error);
}

export async function deleteAvailabilitySlot(slotId: string) {
  const all = await listAvailability();
  const target = all.find((slot) => slot.id === slotId);
  if (!target) return;
  await saveProfileAvailability(target.profile_id, all
    .filter((slot) => slot.profile_id === target.profile_id && slot.id !== slotId)
    .map((slot) => ({ weekday: slot.weekday, periodo: slot.periodo, workMode: slot.work_mode })));
}

export async function listPrinters() {
  const { data, error } = await client()
    .from("printers")
    .select("id, name, model, location, status, notes, created_at, updated_at")
    .order("name");
  throwIfError(error);
  return (data ?? []) as Printer[];
}

export async function createPrinter(params: {
  name: string;
  model: string | null;
  location: string | null;
  status?: PrinterStatus;
  notes: string | null;
}) {
  const { data, error } = await client()
    .from("printers")
    .insert({ ...params, status: params.status ?? "active" })
    .select("id, name, model, location, status, notes, created_at, updated_at")
    .single();
  throwIfError(error);
  return data as Printer;
}

export async function updatePrinter(
  id: string,
  params: { name: string; model: string | null; location: string | null; status: PrinterStatus; notes: string | null },
) {
  const { data, error } = await client()
    .from("printers")
    .update(params)
    .eq("id", id)
    .select("id, name, model, location, status, notes, created_at, updated_at")
    .single();
  throwIfError(error);
  return data as Printer;
}

export async function listMaterials() {
  const { data, error } = await client()
    .from("materials")
    .select("id, name, description, is_active")
    .eq("is_active", true)
    .order("name");
  throwIfError(error);
  return (data ?? []) as Material[];
}

export async function createMaterial(params: { name: string; description: string | null }) {
  const { data, error } = await client()
    .from("materials")
    .insert({ ...params, is_active: true })
    .select("id, name, description, is_active")
    .single();
  throwIfError(error);
  return data as Material;
}

export async function listPrinterMaterials() {
  const { data, error } = await client()
    .from("printer_materials")
    .select("printer_id, material_id");
  throwIfError(error);
  return (data ?? []) as PrinterMaterial[];
}

export async function setPrinterMaterials(printerId: string, materialIds: string[]) {
  const { error } = await client().rpc("replace_printer_materials", {
    p_printer_id: printerId,
    p_material_ids: materialIds,
  });
  throwIfError(error);
}

export async function listBookings() {
  const { data, error } = await client()
    .from("printer_bookings")
    .select(`
      id, printer_id, profile_id, material_id, project_name, starts_at, ends_at,
      estimated_duration_minutes, status, notes, cancelled_at, cancelled_by,
      rejected_reason, rejected_at, rejected_by, approved_at, approved_by,
      printer:printers!printer_bookings_printer_id_fkey(id, name, model, location, status, notes, created_at, updated_at),
      material:materials!printer_bookings_material_id_fkey(id, name, description, is_active),
      approved_by_profile:profiles!printer_bookings_approved_by_fkey(full_name),
      rejected_by_profile:profiles!printer_bookings_rejected_by_fkey(full_name),
      cancelled_by_profile:profiles!printer_bookings_cancelled_by_fkey(full_name),
      profile:profiles!printer_bookings_profile_id_fkey(id, full_name, email, role, academic_affiliation, funding_grants:profile_funding_grants(agency, agency_other, grant_name, weekly_hours, monthly_value), weekly_workload_hours, lattes_url, nationality_country_code, phone, bio, is_active, requires_booking_approval, avatar_url, created_at, updated_at)
    `)
    .order("starts_at");
  throwIfError(error);

  return ((data ?? []) as unknown as Array<Record<string, unknown> & { profile?: Omit<PublicProfile, "first_name" | "last_name"> | null }>).map(
    (booking) => ({ ...booking, profile: booking.profile ? mapPublicProfile(booking.profile) : null }),
  ) as unknown as PrinterBooking[];
}

// Coordinator feed: pending bookings awaiting a decision plus recent
// cancellations by someone else (a researcher cancelling their print also
// deserves the coordinator's attention).
export async function listCoordinatorBookingsAlertsSummary(profileId: string, signal?: AbortSignal) {
  const cutoff = new Date(Date.now() - BOOKING_ALERT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  let query = client()
    .from("printer_bookings")
    .select(`
      id, project_name, starts_at, status, approved_at, rejected_at, rejected_reason,
      cancelled_at, cancelled_by,
      printer:printers!printer_bookings_printer_id_fkey(name),
      profile:profiles!printer_bookings_profile_id_fkey(full_name),
      cancelled_by_profile:profiles!printer_bookings_cancelled_by_fkey(full_name)
    `)
    .or(`status.eq.pending,and(status.eq.cancelled,cancelled_at.gte.${cutoff},cancelled_by.neq.${profileId})`)
    .order("starts_at");
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  throwIfError(error);

  return ((data ?? []) as unknown as Array<{
    id: string;
    project_name: string;
    starts_at: string;
    status: BookingStatus;
    approved_at: string | null;
    rejected_at: string | null;
    rejected_reason: string | null;
    cancelled_at: string | null;
    cancelled_by: string | null;
    printer: { name: string } | null;
    profile: { full_name: string } | null;
    cancelled_by_profile: { full_name: string } | null;
  }>).map((booking) => ({
    id: booking.id,
    project_name: booking.project_name,
    starts_at: booking.starts_at,
    status: booking.status,
    approved_at: booking.approved_at,
    approved_by_name: null,
    rejected_at: booking.rejected_at,
    rejected_by_name: null,
    rejected_reason: booking.rejected_reason,
    cancelled_at: booking.cancelled_at,
    cancelled_by: booking.cancelled_by,
    cancelled_by_name: booking.cancelled_by_profile?.full_name ?? null,
    printer_name: booking.printer?.name ?? "Impressora removida",
    profile_name: booking.profile?.full_name ?? "Usuário removido",
  })) as BookingAlertSummary[];
}

// Booking outcomes (approved/rejected by a coordinator, or cancelled by someone
// else) stay in the researcher's alert list for this long. The bell has no
// read/unread state, so the window keeps decisions visible for a while.
const BOOKING_ALERT_WINDOW_HOURS = 48;

export async function listMyBookingAlertsSummary(profileId: string, signal?: AbortSignal) {
  const cutoff = new Date(Date.now() - BOOKING_ALERT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  let query = client()
    .from("printer_bookings")
    .select(`
      id, project_name, starts_at, status, approved_at, rejected_at, rejected_reason,
      cancelled_at, cancelled_by,
      printer:printers!printer_bookings_printer_id_fkey(name),
      approved_by_profile:profiles!printer_bookings_approved_by_fkey(full_name),
      rejected_by_profile:profiles!printer_bookings_rejected_by_fkey(full_name),
      cancelled_by_profile:profiles!printer_bookings_cancelled_by_fkey(full_name)
    `)
    .eq("profile_id", profileId)
    .or(
      `approved_at.gte.${cutoff},rejected_at.gte.${cutoff},and(cancelled_at.gte.${cutoff},cancelled_by.neq.${profileId})`,
    )
    .order("starts_at");
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  throwIfError(error);

  return ((data ?? []) as unknown as Array<{
    id: string;
    project_name: string;
    starts_at: string;
    status: BookingStatus;
    approved_at: string | null;
    rejected_at: string | null;
    rejected_reason: string | null;
    cancelled_at: string | null;
    cancelled_by: string | null;
    printer: { name: string } | null;
    approved_by_profile: { full_name: string } | null;
    rejected_by_profile: { full_name: string } | null;
    cancelled_by_profile: { full_name: string } | null;
  }>).map((booking) => ({
    id: booking.id,
    project_name: booking.project_name,
    starts_at: booking.starts_at,
    status: booking.status,
    approved_at: booking.approved_at,
    approved_by_name: booking.approved_by_profile?.full_name ?? null,
    rejected_at: booking.rejected_at,
    rejected_by_name: booking.rejected_by_profile?.full_name ?? null,
    rejected_reason: booking.rejected_reason,
    cancelled_at: booking.cancelled_at,
    cancelled_by: booking.cancelled_by,
    cancelled_by_name: booking.cancelled_by_profile?.full_name ?? null,
    printer_name: booking.printer?.name ?? "Impressora removida",
    profile_name: "",
  })) as BookingAlertSummary[];
}

export async function listMaintenanceBlocks() {
  const { data, error } = await client()
    .from("maintenance_blocks")
    .select("id, printer_id, created_by, starts_at, ends_at, reason, notes, created_at, updated_at")
    .order("starts_at");
  throwIfError(error);
  return (data ?? []) as MaintenanceBlock[];
}

export async function createBooking(params: {
  printerId: string;
  materialId: string;
  projectName: string;
  startsAt: string;
  durationMinutes: number;
  notes?: string | null;
}) {
  const { data, error } = await client().rpc("create_printer_booking", {
    p_printer_id: params.printerId,
    p_material_id: params.materialId,
    p_project_name: params.projectName,
    p_starts_at: params.startsAt,
    p_estimated_duration_minutes: params.durationMinutes,
    p_notes: params.notes ?? undefined,
  });
  throwIfError(error);
  return data as PrinterBooking;
}

export async function updateBooking(
  bookingId: string,
  params: {
    printerId: string;
    materialId: string;
    projectName: string;
    startsAt: string;
    durationMinutes: number;
    notes?: string | null;
  },
) {
  const { data, error } = await client().rpc("update_printer_booking", {
    p_booking_id: bookingId,
    p_printer_id: params.printerId,
    p_material_id: params.materialId,
    p_project_name: params.projectName,
    p_starts_at: params.startsAt,
    p_estimated_duration_minutes: params.durationMinutes,
    p_notes: params.notes ?? undefined,
  });
  throwIfError(error);
  return data as PrinterBooking;
}

export async function setBookingStatus(bookingId: string, status: PrinterBooking["status"]) {
  const { data, error } = await client().rpc("set_printer_booking_status", {
    p_booking_id: bookingId,
    p_status: status,
  });
  throwIfError(error);
  return data as PrinterBooking;
}

export async function cancelBooking(bookingId: string) {
  const { data, error } = await client().rpc("cancel_printer_booking", {
    p_booking_id: bookingId,
  });
  throwIfError(error);
  return data as PrinterBooking;
}

export async function rejectBooking(bookingId: string, reason: string | null) {
  const { data, error } = await client().rpc("reject_printer_booking", {
    p_booking_id: bookingId,
    p_reason: reason ?? undefined,
  });
  throwIfError(error);
  return data as PrinterBooking;
}

export async function createMaintenanceBlock(params: {
  printerId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  notes?: string | null;
}) {
  const { data, error } = await client().rpc("create_maintenance_block", {
    p_printer_id: params.printerId,
    p_starts_at: params.startsAt,
    p_ends_at: params.endsAt,
    p_reason: params.reason,
    p_notes: params.notes ?? undefined,
  });
  throwIfError(error);
  return data as MaintenanceBlock;
}

export async function deleteMaintenanceBlock(blockId: string) {
  const { error } = await client().rpc("delete_maintenance_block", {
    p_block_id: blockId,
  });
  throwIfError(error);
}
