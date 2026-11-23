import { supabase } from "./supabaseClient";
import type { FeedbackKind, FeedbackReport, FeedbackStatus } from "./feedback";
import type { MaintenanceRequest, MaintenanceRequestStatus, MaintenanceUrgency } from "./maintenanceRequests";
import type { PurchaseRequest, PurchaseStatus } from "./purchases";
import type {
  CatalogMaterial,
  MaterialCategory,
  MaterialSpool,
  MaterialUnit,
  SpoolStatus,
} from "./inventory";
import type {
  FundingAgencyRecord,
  FundingCategory,
  Project,
  ProjectFunding,
  ProjectStatus,
  ProjectTask,
  TaskStatus,
} from "./projects";
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
  Equipment,
  EquipmentBooking,
  EquipmentMaterial,
  EquipmentType,
  EquipmentStatus,
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
  "is_maintainer",
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

export async function updateIsMaintainer(profileId: string, value: boolean) {
  const { data, error } = await client()
    .from("profiles")
    .update({ is_maintainer: value })
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

const equipmentSelect =
  "id, name, model, location, status, notes, type_id, asset_tag, created_at, updated_at, type:equipment_types(id, name, uses_material, is_active)";

export async function listEquipment() {
  const { data, error } = await client().from("equipment").select(equipmentSelect).order("name");
  throwIfError(error);
  return (data ?? []) as unknown as Equipment[];
}

export type EquipmentInput = {
  name: string;
  model: string | null;
  location: string | null;
  status: EquipmentStatus;
  notes: string | null;
  type_id: string;
  asset_tag: string | null;
};

export async function createEquipment(params: EquipmentInput) {
  const { data, error } = await client().from("equipment").insert(params).select(equipmentSelect).single();
  throwIfError(error);
  return data as unknown as Equipment;
}

export async function updateEquipment(id: string, params: EquipmentInput) {
  const { data, error } = await client().from("equipment").update(params).eq("id", id).select(equipmentSelect).single();
  throwIfError(error);
  return data as unknown as Equipment;
}

export async function listEquipmentTypes() {
  const { data, error } = await client()
    .from("equipment_types")
    .select("id, name, uses_material, is_active")
    .eq("is_active", true)
    .order("name");
  throwIfError(error);
  return (data ?? []) as EquipmentType[];
}

export async function createEquipmentType(params: { name: string; uses_material: boolean }) {
  const { data, error } = await client()
    .from("equipment_types")
    .insert(params)
    .select("id, name, uses_material, is_active")
    .single();
  throwIfError(error);
  return data as EquipmentType;
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

export async function createMaterial(params: {
  name: string;
  description: string | null;
  category?: MaterialCategory;
  unit?: MaterialUnit;
}) {
  const { data, error } = await client()
    .from("materials")
    .insert({ ...params, is_active: true })
    .select("id, name, description, is_active")
    .single();
  throwIfError(error);
  return data as Material;
}

const catalogMaterialSelect = "id, name, description, is_active, category, unit";

// Catálogo completo (inclui arquivados), para a aba Materiais do Inventário.
export async function listCatalogMaterials() {
  const { data, error } = await client().from("materials").select(catalogMaterialSelect).order("name");
  throwIfError(error);
  return (data ?? []) as CatalogMaterial[];
}

export async function createCatalogMaterial(params: {
  name: string;
  description: string | null;
  category: MaterialCategory;
  unit: MaterialUnit;
}) {
  const { data, error } = await client()
    .from("materials")
    .insert({ ...params, is_active: true })
    .select(catalogMaterialSelect)
    .single();
  throwIfError(error);
  return data as CatalogMaterial;
}

export async function updateCatalogMaterial(
  id: string,
  params: { name: string; description: string | null; category: MaterialCategory; unit: MaterialUnit; is_active: boolean },
) {
  const { error } = await client().from("materials").update(params).eq("id", id);
  throwIfError(error);
}

// ---------------------------------------------------------------------------
// Inventário: rolos
// ---------------------------------------------------------------------------

const spoolSelect = [
  "id",
  "material_id",
  "color_name",
  "color_hex",
  "manufacturer",
  "diameter_mm",
  "lot_number",
  "initial_amount",
  "current_amount",
  "status",
  "project_id",
  "storage_location",
  "opened_on",
  "last_dried_on",
  "notes",
  "material:materials(name, unit)",
  "project:projects(name)",
].join(", ");

type SpoolRow = Omit<MaterialSpool, "material_name" | "unit" | "project_name" | "initial_amount" | "current_amount" | "diameter_mm"> & {
  initial_amount: number | string;
  current_amount: number | string;
  diameter_mm: number | string | null;
  material: { name: string; unit: MaterialUnit } | null;
  project: { name: string } | null;
};

function mapSpool(row: SpoolRow): MaterialSpool {
  const { material, project, ...spool } = row;
  return {
    ...spool,
    initial_amount: Number(row.initial_amount),
    current_amount: Number(row.current_amount),
    diameter_mm: row.diameter_mm === null ? null : Number(row.diameter_mm),
    material_name: material?.name ?? "",
    unit: material?.unit ?? "g",
    project_name: project?.name ?? null,
  };
}

export async function listSpools() {
  const { data, error } = await client().from("material_spools").select(spoolSelect).order("created_at", { ascending: false });
  throwIfError(error);
  return ((data ?? []) as unknown as SpoolRow[]).map(mapSpool);
}

export type SpoolInput = {
  material_id: string;
  color_name: string;
  color_hex: string | null;
  manufacturer: string | null;
  diameter_mm: number | null;
  lot_number: string | null;
  initial_amount: number;
  current_amount: number;
  status?: SpoolStatus;
  project_id: string | null;
  storage_location: string | null;
  opened_on: string | null;
  last_dried_on: string | null;
  notes: string | null;
};

export async function createSpool(params: SpoolInput) {
  const { error } = await client().from("material_spools").insert(params);
  throwIfError(error);
}

export async function updateSpool(id: string, params: Partial<SpoolInput>) {
  const { error } = await client().from("material_spools").update(params).eq("id", id);
  throwIfError(error);
}

// Registra quanto da impressão saiu do rolo (e abate do saldo). Reenviar corrige o valor.
export async function recordBookingUsage(bookingId: string, amount: number) {
  const { error } = await client().rpc("record_booking_usage", { p_booking_id: bookingId, p_amount: amount });
  throwIfError(error);
}

// Consumo por material nas impressões de um projeto (soma do que foi abatido dos rolos).
export async function listProjectConsumption(projectId: string) {
  const { data, error } = await client()
    .from("equipment_bookings")
    .select("consumed_amount, material:materials(name, unit)")
    .eq("project_id", projectId)
    .not("consumed_amount", "is", null);
  throwIfError(error);
  const totals = new Map<string, { name: string; unit: MaterialUnit; total: number }>();
  for (const row of (data ?? []) as unknown as Array<{ consumed_amount: number | string; material: { name: string; unit: MaterialUnit } | null }>) {
    if (!row.material) continue;
    const key = `${row.material.name}|${row.material.unit}`;
    const current = totals.get(key) ?? { name: row.material.name, unit: row.material.unit, total: 0 };
    current.total += Number(row.consumed_amount);
    totals.set(key, current);
  }
  return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function listEquipmentMaterials() {
  const { data, error } = await client()
    .from("equipment_materials")
    .select("equipment_id, material_id");
  throwIfError(error);
  return (data ?? []) as EquipmentMaterial[];
}

export async function setEquipmentMaterials(equipmentId: string, materialIds: string[]) {
  const { error } = await client().rpc("replace_equipment_materials", {
    p_equipment_id: equipmentId,
    p_material_ids: materialIds,
  });
  throwIfError(error);
}

export async function listBookings() {
  const { data, error } = await client()
    .from("equipment_bookings")
    .select(`
      id, equipment_id, profile_id, material_id, spool_id, consumed_amount, project_id, project_name, starts_at, ends_at,
      estimated_duration_minutes, status, notes, cancelled_at, cancelled_by,
      rejected_reason, rejected_at, rejected_by, approved_at, approved_by,
      equipment:equipment!equipment_bookings_equipment_id_fkey(id, name, model, location, status, notes, type_id, asset_tag, created_at, updated_at, type:equipment_types(id, name, uses_material, is_active)),
      material:materials!equipment_bookings_material_id_fkey(id, name, description, is_active),
      approved_by_profile:profiles!equipment_bookings_approved_by_fkey(full_name),
      rejected_by_profile:profiles!equipment_bookings_rejected_by_fkey(full_name),
      cancelled_by_profile:profiles!equipment_bookings_cancelled_by_fkey(full_name),
      profile:profiles!equipment_bookings_profile_id_fkey(id, full_name, email, role, academic_affiliation, funding_grants:profile_funding_grants(agency, agency_other, grant_name, weekly_hours, monthly_value), weekly_workload_hours, lattes_url, nationality_country_code, phone, bio, is_active, requires_booking_approval, is_maintainer, avatar_url, created_at, updated_at)
    `)
    .order("starts_at");
  throwIfError(error);

  return ((data ?? []) as unknown as Array<Record<string, unknown> & { profile?: Omit<PublicProfile, "first_name" | "last_name"> | null }>).map(
    (booking) => ({ ...booking, profile: booking.profile ? mapPublicProfile(booking.profile) : null }),
  ) as unknown as EquipmentBooking[];
}

// Coordinator feed: pending bookings awaiting a decision plus recent
// cancellations by someone else (a researcher cancelling their print also
// deserves the coordinator's attention).
export async function listCoordinatorBookingsAlertsSummary(profileId: string, signal?: AbortSignal) {
  const cutoff = new Date(Date.now() - BOOKING_ALERT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  let query = client()
    .from("equipment_bookings")
    .select(`
      id, project_name, starts_at, status, approved_at, rejected_at, rejected_reason,
      cancelled_at, cancelled_by,
      equipment:equipment!equipment_bookings_equipment_id_fkey(name),
      profile:profiles!equipment_bookings_profile_id_fkey(full_name),
      cancelled_by_profile:profiles!equipment_bookings_cancelled_by_fkey(full_name)
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
    equipment: { name: string } | null;
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
    equipment_name: booking.equipment?.name ?? "Equipamento removido",
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
    .from("equipment_bookings")
    .select(`
      id, project_name, starts_at, status, approved_at, rejected_at, rejected_reason,
      cancelled_at, cancelled_by,
      equipment:equipment!equipment_bookings_equipment_id_fkey(name),
      approved_by_profile:profiles!equipment_bookings_approved_by_fkey(full_name),
      rejected_by_profile:profiles!equipment_bookings_rejected_by_fkey(full_name),
      cancelled_by_profile:profiles!equipment_bookings_cancelled_by_fkey(full_name)
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
    equipment: { name: string } | null;
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
    equipment_name: booking.equipment?.name ?? "Equipamento removido",
    profile_name: "",
  })) as BookingAlertSummary[];
}

export async function listMaintenanceBlocks() {
  const { data, error } = await client()
    .from("maintenance_blocks")
    .select("id, equipment_id, created_by, starts_at, ends_at, reason, notes, created_at, updated_at")
    .order("starts_at");
  throwIfError(error);
  return (data ?? []) as MaintenanceBlock[];
}

export async function createBooking(params: {
  equipmentId: string;
  materialId?: string | null;
  spoolId?: string | null;
  projectId: string;
  startsAt: string;
  durationMinutes: number;
  notes?: string | null;
}) {
  const { data, error } = await client().rpc("create_booking", {
    p_equipment_id: params.equipmentId,
    p_material_id: params.materialId ?? undefined,
    p_spool_id: params.spoolId ?? undefined,
    p_project_id: params.projectId,
    p_starts_at: params.startsAt,
    p_estimated_duration_minutes: params.durationMinutes,
    p_notes: params.notes ?? undefined,
  });
  throwIfError(error);
  return data as EquipmentBooking;
}

export async function updateBooking(
  bookingId: string,
  params: {
    equipmentId: string;
    materialId?: string | null;
    spoolId?: string | null;
    projectId: string;
    startsAt: string;
    durationMinutes: number;
    notes?: string | null;
  },
) {
  const { data, error } = await client().rpc("update_booking", {
    p_booking_id: bookingId,
    p_equipment_id: params.equipmentId,
    p_material_id: params.materialId ?? undefined,
    p_spool_id: params.spoolId ?? undefined,
    p_project_id: params.projectId,
    p_starts_at: params.startsAt,
    p_estimated_duration_minutes: params.durationMinutes,
    p_notes: params.notes ?? undefined,
  });
  throwIfError(error);
  return data as EquipmentBooking;
}

export async function setBookingStatus(bookingId: string, status: EquipmentBooking["status"]) {
  const { data, error } = await client().rpc("set_booking_status", {
    p_booking_id: bookingId,
    p_status: status,
  });
  throwIfError(error);
  return data as EquipmentBooking;
}

export async function cancelBooking(bookingId: string) {
  const { data, error } = await client().rpc("cancel_booking", {
    p_booking_id: bookingId,
  });
  throwIfError(error);
  return data as EquipmentBooking;
}

export async function rejectBooking(bookingId: string, reason: string | null) {
  const { data, error } = await client().rpc("reject_booking", {
    p_booking_id: bookingId,
    p_reason: reason ?? undefined,
  });
  throwIfError(error);
  return data as EquipmentBooking;
}

// Reservas de um equipamento que ainda ocupam horário (pendentes, aprovadas ou em andamento), para avisar
// do conflito antes de bloquear para manutenção.
export async function listActiveBookingsForEquipment(equipmentId: string) {
  const { data, error } = await client()
    .from("equipment_bookings")
    .select("id, project_name, starts_at, ends_at, status, profile:profiles!equipment_bookings_profile_id_fkey(full_name)")
    .eq("equipment_id", equipmentId)
    .in("status", ["pending", "approved", "in_progress"])
    .gt("ends_at", new Date().toISOString())
    .order("starts_at");
  throwIfError(error);
  return ((data ?? []) as unknown as Array<{
    id: string;
    project_name: string;
    starts_at: string;
    ends_at: string;
    status: string;
    profile: { full_name: string } | null;
  }>).map((row) => ({
    id: row.id,
    project_name: row.project_name,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    person: row.profile?.full_name ?? null,
  }));
}

export type MaintenanceEpisodeRow = {
  id: string;
  equipment_id: string;
  reason: string;
  notes: string | null;
  expected_return_on: string | null;
  started_at: string;
  ended_at: string | null;
  resolution_notes: string | null;
  started_by_profile: { full_name: string } | null;
  ended_by_profile: { full_name: string } | null;
};

// Histórico completo de manutenção (episódios abertos e encerrados), do mais recente ao mais antigo.
export async function listMaintenanceEpisodes() {
  const { data, error } = await client()
    .from("equipment_maintenance")
    .select(
      "id, equipment_id, reason, notes, expected_return_on, started_at, ended_at, resolution_notes, started_by_profile:profiles!equipment_maintenance_started_by_fkey(full_name), ended_by_profile:profiles!equipment_maintenance_ended_by_fkey(full_name)",
    )
    .order("started_at", { ascending: false });
  throwIfError(error);
  return ((data ?? []) as unknown as MaintenanceEpisodeRow[]).map((row) => ({
    id: row.id,
    equipment_id: row.equipment_id,
    reason: row.reason,
    notes: row.notes,
    expected_return_on: row.expected_return_on,
    started_at: row.started_at,
    started_by_name: row.started_by_profile?.full_name ?? null,
    ended_at: row.ended_at,
    ended_by_name: row.ended_by_profile?.full_name ?? null,
    resolution_notes: row.resolution_notes,
  }));
}

export async function startEquipmentMaintenance(params: {
  equipmentId: string;
  reason: string;
  notes?: string | null;
  expectedReturnOn?: string | null;
  cancelBookings?: boolean;
}) {
  const { error } = await client().rpc("start_equipment_maintenance", {
    p_equipment_id: params.equipmentId,
    p_reason: params.reason,
    p_notes: params.notes ?? undefined,
    p_expected_return_on: params.expectedReturnOn ?? undefined,
    p_cancel_bookings: params.cancelBookings ?? false,
  });
  throwIfError(error);
}

export async function endEquipmentMaintenance(equipmentId: string, notes?: string | null) {
  const { error } = await client().rpc("end_equipment_maintenance", {
    p_equipment_id: equipmentId,
    p_notes: notes ?? undefined,
  });
  throwIfError(error);
}

// ---------------------------------------------------------------------------
// Projetos, membros e fomento
// ---------------------------------------------------------------------------

const projectSelect = [
  "id",
  "name",
  "description",
  "status",
  "starts_on",
  "ends_on",
  "created_at",
  "updated_at",
  "members:project_members(profile_id, profile:profiles!project_members_profile_id_fkey(full_name, avatar_url))",
  "funding:project_funding(agency_id, process_number, grant_name, starts_on, ends_on, agency:funding_agencies(acronym), items:project_funding_items(category, description, amount))",
].join(", ");

type ProjectRow = Omit<Project, "members" | "funding"> & {
  members: Array<{ profile_id: string; profile: { full_name: string; avatar_url: string | null } | null }>;
  funding: Array<
    Omit<ProjectFunding, "agency_acronym" | "items"> & {
      agency: { acronym: string } | null;
      items: Array<{ category: FundingCategory; description: string | null; amount: number | string }>;
    }
  >;
};

function mapProject(row: ProjectRow): Project {
  return {
    ...row,
    members: (row.members ?? [])
      .map((member) => ({
        profile_id: member.profile_id,
        full_name: member.profile?.full_name ?? "",
        avatar_url: member.profile?.avatar_url ?? null,
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR")),
    funding: (row.funding ?? []).map((funding) => ({
      agency_id: funding.agency_id,
      agency_acronym: funding.agency?.acronym ?? "",
      process_number: funding.process_number,
      grant_name: funding.grant_name,
      starts_on: funding.starts_on,
      ends_on: funding.ends_on,
      items: (funding.items ?? []).map((item) => ({
        category: item.category,
        description: item.description,
        amount: Number(item.amount),
      })),
    })),
  };
}

export async function listProjects() {
  const { data, error } = await client().from("projects").select(projectSelect).order("name");
  throwIfError(error);
  return ((data ?? []) as unknown as ProjectRow[]).map(mapProject);
}

export async function getProject(id: string) {
  const { data, error } = await client().from("projects").select(projectSelect).eq("id", id).maybeSingle();
  throwIfError(error);
  return data ? mapProject(data as unknown as ProjectRow) : null;
}

export type ProjectInput = {
  name: string;
  description: string | null;
  status: ProjectStatus;
  starts_on: string | null;
  ends_on: string | null;
};

export async function createProject(params: ProjectInput) {
  const { data, error } = await client().from("projects").insert(params).select("id").single();
  throwIfError(error);
  return (data as { id: string }).id;
}

export async function updateProject(id: string, params: ProjectInput) {
  const { error } = await client().from("projects").update(params).eq("id", id);
  throwIfError(error);
}

export async function replaceProjectMembers(projectId: string, profileIds: string[]) {
  const { error } = await client().rpc("replace_project_members", {
    p_project_id: projectId,
    p_profile_ids: profileIds,
  });
  throwIfError(error);
}

export type ProjectFundingInput = {
  agency_id: string;
  process_number: string | null;
  grant_name: string | null;
  starts_on: string | null;
  ends_on: string | null;
  items: Array<{ category: FundingCategory; description: string | null; amount: number }>;
};

export async function replaceProjectFunding(projectId: string, funding: ProjectFundingInput[]) {
  const { error } = await client().rpc("replace_project_funding", {
    p_project_id: projectId,
    p_funding: funding,
  });
  throwIfError(error);
}

export async function listFundingAgencies() {
  const { data, error } = await client()
    .from("funding_agencies")
    .select("id, acronym, name, is_active")
    .eq("is_active", true)
    .order("acronym");
  throwIfError(error);
  return (data ?? []) as FundingAgencyRecord[];
}

export async function createFundingAgency(params: { acronym: string; name: string | null }) {
  const { data, error } = await client()
    .from("funding_agencies")
    .insert(params)
    .select("id, acronym, name, is_active")
    .single();
  throwIfError(error);
  return data as FundingAgencyRecord;
}

// ---------------------------------------------------------------------------
// Tarefas dos projetos (kanban)
// ---------------------------------------------------------------------------

const taskSelect = [
  "id",
  "project_id",
  "title",
  "description",
  "status",
  "position",
  "due_on",
  "created_by",
  "project:projects(name)",
  "assignees:project_task_assignees(profile_id, profile:profiles!project_task_assignees_profile_id_fkey(full_name, avatar_url))",
].join(", ");

type TaskRow = Omit<ProjectTask, "project_name" | "assignees"> & {
  project: { name: string } | null;
  assignees: Array<{ profile_id: string; profile: { full_name: string; avatar_url: string | null } | null }>;
};

function mapTask(row: TaskRow): ProjectTask {
  const { project, assignees, ...task } = row;
  return {
    ...task,
    project_name: project?.name ?? null,
    assignees: (assignees ?? [])
      .map((assignee) => ({
        profile_id: assignee.profile_id,
        full_name: assignee.profile?.full_name ?? "",
        avatar_url: assignee.profile?.avatar_url ?? null,
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR")),
  };
}

export async function listProjectTasks(projectId: string) {
  const { data, error } = await client().from("project_tasks").select(taskSelect).eq("project_id", projectId);
  throwIfError(error);
  return ((data ?? []) as unknown as TaskRow[]).map(mapTask);
}

// Todas as tarefas que a pessoa pode ver (coordenador: todas; pesquisador: as dos seus projetos).
export async function listVisibleTasks() {
  const { data, error } = await client().from("project_tasks").select(taskSelect);
  throwIfError(error);
  return ((data ?? []) as unknown as TaskRow[]).map(mapTask);
}

// Tarefas em que a pessoa é responsável, de todos os projetos.
export async function listMyTasks(profileId: string) {
  const { data, error } = await client()
    .from("project_tasks")
    .select(`${taskSelect}, mine:project_task_assignees!inner(profile_id)`)
    .eq("mine.profile_id", profileId);
  throwIfError(error);
  return ((data ?? []) as unknown as TaskRow[]).map(mapTask);
}

export type TaskInput = {
  title: string;
  description: string | null;
  status: TaskStatus;
  due_on: string | null;
};

export async function createProjectTask(projectId: string, params: TaskInput) {
  const { data, error } = await client()
    .from("project_tasks")
    .insert({ project_id: projectId, ...params })
    .select("id")
    .single();
  throwIfError(error);
  return (data as { id: string }).id;
}

export async function updateProjectTask(id: string, params: Partial<TaskInput>) {
  const { error } = await client().from("project_tasks").update(params).eq("id", id);
  throwIfError(error);
}

export async function deleteProjectTask(id: string) {
  const { error } = await client().from("project_tasks").delete().eq("id", id);
  throwIfError(error);
}

export async function setTaskAssignees(taskId: string, profileIds: string[]) {
  const { error } = await client().rpc("set_task_assignees", { p_task_id: taskId, p_profile_ids: profileIds });
  throwIfError(error);
}

// ---------------------------------------------------------------------------
// Feedback (sugestões e erros)
// ---------------------------------------------------------------------------

export async function createFeedback(params: { kind: FeedbackKind; message: string; pagePath: string; userAgent: string }) {
  const { error } = await client().from("feedback_reports").insert({
    kind: params.kind,
    message: params.message.trim(),
    page_path: params.pagePath,
    user_agent: params.userAgent,
  });
  throwIfError(error);
}

// Coordenador: tudo o que foi enviado, com quem enviou.
export async function listFeedback() {
  const { data, error } = await client()
    .from("feedback_reports")
    .select(
      "id, kind, message, page_path, user_agent, status, coordinator_note, created_at, author:profiles!feedback_reports_created_by_fkey(full_name, email)",
    )
    .order("created_at", { ascending: false });
  throwIfError(error);
  return ((data ?? []) as unknown as Array<
    Omit<FeedbackReport, "author_name" | "author_email"> & { author: { full_name: string; email: string } | null }
  >).map(({ author, ...row }) => ({
    ...row,
    author_name: author?.full_name ?? null,
    author_email: author?.email ?? null,
  })) as FeedbackReport[];
}

export async function updateFeedback(id: string, params: { status: FeedbackStatus; coordinator_note: string | null }) {
  const { error } = await client().from("feedback_reports").update(params).eq("id", id);
  throwIfError(error);
}

export async function countNewFeedback() {
  const { count, error } = await client()
    .from("feedback_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  throwIfError(error);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Chamados de manutenção
// ---------------------------------------------------------------------------

type MaintenanceRequestRow = Omit<MaintenanceRequest, "equipment_name" | "equipment_type_id" | "requested_by_name" | "assigned_to_name"> & {
  equipment: { name: string; type_id: string } | null;
  requester: { full_name: string } | null;
  assignee: { full_name: string } | null;
};

export async function listMaintenanceRequests() {
  const { data, error } = await client()
    .from("maintenance_requests")
    .select(
      "id, equipment_id, description, urgency, status, requested_by, assigned_to, resolution_notes, resolved_at, photo_paths, created_at, equipment:equipment!maintenance_requests_equipment_id_fkey(name, type_id), requester:profiles!maintenance_requests_requested_by_fkey(full_name), assignee:profiles!maintenance_requests_assigned_to_fkey(full_name)",
    )
    .order("created_at", { ascending: false });
  throwIfError(error);
  return ((data ?? []) as unknown as MaintenanceRequestRow[]).map(({ assignee, equipment, requester, ...row }) => ({
    ...row,
    equipment_name: equipment?.name ?? "Equipamento removido",
    equipment_type_id: equipment?.type_id ?? null,
    requested_by_name: requester?.full_name ?? null,
    assigned_to_name: assignee?.full_name ?? null,
  })) as MaintenanceRequest[];
}

export async function uploadMaintenancePhotos(blobs: Blob[]) {
  const { data: userData, error: userError } = await client().auth.getUser();
  throwIfError(userError);
  const userId = userData.user?.id;
  if (!userId) throw new Error("Usuario nao autenticado.");

  const paths: string[] = [];
  for (const blob of blobs) {
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const { error } = await client().storage.from("maintenance-photos").upload(path, blob, { contentType: "image/jpeg" });
    throwIfError(error);
    paths.push(path);
  }
  return paths;
}

// Enderecos temporarios (1 hora) para exibir as fotos do bucket privado.
export async function getMaintenancePhotoUrls(paths: string[]) {
  const urls: Record<string, string> = {};
  if (paths.length === 0) return urls;
  const { data, error } = await client().storage.from("maintenance-photos").createSignedUrls(paths, 3600);
  throwIfError(error);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}

export async function createMaintenanceRequest(params: {
  equipmentId: string;
  description: string;
  urgency: MaintenanceUrgency;
  photoPaths?: string[];
}) {
  const { error } = await client().from("maintenance_requests").insert({
    equipment_id: params.equipmentId,
    description: params.description.trim(),
    urgency: params.urgency,
    photo_paths: params.photoPaths ?? [],
  });
  throwIfError(error);
}

export async function setMaintenanceRequestStatus(params: {
  requestId: string;
  status: MaintenanceRequestStatus;
  resolutionNotes?: string | null;
  assignedTo?: string | null;
}) {
  const { error } = await client().rpc("set_maintenance_request_status", {
    p_request_id: params.requestId,
    p_status: params.status,
    p_resolution_notes: params.resolutionNotes ?? undefined,
    p_assigned_to: params.assignedTo ?? undefined,
  });
  throwIfError(error);
}

// Chamados abertos (aguardando alguém começar) e quantos deles são urgentes.
export async function countOpenMaintenanceRequests() {
  const { data, error } = await client().from("maintenance_requests").select("urgency").eq("status", "open").limit(500);
  throwIfError(error);
  const rows = (data ?? []) as Array<{ urgency: MaintenanceUrgency }>;
  return { open: rows.length, urgent: rows.filter((row) => row.urgency === "urgent").length };
}

export async function getEquipmentName(equipmentId: string) {
  const { data, error } = await client().from("equipment").select("name").eq("id", equipmentId).maybeSingle();
  throwIfError(error);
  return (data as { name: string } | null)?.name ?? null;
}

// ---------------------------------------------------------------------------
// Compras
// ---------------------------------------------------------------------------

type PurchaseRequestRow = Omit<PurchaseRequest, "project_name" | "requested_by_name" | "decided_by_name" | "estimated_amount" | "actual_amount"> & {
  estimated_amount: number | string;
  actual_amount: number | string | null;
  project: { name: string } | null;
  requester: { full_name: string } | null;
  decider: { full_name: string } | null;
};

export async function listPurchaseRequests() {
  const { data, error } = await client()
    .from("purchase_requests")
    .select(
      "id, project_id, requested_by, item, url, quantity, estimated_amount, notes, status, decided_at, rejected_reason, actual_amount, purchased_at, delivered_at, created_at, project:projects!purchase_requests_project_id_fkey(name), requester:profiles!purchase_requests_requested_by_fkey(full_name), decider:profiles!purchase_requests_decided_by_fkey(full_name)",
    )
    .order("created_at", { ascending: false });
  throwIfError(error);
  return ((data ?? []) as unknown as PurchaseRequestRow[]).map(({ decider, project, requester, ...row }) => ({
    ...row,
    estimated_amount: Number(row.estimated_amount),
    actual_amount: row.actual_amount === null ? null : Number(row.actual_amount),
    project_name: project?.name ?? "Projeto removido",
    requested_by_name: requester?.full_name ?? null,
    decided_by_name: decider?.full_name ?? null,
  })) as PurchaseRequest[];
}

export type PurchaseInput = { item: string; url: string | null; quantity: number; estimatedAmount: number; notes: string | null };

export async function createPurchaseRequest(input: PurchaseInput & { projectId: string }) {
  const { error } = await client().from("purchase_requests").insert({
    project_id: input.projectId,
    item: input.item.trim(),
    url: input.url?.trim() || null,
    quantity: input.quantity,
    estimated_amount: input.estimatedAmount,
    notes: input.notes?.trim() || null,
  });
  throwIfError(error);
}

export async function updatePurchaseRequest(requestId: string, input: PurchaseInput) {
  const { error } = await client().rpc("update_purchase_request", {
    p_request_id: requestId,
    p_item: input.item,
    p_url: input.url ?? "",
    p_quantity: input.quantity,
    p_estimated_amount: input.estimatedAmount,
    p_notes: input.notes ?? undefined,
  });
  throwIfError(error);
}

export async function setPurchaseStatus(params: { requestId: string; status: PurchaseStatus; reason?: string | null; actualAmount?: number | null }) {
  const { error } = await client().rpc("set_purchase_status", {
    p_request_id: params.requestId,
    p_status: params.status,
    p_reason: params.reason ?? undefined,
    p_actual_amount: params.actualAmount ?? undefined,
  });
  throwIfError(error);
}

export async function countRequestedPurchases() {
  const { count, error } = await client().from("purchase_requests").select("id", { count: "exact", head: true }).eq("status", "requested");
  throwIfError(error);
  return count ?? 0;
}
