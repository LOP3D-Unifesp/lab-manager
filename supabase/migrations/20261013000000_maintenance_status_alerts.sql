-- Mudança de situação de um chamado passa a avisar também os responsáveis pela manutenção, e não só quem abriu.
--   - chamado NOVO: coordenadores e responsáveis pela manutenção (sem mudança);
--   - MUDANÇA DE SITUAÇÃO: quem abriu e os responsáveis pela manutenção, uma vez cada.
-- Coordenador que não é responsável só é avisado das mudanças dos chamados que abriu. private.notify continua
-- ignorando quem fez a ação, perfis inativos e quem desligou o assunto nas preferências.

create or replace function private.notify_request_change() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_equipment text;
  v_params jsonb;
  v_id uuid;
begin
  select name into v_equipment from public.equipment where id = new.equipment_id;
  v_params := jsonb_build_object('equipment', v_equipment, 'urgency', new.urgency);

  if tg_op = 'INSERT' then
    perform private.notify_staff(true, 'request_new', v_params, '/equipamentos?vista=chamados', new.id);
  elsif new.status is distinct from old.status then
    for v_id in
      select id from public.profiles
      where is_active and (is_maintainer or id = new.requested_by)
    loop
      perform private.notify(
        v_id, 'request_status',
        v_params || jsonb_build_object('status', new.status), '/equipamentos?vista=chamados', new.id
      );
    end loop;
  end if;

  return new;
end;
$$;
