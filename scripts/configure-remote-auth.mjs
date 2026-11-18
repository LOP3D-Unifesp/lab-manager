import "./load-admin-env.mjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { isLoopbackUrl } from "./bootstrap-lib.mjs";

// Ajusta somente o que o app precisa no Auth do Supabase hospedado, sem enviar o
// config.toml local inteiro: Site URL, redirects, cadastro público desligado e o
// template de convite.
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF;
const siteUrl = process.env.PUBLIC_SITE_URL?.replace(/\/$/, "");

if (!accessToken) throw new Error("Defina SUPABASE_ACCESS_TOKEN (token pessoal em supabase.com/dashboard/account/tokens).");
if (!projectRef) throw new Error("Defina SUPABASE_PROJECT_REF.");
if (!siteUrl || isLoopbackUrl(siteUrl)) throw new Error("Defina PUBLIC_SITE_URL com a URL HTTPS publicada, nunca localhost.");
if (process.env.CONFIRM_REMOTE_HOST !== `${projectRef}.supabase.co`) {
  throw new Error(`Defina CONFIRM_REMOTE_HOST=${projectRef}.supabase.co para confirmar o projeto.`);
}

const template = readFileSync(resolve(import.meta.dirname, "../supabase/templates/invite.html"), "utf8");
const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

const response = await fetch(endpoint, {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    // Sem barra final: o template de convite monta "{{ .SiteURL }}/convite/aceitar".
    site_url: siteUrl,
    uri_allow_list: `${siteUrl}/**`,
    disable_signup: true,
    mailer_templates_invite_content: template,
  }),
});
if (!response.ok) throw new Error(`Falha ao atualizar o Auth (${response.status}): ${await response.text()}`);

const current = await (await fetch(endpoint, { headers })).json();
console.log(`site_url: ${current.site_url}`);
console.log(`uri_allow_list: ${current.uri_allow_list}`);
console.log(`disable_signup: ${current.disable_signup}`);
