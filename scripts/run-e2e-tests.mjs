import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const executable = isWindows ? process.env.ComSpec ?? "cmd.exe" : "npm";

function run(command) {
  const args = isWindows ? ["/d", "/s", "/c", command] : ["run", command];
  return spawnSync(executable, args, { cwd: process.cwd(), stdio: "inherit" });
}

const cleanupBefore = run(isWindows ? "npm run db:clean:e2e" : "db:clean:e2e");
if (cleanupBefore.status !== 0) process.exit(cleanupBefore.status ?? 1);

const tests = isWindows
  ? run("npx playwright test")
  : spawnSync("npx", ["playwright", "test"], { cwd: process.cwd(), stdio: "inherit" });

const cleanupAfter = run(isWindows ? "npm run db:clean:e2e" : "db:clean:e2e");
process.exit(tests.status !== 0 ? tests.status ?? 1 : cleanupAfter.status ?? 0);
