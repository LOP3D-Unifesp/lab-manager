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
// O assunto vem do config.toml para o ambiente local e o hospedado nunca divergirem.
const config = readFileSync(resolve(import.meta.dirname, "../supabase/config.toml"), "utf8");
const subject = config.match(/\[auth\.email\.template\.invite\]\s+subject\s*=\s*"([^"]+)"/)?.[1];
if (!subject) throw new Error("Assunto do convite não encontrado em supabase/config.toml.");

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

// SMTP próprio (opcional): sem ele o Supabase usa o serviço padrão, limitado a poucos e-mails/hora.
const smtp = process.env.SMTP_HOST
  ? {
      external_email_enabled: true,
      smtp_host: process.env.SMTP_HOST,
      smtp_port: process.env.SMTP_PORT ?? "587",
      smtp_user: process.env.SMTP_USER,
      smtp_pass: process.env.SMTP_PASS,
      smtp_admin_email: process.env.SMTP_FROM_EMAIL,
      smtp_sender_name: process.env.SMTP_FROM_NAME ?? "Lab Manager",
      rate_limit_email_sent: Number(process.env.SMTP_RATE_LIMIT_PER_HOUR ?? 100),
    }
  : {};
if (process.env.SMTP_HOST && (!smtp.smtp_user || !smtp.smtp_pass || !smtp.smtp_admin_email)) {
  throw new Error("Com SMTP_HOST, defina também SMTP_USER, SMTP_PASS e SMTP_FROM_EMAIL.");
}

const response = await fetch(endpoint, {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    ...smtp,
    // Sem barra final: o template de convite monta "{{ .SiteURL }}/convite/aceitar".
    site_url: siteUrl,
    uri_allow_list: `${siteUrl}/**`,
    disable_signup: true,
    mailer_subjects_invite: subject,
    mailer_templates_invite_content: template,
  }),
});
if (!response.ok) throw new Error(`Falha ao atualizar o Auth (${response.status}): ${await response.text()}`);

const current = await (await fetch(endpoint, { headers })).json();
console.log(`site_url: ${current.site_url}`);
console.log(`uri_allow_list: ${current.uri_allow_list}`);
console.log(`disable_signup: ${current.disable_signup}`);
console.log(`assunto do convite: ${current.mailer_subjects_invite}`);
if (smtp.smtp_host) {
  console.log(`smtp: ${current.smtp_host}:${current.smtp_port} como ${current.smtp_admin_email} (${current.smtp_sender_name})`);
  console.log(`limite de e-mails/hora: ${current.rate_limit_email_sent}`);
}
