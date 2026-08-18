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
  const serviceKey = values.SECRET_KEY ?? values.SERVICE_ROLE_KEY;
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
  console.log("Coordenador local criado: admin@lab.local / LabManager123!");
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
  console.log("Dados de demonstração adicionados ao banco local.");
}

async function main() {
  if (command === "stop") {
    supabase(["stop"]);
    return;
  }

  if (!["setup", "start", "reset", "seed-demo"].includes(command)) {
    throw new Error("Comando local inválido.");
  }

  if (command === "setup" || command === "start" || command === "reset") supabase(["start"]);
  if (command === "setup" || command === "reset") supabase(["db", "reset"]);

  const environment = statusEnvironment();
  configureFrontend(environment);

  if (command === "setup" || command === "reset") await bootstrapLocal(environment);
  if (command === "seed-demo") await seedDemo(environment);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
