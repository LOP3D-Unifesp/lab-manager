import { createClient } from "@supabase/supabase-js";

export function isLoopbackUrl(value) {
  const hostname = new URL(value).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export async function bootstrapAdmin({ url, serviceKey, email, name, password }) {
  if (!url || !serviceKey) throw new Error("URL e service role do Supabase são obrigatórias.");
  if (!email || !name || !password) throw new Error("Email, nome e senha do coordenador são obrigatórios.");

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: settings, error: settingsError } = await supabase
    .from("lab_settings")
    .select("setup_completed_at")
    .eq("id", true)
    .single();
  if (settingsError) throw settingsError;
  if (settings.setup_completed_at) throw new Error("A instalação já foi concluída.");

  const { count, error: countError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (countError) throw countError;
  if ((count ?? 0) > 0) throw new Error("O bootstrap foi recusado porque já existem perfis.");

  const { data: created, error: userError } = await supabase.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  });
  if (userError || !created.user) throw userError ?? new Error("Não foi possível criar o usuário.");

  try {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: created.user.id,
      full_name: name.trim(),
      email: email.trim().toLowerCase(),
      role: "coordinator",
      is_active: true,
    });
    if (profileError) throw profileError;

    const { error: privateError } = await supabase
      .from("profile_private_data")
      .insert({ profile_id: created.user.id });
    if (privateError) throw privateError;
  } catch (error) {
    await supabase.auth.admin.deleteUser(created.user.id);
    throw error;
  }

  return created.user;
}
