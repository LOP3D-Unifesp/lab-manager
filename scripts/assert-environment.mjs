import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { isLoopbackUrl } from "./bootstrap-lib.mjs";

function readEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trimStart().startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")];
      }),
  );
}

const target = process.argv[2];
const root = resolve(import.meta.dirname, "..");
const file = target === "local" ? ".env.development.local" : ".env.remote.local";
const fallback = target === "remote" ? ".env" : null;
const env = { ...readEnv(fallback ? resolve(root, fallback) : ""), ...readEnv(resolve(root, file)) };
const url = env.VITE_SUPABASE_URL;

if (!url) {
  throw new Error(target === "local" ? "Execute npm run setup:local antes de iniciar o frontend." : "Configure .env.remote.local antes de usar o ambiente remoto.");
}

if (target === "local" && !isLoopbackUrl(url)) {
  throw new Error("npm run dev aceita somente o Supabase Docker em localhost.");
}

if (target === "remote" && isLoopbackUrl(url)) {
  throw new Error("npm run dev:remote exige uma URL hospedada do Supabase.");
}

console.log(`Ambiente ${target} confirmado: ${new URL(url).origin}`);
