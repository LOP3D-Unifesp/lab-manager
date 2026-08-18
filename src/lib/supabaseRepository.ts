import { supabase } from "./supabaseClient";
import {
  AvailabilitySlot,
  AcademicAffiliation,
  InitialCatalogInput,
  InstallationState,
  LabSettings,
  MaintenanceBlock,
  Material,
  Printer,
  PrinterBooking,
  PrinterMaterial,
  PrinterStatus,
  PublicProfile,
  ProfileRole,
  ProfileSkill,
  Skill,
  WorkMode,
  mapPublicProfile,
  periodoFromTimes,
  periodos,
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
  "is_scholarship_holder",
  "weekly_workload_hours",
  "lattes_url",
  "nationality_country_code",
  "phone",
  "bio",
  "is_active",
  "created_at",
  "updated_at",
].join(", ");

export type ProfileInput = {
  fullName: string;
  academicAffiliation: AcademicAffiliation | null;
  birthDate: string | null;
  isScholarshipHolder: boolean;
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

function profileRpcArgs(params: ProfileInput) {
  return {
    p_full_name: params.fullName,
    p_academic_affiliation: params.academicAffiliation ?? undefined,
    p_birth_date: params.birthDate ?? undefined,
    p_is_scholarship_holder: params.isScholarshipHolder,
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
  return mapPublicProfile(data as unknown as Omit<PublicProfile, "first_name" | "last_name">);
}

export async function createMyProfile(params: ProfileInput) {
  const { data, error } = await client().rpc("create_profile", profileRpcArgs(params));
  throwIfError(error);
  return mapPublicProfile(data as unknown as Omit<PublicProfile, "first_name" | "last_name">);
}

export async function inviteUser(email: string) {
  const { data, error } = await client().functions.invoke("invite-user", {
    body: { email: email.trim().toLowerCase() },
  });
  throwIfError(error);
  return data;
}

export async function setMyPassword(password: string) {
  const { error } = await client().auth.updateUser({ password });
  throwIfError(error);
}

export async function getInstallationState(): Promise<InstallationState> {
  const { data, error } = await client()
    .from("lab_settings")
    .select(
      "id, name, acronym, timezone, setup_completed_at, created_by, updated_by, created_at, updated_at",
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
  catalog: InitialCatalogInput;
}) {
  const { data, error } = await client().rpc("complete_lab_installation", {
    p_name: params.name.trim(),
    p_acronym: params.acronym.trim(),
    p_timezone: params.timezone,
    p_materials: params.catalog.materials.map((material) => ({
      name: material.name.trim(),
      description: material.description?.trim() || null,
    })),
    p_printers: params.catalog.printers.map((printer) => ({
      name: printer.name.trim(),
      model: printer.model?.trim() || null,
      location: printer.location?.trim() || null,
      notes: printer.notes?.trim() || null,
      material_names: printer.materialNames,
    })),
  });

  throwIfError(error);
  return data as LabSettings;
}

export async function updateLabSettings(params: {
  name: string;
  acronym: string;
  timezone: string;
}) {
  const { data, error } = await client().rpc("update_lab_settings", {
    p_name: params.name.trim(),
    p_acronym: params.acronym.trim(),
    p_timezone: params.timezone,
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

export async function listSkills() {
  const { data, error } = await client()
    .from("skills")
    .select("id, name, description, is_active")
    .eq("is_active", true)
    .order("name");
  throwIfError(error);
  return (data ?? []) as Skill[];
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
    .select("id, profile_id, weekday, starts_at, ends_at, work_mode")
    .order("weekday")
    .order("starts_at");
  throwIfError(error);

  return ((data ?? []) as Omit<AvailabilitySlot, "periodo">[]).map((slot) => ({
    ...slot,
    periodo: periodoFromTimes(slot.starts_at, slot.ends_at),
  }));
}

export async function addAvailabilitySlots(
  profileId: string,
  slots: Array<{ weekday: number; periodo: PeriodoId; workMode?: WorkMode }>,
) {
  const rows = slots.map((slot) => {
    const periodo = periodos.find((item) => item.id === slot.periodo);
    if (!periodo) throw new Error("Periodo invalido.");
    return {
      profile_id: profileId,
      weekday: slot.weekday,
      starts_at: periodo.starts_at,
      ends_at: periodo.ends_at,
      work_mode: slot.workMode ?? ("onsite" satisfies WorkMode),
    };
  });

  const { error } = await client()
    .from("availability_slots")
    .upsert(rows, { onConflict: "profile_id,weekday,starts_at,ends_at" });
  throwIfError(error);
}

export async function saveProfileAvailability(
  profileId: string,
  slots: Array<{ weekday: number; periodo: PeriodoId; workMode: WorkMode }>,
) {
  const rows = slots.map((slot) => {
    const periodo = periodos.find((item) => item.id === slot.periodo);
    if (!periodo) throw new Error("Periodo invalido.");
    return {
      weekday: slot.weekday,
      starts_at: periodo.starts_at,
      ends_at: periodo.ends_at,
      work_mode: slot.workMode,
    };
  });

  const { error } = await client().rpc("replace_profile_availability", {
    p_profile_id: profileId,
    p_slots: rows,
  });
  throwIfError(error);
}

export async function deleteAvailabilitySlot(slotId: string) {
  const { error } = await client().from("availability_slots").delete().eq("id", slotId);
  throwIfError(error);
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
      printer:printers!printer_bookings_printer_id_fkey(id, name, model, location, status, notes, created_at, updated_at),
      material:materials!printer_bookings_material_id_fkey(id, name, description, is_active),
      profile:profiles!printer_bookings_profile_id_fkey(id, full_name, email, role, academic_affiliation, is_scholarship_holder, weekly_workload_hours, lattes_url, nationality_country_code, phone, bio, is_active, created_at, updated_at)
    `)
    .order("starts_at");
  throwIfError(error);

  return ((data ?? []) as unknown as Array<Record<string, unknown> & { profile?: Omit<PublicProfile, "first_name" | "last_name"> | null }>).map(
    (booking) => ({ ...booking, profile: booking.profile ? mapPublicProfile(booking.profile) : null }),
  ) as unknown as PrinterBooking[];
}

export async function createBooking(params: {
  printerId: string;
  materialId: string;
  projectName: string;
  startsAt: string;
  durationMinutes: number;
}) {
  const { data, error } = await client().rpc("create_printer_booking", {
    p_printer_id: params.printerId,
    p_material_id: params.materialId,
    p_project_name: params.projectName,
    p_starts_at: params.startsAt,
    p_estimated_duration_minutes: params.durationMinutes,
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
