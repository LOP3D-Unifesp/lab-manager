// @ts-nocheck
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const databasePath = fileURLToPath(
  new URL("./data/local-database.json", import.meta.url),
);

function ensureDatabaseFile() {
  if (existsSync(databasePath)) {
    return;
  }

  mkdirSync(dirname(databasePath), { recursive: true });
  writeFileSync(
    databasePath,
    JSON.stringify(
      {
        schema_version: 1,
        profiles: [],
        availability_slots: [],
        printers: [],
        print_reservations: [],
      },
      null,
      2,
    ),
  );
}

function localDatabasePlugin() {
  return {
    name: "local-database-json",
    configureServer(server) {
      ensureDatabaseFile();
      server.watcher.unwatch(databasePath);

      server.middlewares.use("/api/local-database", (req, res) => {
        res.setHeader("Content-Type", "application/json");

        if (req.method === "GET") {
          res.end(readFileSync(databasePath, "utf-8"));
          return;
        }

        if (req.method === "PUT") {
          let body = "";

          req.on("data", (chunk) => {
            body += chunk;
          });

          req.on("end", () => {
            try {
              const database = JSON.parse(body);
              writeFileSync(databasePath, JSON.stringify(database, null, 2));
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ ok: false }));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localDatabasePlugin()],
  server: {
    watch: {
      ignored: ["**/data/local-database.json"],
    },
  },
});
