import { createClient } from "@supabase/supabase-js";

export async function seedDemo(environment) {
  const client = createClient(environment.url, environment.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: settings, error: settingsError } = await client.from("lab_settings").select("setup_completed_at").eq("id", true).single();
  if (settingsError) throw settingsError;
  if (!settings.setup_completed_at) throw new Error("Conclua o wizard antes de adicionar os dados de demonstração.");

  const { data: material, error: materialError } = await client.from("materials").upsert({ name: "PLA Demo", description: "Material fictício para desenvolvimento", is_active: true }, { onConflict: "name" }).select("id").single();
  if (materialError) throw materialError;
  const { data: printer, error: printerError } = await client.from("printers").upsert({ name: "Impressora Demo", model: "Modelo local", location: "Bancada de testes", status: "active" }, { onConflict: "name" }).select("id").single();
  if (printerError) throw printerError;
  const { error: relationError } = await client.from("printer_materials").upsert({ printer_id: printer.id, material_id: material.id });
  if (relationError) throw relationError;

  const { data: skill, error: skillError } = await client
    .from("skills")
    .upsert(
      { name: "Modelagem CAD Demo", description: "Competência fictícia para validar busca e perfis", is_active: true },
      { onConflict: "name" },
    )
    .select("id")
    .single();
  if (skillError) throw skillError;

  const { data: coordinator, error: coordinatorError } = await client
    .from("profiles")
    .select("id")
    .eq("role", "coordinator")
    .eq("is_active", true)
    .order("created_at")
    .limit(1)
    .single();
  if (coordinatorError) throw coordinatorError;

  const { error: profileSkillError } = await client
    .from("profile_skills")
    .upsert({ profile_id: coordinator.id, skill_id: skill.id }, { onConflict: "profile_id,skill_id" });
  if (profileSkillError) throw profileSkillError;

  const { error: availabilityError } = await client
    .from("availability_slots")
    .upsert(
      { profile_id: coordinator.id, weekday: 3, starts_at: "13:30", ends_at: "15:30", work_mode: "onsite" },
      { onConflict: "profile_id,weekday,starts_at,ends_at" },
    );
  if (availabilityError) throw availabilityError;

  const { data: existingProject, error: lookupError } = await client
    .from("projects")
    .select("id")
    .eq("name", "Projeto Demo")
    .maybeSingle();
  if (lookupError) throw lookupError;
  let project = existingProject;
  if (!project) {
    const { data: created, error: projectError } = await client
      .from("projects")
      .insert({ name: "Projeto Demo", description: "Projeto fictício para desenvolvimento", status: "active", created_by: coordinator.id })
      .select("id")
      .single();
    if (projectError) throw projectError;
    project = created;
  }
  const { error: memberError } = await client
    .from("project_members")
    .upsert({ project_id: project.id, profile_id: coordinator.id }, { onConflict: "project_id,profile_id" });
  if (memberError) throw memberError;

  const bookingStart = new Date();
  bookingStart.setDate(bookingStart.getDate() + 2);
  bookingStart.setHours(10, 0, 0, 0);
  const bookingEnd = new Date(bookingStart.getTime() + 90 * 60 * 1000);
  const { error: bookingError } = await client.from("printer_bookings").upsert(
    {
      id: "40000000-0000-0000-0000-000000000001",
      printer_id: printer.id,
      profile_id: coordinator.id,
      material_id: material.id,
      project_id: project.id,
      project_name: "Projeto Demo",
      starts_at: bookingStart.toISOString(),
      ends_at: bookingEnd.toISOString(),
      estimated_duration_minutes: 90,
      status: "approved",
      notes: "Reserva fictícia para validar a agenda.",
      cancelled_at: null,
      cancelled_by: null,
    },
    { onConflict: "id" },
  );
  if (bookingError) throw bookingError;

  const maintenanceStart = new Date();
  maintenanceStart.setDate(maintenanceStart.getDate() + 3);
  maintenanceStart.setHours(14, 0, 0, 0);
  const maintenanceEnd = new Date(maintenanceStart.getTime() + 2 * 60 * 60 * 1000);
  const { error: maintenanceError } = await client.from("maintenance_blocks").upsert(
    {
      id: "50000000-0000-0000-0000-000000000001",
      printer_id: printer.id,
      created_by: coordinator.id,
      starts_at: maintenanceStart.toISOString(),
      ends_at: maintenanceEnd.toISOString(),
      reason: "Manutenção preventiva demo",
      notes: "Bloqueio fictício para validar conflitos.",
    },
    { onConflict: "id" },
  );
  if (maintenanceError) throw maintenanceError;
  console.log("Dados de demonstração adicionados ao banco.");
}
