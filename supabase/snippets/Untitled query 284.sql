-- 1. Elimina el disparador de la tabla de usuarios
drop trigger if exists on_auth_user_created on auth.users;

-- 2. Elimina la función que realizaba la copia de datos
drop function if exists public.handle_new_user();