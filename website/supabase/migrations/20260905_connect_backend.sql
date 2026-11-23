-- Additive migration for the Express API. It preserves all existing tables,
-- rows, foreign keys, and RLS policies from connect_backup.sql.

alter type public.user_role add value if not exists 'organizer';

-- Serialize registrations per event so capacity checks and inserts happen in
-- one database transaction. Only the backend service role may call this RPC.
create or replace function public.register_for_event(p_event_id uuid, p_user_id uuid)
returns setof public.event_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events%rowtype;
  existing_registration public.event_registrations%rowtype;
  created_registration public.event_registrations%rowtype;
  occupied integer;
  chosen_status public.registration_status;
  chosen_payment_status public.payment_status;
begin
  select * into target_event from public.events where id = p_event_id for update;
  if not found then raise exception 'Event not found' using errcode = 'P0002'; end if;
  if target_event.status <> 'published' then raise exception 'Event is not open for registration' using errcode = 'P0001'; end if;

  select * into existing_registration
  from public.event_registrations
  where event_id = p_event_id and user_id = p_user_id;

  if found and existing_registration.status <> 'cancelled' then
    raise exception 'User is already registered' using errcode = '23505';
  end if;

  select count(*) into occupied
  from public.event_registrations
  where event_id = p_event_id and status in ('registered', 'attended');

  chosen_status := case when target_event.capacity is not null and occupied >= target_event.capacity then 'waitlisted' else 'registered' end;
  chosen_payment_status := case when target_event.price > 0 and chosen_status = 'registered' then 'pending' else 'not_required' end;

  if existing_registration.id is not null then
    update public.event_registrations
      set status = chosen_status, payment_method = 'free', payment_status = chosen_payment_status,
          qr_code = null, checked_in_at = null, created_at = now()
      where id = existing_registration.id
      returning * into created_registration;
  else
    insert into public.event_registrations(event_id, user_id, status, payment_method, payment_status)
    values (p_event_id, p_user_id, chosen_status, 'free', chosen_payment_status)
    returning * into created_registration;
  end if;

  return next created_registration;
end;
$$;

revoke all on function public.register_for_event(uuid, uuid) from public, anon, authenticated;
grant execute on function public.register_for_event(uuid, uuid) to service_role;
