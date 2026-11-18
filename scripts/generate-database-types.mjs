import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const isWindows = process.platform === "win32";
const result = spawnSync(
  isWindows ? process.env.ComSpec ?? "cmd.exe" : "supabase",
  isWindows
    ? ["/d", "/s", "/c", "supabase gen types typescript --local"]
    : ["gen", "types", "typescript", "--local"],
  { cwd: root, encoding: "utf8" },
);

if (result.status !== 0) {
  if (result.stderr) process.stderr.write(result.stderr);
  throw new Error("A geração de tipos falhou; o arquivo existente foi preservado.");
}

writeFileSync(
  resolve(root, "src/lib/database.types.ts"),
  `${result.stdout.trimEnd()}\n`,
  "utf8",
);

if (result.stderr) process.stderr.write(result.stderr);
console.log("Tipos TypeScript atualizados a partir do Supabase local.");
