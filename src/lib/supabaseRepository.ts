import { supabase } from "./supabaseClient";
import {
  AvailabilitySlot,
  AcademicAffiliation,
  Material,
  Printer,
  PrinterBooking,
  PrinterMaterial,
  PrinterStatus,
  Profile,
  ProfileSkill,
  Skill,
  WorkMode,
  mapProfile,
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
  if (error) {
    throw error;
  }
}

const profileSelect = [
  "id",
  "full_name",
  "email",
  "role",
  "academic_affiliation",
  "birth_date",
  "is_scholarship_holder",
  "weekly_workload_hours",
  "lattes_url",
  "cpf",
  "rg",
  "postal_code",
  "street",
  "address_number",
  "address_complement",
  "neighborhood",
  "city",
  "state",
  "country",
  "phone",
  "is_active",
  "created_at",
  "updated_at",
].join(", ");

export async function listProfiles() {
  const { data, error } = await client()
    .from("profiles")
    .select(
      "id, full_name, email, role, academic_affiliation, is_scholarship_holder, weekly_workload_hours, lattes_url, phone, is_active, created_at, updated_at",
    )
    .eq("is_active", true)
    .order("full_name");

  throwIfError(error);
  return ((data ?? []) as Array<Omit<Profile, "first_name" | "last_name">>).map(mapProfile);
}

export async function updateMyProfile(
  profileId: string,
  params: {
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
    phone: string | null;
  },
) {
  const { data, error } = await client()
    .from("profiles")
    .update({
      full_name: params.fullName,
      academic_affiliation: params.academicAffiliation,
      birth_date: params.birthDate,
      is_scholarship_holder: params.isScholarshipHolder,
      weekly_workload_hours: params.weeklyWorkloadHours,
      lattes_url: params.lattesUrl,
      cpf: params.cpf,
      rg: params.rg,
      postal_code: params.postalCode,
      street: params.street,
      address_number: params.addressNumber,
      address_complement: params.addressComplement,
      neighborhood: params.neighborhood,
      city: params.city,
      state: params.state,
      country: params.country,
      phone: params.phone,
    })
    .eq("id", profileId)
    .select(profileSelect)
    .single();

  throwIfError(error);
  return mapProfile(data as unknown as Omit<Profile, "first_name" | "last_name">);
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
  const { data, error } = await client()
    .from("profile_skills")
    .select("profile_id, skill_id");

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

    if (!periodo) {
      throw new Error("Periodo invalido.");
    }

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
  const db = client();
  const { error: deleteError } = await db
    .from("availability_slots")
    .delete()
    .eq("profile_id", profileId);
  throwIfError(deleteError);

  if (slots.length === 0) {
    return;
  }

  const rows = slots.map((slot) => {
    const periodo = periodos.find((item) => item.id === slot.periodo);

    if (!periodo) {
      throw new Error("Periodo invalido.");
    }

    return {
      profile_id: profileId,
      weekday: slot.weekday,
      starts_at: periodo.starts_at,
      ends_at: periodo.ends_at,
      work_mode: slot.workMode,
    };
  });

  const { error } = await db.from("availability_slots").insert(rows);
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
    .insert({
      name: params.name,
      model: params.model,
      location: params.location,
      status: params.status ?? "active",
      notes: params.notes,
    })
    .select("id, name, model, location, status, notes, created_at, updated_at")
    .single();

  throwIfError(error);
  return data as Printer;
}

export async function updatePrinter(
  id: string,
  params: {
    name: string;
    model: string | null;
    location: string | null;
    status: PrinterStatus;
    notes: string | null;
  },
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
    .insert({ name: params.name, description: params.description, is_active: true })
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
  const db = client();
  const { error: deleteError } = await db
    .from("printer_materials")
    .delete()
    .eq("printer_id", printerId);
  throwIfError(deleteError);

  if (materialIds.length === 0) {
    return;
  }

  const { error } = await db.from("printer_materials").insert(
    materialIds.map((materialId) => ({
      printer_id: printerId,
      material_id: materialId,
    })),
  );
  throwIfError(error);
}

export async function listBookings() {
  const { data, error } = await client()
    .from("printer_bookings")
    .select(`
      id,
      printer_id,
      profile_id,
      material_id,
      project_name,
      starts_at,
      ends_at,
      estimated_duration_minutes,
      status,
      notes,
      cancelled_at,
      cancelled_by,
      printer:printers!printer_bookings_printer_id_fkey(id, name, model, location, status, notes, created_at, updated_at),
      material:materials!printer_bookings_material_id_fkey(id, name, description, is_active),
      profile:profiles!printer_bookings_profile_id_fkey(id, full_name, email, role, academic_affiliation, is_scholarship_holder, weekly_workload_hours, lattes_url, phone, is_active, created_at, updated_at)
    `)
    .order("starts_at");

  throwIfError(error);

  return ((data ?? []) as any[]).map((booking) => ({
    ...booking,
    profile: booking.profile ? mapProfile(booking.profile) : null,
  })) as PrinterBooking[];
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
