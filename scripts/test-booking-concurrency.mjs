import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { isLoopbackUrl } from "./bootstrap-lib.mjs";

const root = resolve(import.meta.dirname, "..");

function localEnvironment() {
  const isWindows = process.platform === "win32";
  const result = spawnSync(
    isWindows ? process.env.ComSpec ?? "cmd.exe" : "supabase",
    isWindows ? ["/d", "/s", "/c", "supabase status -o env"] : ["status", "-o", "env"],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr || "Não foi possível consultar o Supabase local.");

  const values = {};
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  const url = values.API_URL;
  const publicKey = values.PUBLISHABLE_KEY ?? values.ANON_KEY;
  const serviceKey = values.SECRET_KEY ?? values.SERVICE_ROLE_KEY;
  if (!url || !publicKey || !serviceKey || !isLoopbackUrl(url)) {
    throw new Error("O teste de concorrência aceita somente um Supabase local válido.");
  }
  return { url, publicKey, serviceKey };
}

const environment = localEnvironment();
const service = createClient(environment.url, environment.serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const suffix = crypto.randomUUID().slice(0, 8);
const password = "Concurrency123!";
const emails = [`concurrent-a-${suffix}@lab.local`, `concurrent-b-${suffix}@lab.local`];
const userIds = [];
let printerId;
let materialId;

try {
  for (const [index, email] of emails.entries()) {
    const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("Falha ao criar fixture de autenticação.");
    userIds.push(data.user.id);
    const { error: profileError } = await service.from("profiles").insert({
      id: data.user.id,
      full_name: `Concurrent User ${index + 1}`,
      email,
      role: "researcher",
      is_active: true,
    });
    if (profileError) throw profileError;
    const { error: privateError } = await service.from("profile_private_data").insert({ profile_id: data.user.id });
    if (privateError) throw privateError;
  }

  const { data: material, error: materialError } = await service
    .from("materials")
    .insert({ name: `Concurrency Material ${suffix}` })
    .select("id")
    .single();
  if (materialError) throw materialError;
  materialId = material.id;

  const { data: printer, error: printerError } = await service
    .from("printers")
    .insert({ name: `Concurrency Printer ${suffix}`, status: "active" })
    .select("id")
    .single();
  if (printerError) throw printerError;
  printerId = printer.id;

  const { error: compatibilityError } = await service
    .from("printer_materials")
    .insert({ printer_id: printerId, material_id: materialId });
  if (compatibilityError) throw compatibilityError;

  const clients = emails.map(() => createClient(environment.url, environment.publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }));
  for (const [index, client] of clients.entries()) {
    const { error } = await client.auth.signInWithPassword({ email: emails[index], password });
    if (error) throw error;
  }

  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const results = await Promise.all(
    clients.map((client, index) => client.rpc("create_printer_booking", {
      p_printer_id: printerId,
      p_material_id: materialId,
      p_project_name: `Concurrent booking ${index + 1}`,
      p_starts_at: startsAt,
      p_estimated_duration_minutes: 60,
    })),
  );

  const successes = results.filter((result) => !result.error);
  if (successes.length !== 1) {
    throw new Error(`Esperado exatamente um sucesso concorrente; recebido ${successes.length}.`);
  }
  console.log("Concorrência validada: exatamente uma das duas reservas foi criada.");
} finally {
  if (printerId) await service.from("printer_bookings").delete().eq("printer_id", printerId);
  if (printerId) await service.from("printer_materials").delete().eq("printer_id", printerId);
  if (printerId) await service.from("printers").delete().eq("id", printerId);
  if (materialId) await service.from("materials").delete().eq("id", materialId);
  for (const userId of userIds) await service.auth.admin.deleteUser(userId);
}
