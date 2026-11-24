-- Quem recebe aviso de pedidos de compra e de chamados de manutenção:
-- - pedido de compra NOVO: só os coordenadores;
-- - chamado NOVO: coordenadores e mantenedores (quem pode desligar isso nas preferências do perfil);
-- - MUDANÇA DE STATUS: só quem abriu (nunca a própria pessoa que mudou).
-- Antes, nos chamados só a resolução avisava quem abriu; nas compras só quatro status avisavam quem pediu.

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
    'booking_pending', 'booking_approved', 'booking_rejected', 'booking_cancelled',
    'request_new', 'request_resolved', 'request_status', 'feedback_new', 'purchase_new', 'purchase_status'
));

create or replace function private.notify_request_change() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_equipment text;
  v_params jsonb;
begin
  select name into v_equipment from public.equipment where id = new.equipment_id;
  v_params := jsonb_build_object('equipment', v_equipment, 'urgency', new.urgency);

  if tg_op = 'INSERT' then
    perform private.notify_staff(true, 'request_new', v_params, '/equipamentos?vista=chamados', new.id);
  elsif new.status is distinct from old.status then
    perform private.notify(
      new.requested_by, 'request_status',
      v_params || jsonb_build_object('status', new.status), '/equipamentos?vista=chamados', new.id
    );
  end if;

  return new;
end;
$$;

create or replace function private.notify_purchase_change() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'requested' then
      perform private.notify_staff(
        false, 'purchase_new', jsonb_build_object('item', new.item, 'urgency', new.urgency), '/compras', new.id
      );
    end if;
  elsif new.status is distinct from old.status then
    perform private.notify(
      new.requested_by, 'purchase_status',
      jsonb_build_object('item', new.item, 'status', new.status, 'reason', new.rejected_reason), '/compras', new.id
    );
  end if;

  return new;
end;
$$;
