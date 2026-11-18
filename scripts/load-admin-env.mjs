import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Carrega segredos administrativos de .env.admin.local (ignorado pelo git).
// Variáveis já definidas no ambiente têm prioridade sobre o arquivo.
const file = resolve(import.meta.dirname, "..", ".env.admin.local");
if (existsSync(file)) process.loadEnvFile(file);
