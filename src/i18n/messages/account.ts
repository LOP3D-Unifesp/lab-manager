import type { Entry } from "../catalog";

export const account = {
  "account.openMenu": { pt: "Abrir menu da conta", en: "Open account menu", es: "Abrir menú de la cuenta" },
  "account.profile": { pt: "Meu perfil", en: "My profile", es: "Mi perfil" },
  "account.sendFeedback": { pt: "Enviar sugestão", en: "Send a suggestion", es: "Enviar sugerencia" },
  "account.theme": { pt: "Tema", en: "Theme", es: "Tema" },
  "sidebar.collapse": { pt: "Recolher menu", en: "Collapse menu", es: "Contraer menú" },
  "sidebar.expand": { pt: "Expandir menu", en: "Expand menu", es: "Expandir menú" },
  "sidebar.fallbackSubtitle": { pt: "Gestão interna do laboratório.", en: "Internal lab management.", es: "Gestión interna del laboratorio." },
  "login.title": { pt: "Entrar", en: "Sign in", es: "Iniciar sesión" },
  "login.subtitle": { pt: "Entre com o seu e-mail e a senha.", en: "Sign in with your email and password.", es: "Entra con tu correo y contraseña." },
  "login.email": { pt: "Email", en: "Email", es: "Correo electrónico" },
  "login.password": { pt: "Senha", en: "Password", es: "Contraseña" },
  "login.invalidCredentials": { pt: "Email ou senha inválidos.", en: "Invalid email or password.", es: "Correo o contraseña inválidos." },
  "login.notConfigured": { pt: "Supabase não está configurado. Execute npm run setup:local.", en: "Supabase is not configured. Run npm run setup:local.", es: "Supabase no está configurado. Ejecuta npm run setup:local." },
  "login.submitting": { pt: "Entrando...", en: "Signing in...", es: "Entrando..." },
  "login.submit": { pt: "Entrar", en: "Sign in", es: "Entrar" },
} satisfies Record<string, Entry>;
