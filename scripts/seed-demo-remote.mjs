import "./load-admin-env.mjs";
import { isLoopbackUrl } from "./bootstrap-lib.mjs";
import { seedDemo } from "./seed-demo-lib.mjs";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || isLoopbackUrl(url)) throw new Error("Este comando exige explicitamente uma URL Supabase hospedada.");
if (!serviceKey) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY.");
if (process.env.CONFIRM_REMOTE_HOST !== new URL(url).hostname) {
  throw new Error("Defina CONFIRM_REMOTE_HOST com o hostname exato do projeto remoto.");
}

await seedDemo({ url, serviceKey });
