import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { bootstrapAdmin, isLoopbackUrl } from "./bootstrap-lib.mjs";

const root = resolve(import.meta.dirname, "..");
const command = process.argv[2];

function supabase(args, capture = false) {
  const isWindows = process.platform === "win32";
  const executable = isWindows ? process.env.ComSpec ?? "cmd.exe" : "supabase";
  const executableArgs = isWindows
    ? ["/d", "/s", "/c", `supabase ${args.join(" ")}`]
    : args;
  const result = spawnSync(executable, executableArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.status !== 0) {
    if (capture && result.stderr) process.stderr.write(result.stderr);
    throw new Error(
      `Falha ao executar supabase ${args.join(" ")}: ${result.error?.message ?? `código ${result.status}`}.`,
    );
  }
  return result.stdout ?? "";
}

function statusEnvironment() {
  const output = supabase(["status", "-o", "env"], true);
  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  const url = values.API_URL;
  const publicKey = values.PUBLISHABLE_KEY ?? values.ANON_KEY;
  // The cleanup Edge Function deliberately compares the bearer token with
  // SUPABASE_SERVICE_ROLE_KEY, so prefer that exact legacy JWT when both the
  // legacy and the newer sb_secret key are exposed by the CLI.
  const serviceKey = values.SERVICE_ROLE_KEY ?? values.SECRET_KEY;
  if (!url || !publicKey || !serviceKey) throw new Error("O Supabase local não retornou as credenciais esperadas.");
  if (!isLoopbackUrl(url)) throw new Error("A automação local recusou uma URL não local.");
  return { url, publicKey, serviceKey };
}

function configureFrontend(environment) {
  writeFileSync(
    resolve(root, ".env.development.local"),
    [`VITE_APP_ENV=local`, `VITE_SUPABASE_URL=${environment.url}`, `VITE_SUPABASE_ANON_KEY=${environment.publicKey}`, ""].join("\n"),
    { encoding: "utf8", mode: 0o600 },
  );
}

async function bootstrapLocal(environment) {
  await bootstrapAdmin({
    url: environment.url,
    serviceKey: environment.serviceKey,
    email: "admin@lab.local",
    name: "Administrador Local",
    password: "LabManager123!",
  });
  const client = createClient(environment.url, environment.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.rpc("configure_invitation_cleanup", {
    p_function_url: "http://host.docker.internal:55321/functions/v1/cleanup-invitations",
    p_secret: environment.serviceKey,
  });
  if (error) throw error;
  console.log("Coordenador local criado: admin@lab.local / LabManager123!");
  console.log("Limpeza horária de convites configurada no Supabase local.");
}

async function seedDemo(environment) {
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
      project_name: "Protótipo Demo",
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
  console.log("Dados de demonstração adicionados ao banco local.");
}

async function cleanE2e(environment) {
  const client = createClient(environment.url, environment.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [{ data: printers, error: printersError }, { data: materials, error: materialsError }, { data: skills, error: skillsError }, { data: profiles, error: profilesError }] = await Promise.all([
    client.from("printers").select("id").ilike("name", "Impressora E2E %"),
    client.from("materials").select("id").ilike("name", "PLA E2E %"),
    client.from("skills").select("id").ilike("name", "Modelagem E2E %"),
    client.from("profiles").select("id,email").ilike("email", "pesquisador.e2e.%@example.com"),
  ]);
  for (const error of [printersError, materialsError, skillsError, profilesError]) if (error) throw error;

  const printerIds = (printers ?? []).map((item) => item.id);
  const materialIds = (materials ?? []).map((item) => item.id);
  const skillIds = (skills ?? []).map((item) => item.id);
  const profileIds = (profiles ?? []).map((item) => item.id);

  if (profileIds.length) {
    const { error } = await client.from("invitations").delete().in("accepted_by", profileIds);
    if (error) throw error;
  }
  const { error: pendingInvitationsError } = await client.from("invitations").delete().ilike("email", "pesquisador.e2e.%@example.com");
  if (pendingInvitationsError) throw pendingInvitationsError;

  if (printerIds.length) {
    for (const table of ["printer_bookings", "maintenance_blocks", "printer_materials"]) {
      const { error } = await client.from(table).delete().in("printer_id", printerIds);
      if (error) throw error;
    }
  }
  if (materialIds.length) {
    const { error: bookingsError } = await client.from("printer_bookings").delete().in("material_id", materialIds);
    if (bookingsError) throw bookingsError;
    const { error: relationsError } = await client.from("printer_materials").delete().in("material_id", materialIds);
    if (relationsError) throw relationsError;
  }
  if (skillIds.length) {
    const { error } = await client.from("profile_skills").delete().in("skill_id", skillIds);
    if (error) throw error;
  }
  if (profileIds.length) {
    for (const table of ["printer_bookings", "profile_skills", "availability_slots", "profile_private_data"]) {
      const column = table === "printer_bookings" || table === "availability_slots" ? "profile_id" : "profile_id";
      const { error } = await client.from(table).delete().in(column, profileIds);
      if (error) throw error;
    }
    const { error } = await client.from("profiles").delete().in("id", profileIds);
    if (error) throw error;
  }

  if (printerIds.length) {
    const { error } = await client.from("printers").delete().in("id", printerIds);
    if (error) throw error;
  }
  if (materialIds.length) {
    const { error } = await client.from("materials").delete().in("id", materialIds);
    if (error) throw error;
  }
  if (skillIds.length) {
    const { error } = await client.from("skills").delete().in("id", skillIds);
    if (error) throw error;
  }

  const { data: authUsers, error: authUsersError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authUsersError) throw authUsersError;
  for (const user of authUsers.users.filter((item) => item.email?.startsWith("pesquisador.e2e."))) {
    const { error } = await client.auth.admin.deleteUser(user.id);
    if (error) throw error;
  }

  console.log("Dados E2E removidos do banco local.");
}

async function main() {
  if (command === "stop") {
    supabase(["stop"]);
    return;
  }

  if (!["setup", "start", "reset", "seed-demo", "clean-e2e"].includes(command)) {
    throw new Error("Comando local inválido.");
  }

  // Auth templates and other config.toml changes require a full stack restart.
  if (command === "setup" || command === "reset") supabase(["stop"]);
  if (command === "setup" || command === "start" || command === "reset") supabase(["start"]);
  if (command === "setup" || command === "reset") supabase(["db", "reset"]);

  const environment = statusEnvironment();
  configureFrontend(environment);

  if (command === "setup" || command === "reset") await bootstrapLocal(environment);
  if (command === "seed-demo") await seedDemo(environment);
  if (command === "clean-e2e") await cleanE2e(environment);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
