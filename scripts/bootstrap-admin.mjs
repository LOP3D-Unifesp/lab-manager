import { bootstrapAdmin, isLoopbackUrl } from "./bootstrap-lib.mjs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
const name = process.env.BOOTSTRAP_ADMIN_NAME;
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!url || isLoopbackUrl(url)) throw new Error("Este comando exige explicitamente uma URL Supabase hospedada.");
if (process.env.CONFIRM_REMOTE_HOST !== new URL(url).hostname) {
  throw new Error("Defina CONFIRM_REMOTE_HOST com o hostname exato do projeto remoto.");
}

await bootstrapAdmin({ url, serviceKey, email, name, password });
const client = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error } = await client.rpc("configure_invitation_cleanup", {
  p_function_url: `${url.replace(/\/$/, "")}/functions/v1/cleanup-invitations`,
  p_secret: serviceKey,
});
if (error) throw error;
console.log(`Primeiro coordenador criado em ${new URL(url).hostname}.`);
