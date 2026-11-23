-- =====================================================================
-- Connect — initial schema
-- Multi-university events, ticketing, gate scanning, sponsors.
-- Run in a NEW Supabase project (SQL editor or "supabase db push").
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- Enums ----------------------------------------------------
create type public.member_role      as enum ('admin', 'organizer', 'scanner');
create type public.event_status     as enum ('draft', 'published', 'cancelled');
create type public.event_visibility as enum ('public', 'students');
create type public.order_status     as enum ('pending', 'paid', 'free', 'failed', 'refunded', 'expired');
create type public.ticket_status    as enum ('valid', 'used', 'void');
create type public.scan_result      as enum ('admitted', 'already_used', 'invalid', 'wrong_event', 'void', 'expired_code', 'not_today');
create type public.inquiry_status   as enum ('new', 'contacted', 'negotiating', 'won', 'lost');
create type public.sponsor_tier     as enum ('platinum', 'gold', 'silver', 'partner');

-- ---------- Profiles -------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  is_owner    boolean not null default false,          -- platform owner (you)
  created_at  timestamptz not null default now()
);

-- Create a profile whenever someone signs up (Google / Microsoft / email).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stop users from making themselves owners.
create or replace function public.protect_owner_flag()
returns trigger language plpgsql as $$
begin
  -- App users run as 'authenticated'/'anon'; the SQL editor and service role are trusted.
  if new.is_owner is distinct from old.is_owner
     and current_user in ('authenticated', 'anon')
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_owner) then
    raise exception 'Only platform owners can change owner status';
  end if;
  return new;
end $$;
create trigger profiles_protect_owner before update on public.profiles
  for each row execute function public.protect_owner_flag();

-- ---------- Universities ---------------------------------------------
create table public.universities (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name           text not null,
  short_name     text,
  city           text,
  country        text,
  email_domains  text[] not null default '{}',   -- e.g. {lau.edu.lb, lau.edu}
  logo_url       text,
  cover_url      text,
  brand_color    text default '#16542F',
  website_url    text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);
create index universities_name_trgm on public.universities using gin (name gin_trgm_ops);

create table public.university_members (
  university_id uuid not null references public.universities(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          public.member_role not null,
  created_at    timestamptz not null default now(),
  primary key (university_id, user_id)
);

create table public.follows (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, university_id)
);

-- ---------- Events & tickets -----------------------------------------
create table public.events (
  id             uuid primary key default gen_random_uuid(),
  university_id  uuid not null references public.universities(id) on delete cascade,
  created_by     uuid references public.profiles(id) on delete set null,
  title          text not null check (char_length(title) between 3 and 140),
  summary        text,
  description    text,
  category       text not null default 'general',
  venue          text,
  campus         text,
  starts_at      timestamptz not null,
  ends_at        timestamptz,
  cover_url      text,
  visibility     public.event_visibility not null default 'public',
  status         public.event_status not null default 'draft',
  gate_opens_minutes_before int not null default 120,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index events_uni_start on public.events (university_id, starts_at);
create index events_start on public.events (starts_at) where status = 'published';
create index events_title_trgm on public.events using gin (title gin_trgm_ops);

create table public.ticket_types (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  name           text not null,
  description    text,
  price_cents    int not null default 0 check (price_cents >= 0),
  currency       text not null default 'usd',
  quantity       int not null check (quantity >= 0),      -- total available
  sold           int not null default 0 check (sold >= 0),
  max_per_order  int not null default 4 check (max_per_order between 1 and 20),
  students_only  boolean not null default false,          -- requires email on uni domain
  sales_start    timestamptz,
  sales_end      timestamptz,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  check (sold <= quantity)
);
create index ticket_types_event on public.ticket_types (event_id);

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  event_id        uuid not null references public.events(id) on delete cascade,
  ticket_type_id  uuid not null references public.ticket_types(id) on delete restrict,
  quantity        int not null check (quantity between 1 and 20),
  amount_cents    int not null default 0,
  currency        text not null default 'usd',
  status          public.order_status not null default 'pending',
  provider        text,             -- 'stripe' | 'free' | future local gateway
  provider_ref    text unique,      -- e.g. Stripe checkout session id
  created_at      timestamptz not null default now(),
  paid_at         timestamptz
);
create index orders_user on public.orders (user_id, created_at desc);

create table public.tickets (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  event_id        uuid not null references public.events(id) on delete cascade,
  ticket_type_id  uuid not null references public.ticket_types(id) on delete restrict,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  holder_name     text,
  code            text not null unique default upper(encode(gen_random_bytes(6), 'hex')),
  secret          text not null default encode(gen_random_bytes(20), 'hex'),  -- rotating-QR key
  status          public.ticket_status not null default 'valid',
  checked_in_at   timestamptz,
  checked_in_by   uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);
create index tickets_user on public.tickets (user_id);
create index tickets_event on public.tickets (event_id);

create table public.check_ins (
  id          bigint generated always as identity primary key,
  ticket_id   uuid references public.tickets(id) on delete set null,
  event_id    uuid not null references public.events(id) on delete cascade,
  scanned_by  uuid references public.profiles(id) on delete set null,
  result      public.scan_result not null,
  raw         text,
  created_at  timestamptz not null default now()
);
create index check_ins_event on public.check_ins (event_id, created_at desc);

create table public.saved_events (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  event_id   uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- ---------- Sponsors -------------------------------------------------
create table public.sponsors (
  id             uuid primary key default gen_random_uuid(),
  university_id  uuid references public.universities(id) on delete cascade,  -- null = platform-wide
  event_id       uuid references public.events(id) on delete cascade,        -- optional: one event only
  name           text not null,
  logo_url       text not null,
  website_url    text,
  tagline        text,
  tier           public.sponsor_tier not null default 'partner',
  is_active      boolean not null default true,
  starts_at      timestamptz,
  ends_at        timestamptz,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

create table public.sponsor_inquiries (
  id                uuid primary key default gen_random_uuid(),
  company_name      text not null check (char_length(company_name) between 2 and 120),
  contact_name      text not null check (char_length(contact_name) between 2 and 120),
  email             text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone             text,
  website_url       text,
  university_id     uuid references public.universities(id) on delete set null,
  budget_range      text,
  preferred_contact text not null default 'email' check (preferred_contact in ('email', 'phone')),
  message           text not null check (char_length(message) between 10 and 4000),
  status            public.inquiry_status not null default 'new',
  owner_notes       text,
  created_at        timestamptz not null default now()
);

-- ---------- Helper functions (used by RLS) ----------------------------
create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_owner from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.has_uni_role(uni uuid, roles public.member_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or exists (
    select 1 from public.university_members m
    where m.university_id = uni and m.user_id = auth.uid() and m.role = any(roles)
  )
$$;

create or replace function public.is_student_of(uni uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.universities u, unnest(u.email_domains) d
    where u.id = uni
      and (lower(split_part(coalesce(auth.jwt()->>'email', ''), '@', 2)) = lower(d)
           or lower(split_part(coalesce(auth.jwt()->>'email', ''), '@', 2)) like '%.' || lower(d))
  )
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();

-- ---------- API access (RLS below decides which rows) -----------------
-- Explicit grants so the schema works even when "auto-expose new tables" is off.
grant usage on schema public to anon, authenticated;
grant select on public.universities, public.events, public.ticket_types, public.sponsors to anon;
grant insert on public.sponsor_inquiries to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- ---------- Row Level Security ----------------------------------------
alter table public.profiles            enable row level security;
alter table public.universities        enable row level security;
alter table public.university_members  enable row level security;
alter table public.follows             enable row level security;
alter table public.events              enable row level security;
alter table public.ticket_types        enable row level security;
alter table public.orders              enable row level security;
alter table public.tickets             enable row level security;
alter table public.check_ins           enable row level security;
alter table public.saved_events        enable row level security;
alter table public.sponsors            enable row level security;
alter table public.sponsor_inquiries   enable row level security;

-- profiles
create policy "read own profile or staff" on public.profiles for select
  using (id = auth.uid() or public.is_owner()
         or exists (select 1 from public.university_members me
                    join public.university_members them on them.university_id = me.university_id
                    where me.user_id = auth.uid() and me.role = 'admin' and them.user_id = profiles.id));
create policy "update own profile" on public.profiles for update
  using (id = auth.uid() or public.is_owner()) with check (id = auth.uid() or public.is_owner());

-- universities
create policy "anyone reads active universities" on public.universities for select
  using (is_active or public.has_uni_role(id, array['admin','organizer','scanner']::public.member_role[]));
create policy "owners manage universities" on public.universities for all
  using (public.is_owner()) with check (public.is_owner());
create policy "uni admins edit their university" on public.universities for update
  using (public.has_uni_role(id, array['admin']::public.member_role[]))
  with check (public.has_uni_role(id, array['admin']::public.member_role[]));

-- university_members
create policy "members see their teams" on public.university_members for select
  using (user_id = auth.uid() or public.has_uni_role(university_id, array['admin']::public.member_role[]));
create policy "uni admins manage members" on public.university_members for all
  using (public.has_uni_role(university_id, array['admin']::public.member_role[]))
  with check (public.has_uni_role(university_id, array['admin']::public.member_role[]));

-- follows / saved events
create policy "own follows" on public.follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own saved" on public.saved_events for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- events
create policy "read published events" on public.events for select
  using (
    (status <> 'draft' and (visibility = 'public' or public.is_student_of(university_id)))
    or public.has_uni_role(university_id, array['admin','organizer','scanner']::public.member_role[])
  );
create policy "staff create events" on public.events for insert
  with check (public.has_uni_role(university_id, array['admin','organizer']::public.member_role[]));
create policy "staff update events" on public.events for update
  using (public.has_uni_role(university_id, array['admin','organizer']::public.member_role[]))
  with check (public.has_uni_role(university_id, array['admin','organizer']::public.member_role[]));
create policy "admins delete events" on public.events for delete
  using (public.has_uni_role(university_id, array['admin']::public.member_role[]));

-- ticket types follow their event
create policy "read ticket types of visible events" on public.ticket_types for select
  using (exists (select 1 from public.events e where e.id = event_id));
create policy "staff manage ticket types" on public.ticket_types for all
  using (exists (select 1 from public.events e where e.id = event_id
                 and public.has_uni_role(e.university_id, array['admin','organizer']::public.member_role[])))
  with check (exists (select 1 from public.events e where e.id = event_id
                 and public.has_uni_role(e.university_id, array['admin','organizer']::public.member_role[])));

-- orders: buyers read their own; staff read their university's. Writes go through functions / server.
create policy "read own or staff orders" on public.orders for select
  using (user_id = auth.uid() or exists (
    select 1 from public.events e where e.id = event_id
      and public.has_uni_role(e.university_id, array['admin','organizer']::public.member_role[])));

-- tickets: owners read their own (incl. secret for rotating QR); staff read their university's.
create policy "read own or staff tickets" on public.tickets for select
  using (user_id = auth.uid() or exists (
    select 1 from public.events e where e.id = event_id
      and public.has_uni_role(e.university_id, array['admin','organizer','scanner']::public.member_role[])));
create policy "holder renames own ticket" on public.tickets for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- check-ins: staff read
create policy "staff read check-ins" on public.check_ins for select
  using (exists (select 1 from public.events e where e.id = event_id
    and public.has_uni_role(e.university_id, array['admin','organizer','scanner']::public.member_role[])));

-- sponsors
create policy "anyone reads active sponsors" on public.sponsors for select
  using ((is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
         or public.is_owner()
         or (university_id is not null and public.has_uni_role(university_id, array['admin']::public.member_role[])));
create policy "owners manage all sponsors" on public.sponsors for all
  using (public.is_owner()) with check (public.is_owner());
create policy "uni admins manage their sponsors" on public.sponsors for all
  using (university_id is not null and public.has_uni_role(university_id, array['admin']::public.member_role[]))
  with check (university_id is not null and public.has_uni_role(university_id, array['admin']::public.member_role[]));

-- sponsor inquiries: anyone may submit; only owners read/manage
create policy "anyone submits inquiry" on public.sponsor_inquiries for insert
  with check (status = 'new' and owner_notes is null);
create policy "owners manage inquiries" on public.sponsor_inquiries for all
  using (public.is_owner()) with check (public.is_owner());

-- The rotating-QR secret is readable only by the ticket holder (via RPC), never by staff.
revoke select on public.tickets from anon, authenticated;
grant select (id, order_id, event_id, ticket_type_id, user_id, holder_name, code, status, checked_in_at, checked_in_by, created_at)
  on public.tickets to authenticated;
revoke update on public.tickets from anon, authenticated;
grant update (holder_name) on public.tickets to authenticated;

create or replace function public.my_ticket_secret(p_ticket uuid)
returns text language sql stable security definer set search_path = public as $$
  select secret from public.tickets where id = p_ticket and user_id = auth.uid()
$$;
revoke all on function public.my_ticket_secret(uuid) from public, anon;
grant execute on function public.my_ticket_secret(uuid) to authenticated;

-- Writes to orders/tickets/check-ins only happen through the functions below.
revoke insert, update, delete on public.orders, public.check_ins from anon, authenticated;
revoke insert, delete on public.tickets from anon, authenticated;

-- ---------- Business functions ----------------------------------------

-- Issue tickets for an order (internal).
create or replace function public._issue_tickets(p_order public.orders)
returns void language plpgsql security definer set search_path = public as $$
declare holder text;
begin
  select coalesce(full_name, email) into holder from public.profiles where id = p_order.user_id;
  insert into public.tickets (order_id, event_id, ticket_type_id, user_id, holder_name)
  select p_order.id, p_order.event_id, p_order.ticket_type_id, p_order.user_id, holder
  from generate_series(1, p_order.quantity);
end $$;
revoke all on function public._issue_tickets(public.orders) from public, anon, authenticated;

-- Reserve inventory and create an order. Free → tickets issued now.
-- Paid → order stays 'pending' until the payment webhook calls fulfill_order().
create or replace function public.create_order(p_ticket_type uuid, p_quantity int)
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  tt   public.ticket_types%rowtype;
  ev   public.events%rowtype;
  o    public.orders%rowtype;
  uid  uuid := auth.uid();
  already int;
begin
  if uid is null then raise exception 'Sign in to get tickets' using errcode = '28000'; end if;
  if p_quantity < 1 then raise exception 'Invalid quantity'; end if;

  select * into tt from public.ticket_types where id = p_ticket_type for update;
  if not found then raise exception 'Ticket type not found'; end if;
  select * into ev from public.events where id = tt.event_id;

  if ev.status <> 'published' then raise exception 'This event is not on sale'; end if;
  if ev.visibility = 'students' and not public.is_student_of(ev.university_id) then
    raise exception 'This event is for students of this university only. Sign in with your university email.';
  end if;
  if tt.students_only and not public.is_student_of(ev.university_id) then
    raise exception 'This ticket requires a university email address.';
  end if;
  if coalesce(ev.ends_at, ev.starts_at + interval '4 hours') < now() then raise exception 'This event has ended'; end if;
  if tt.sales_start is not null and now() < tt.sales_start then raise exception 'Sales have not started yet'; end if;
  if tt.sales_end is not null and now() > tt.sales_end then raise exception 'Sales have ended'; end if;

  select coalesce(sum(quantity), 0) into already from public.orders
   where user_id = uid and ticket_type_id = tt.id and status in ('paid', 'free', 'pending')
     and (status <> 'pending' or created_at > now() - interval '30 minutes');
  if already + p_quantity > tt.max_per_order then
    raise exception 'Limit is % ticket(s) per person', tt.max_per_order;
  end if;

  -- Expire stale pending orders so their seats return to stock.
  update public.ticket_types t set sold = t.sold - x.qty
  from (select ticket_type_id, sum(quantity) qty from public.orders
         where ticket_type_id = tt.id and status = 'pending' and created_at < now() - interval '30 minutes'
         group by ticket_type_id) x
  where t.id = x.ticket_type_id;
  update public.orders set status = 'expired'
   where ticket_type_id = tt.id and status = 'pending' and created_at < now() - interval '30 minutes';
  select * into tt from public.ticket_types where id = p_ticket_type;

  if tt.sold + p_quantity > tt.quantity then raise exception 'Sold out'; end if;
  update public.ticket_types set sold = sold + p_quantity where id = tt.id;

  insert into public.orders (user_id, event_id, ticket_type_id, quantity, amount_cents, currency, status, provider, paid_at)
  values (uid, ev.id, tt.id, p_quantity, tt.price_cents * p_quantity, tt.currency,
          case when tt.price_cents = 0 then 'free'::public.order_status else 'pending'::public.order_status end,
          case when tt.price_cents = 0 then 'free' else null end,
          case when tt.price_cents = 0 then now() else null end)
  returning * into o;

  if o.status = 'free' then perform public._issue_tickets(o); end if;
  return o;
end $$;
revoke all on function public.create_order(uuid, int) from public, anon;
grant execute on function public.create_order(uuid, int) to authenticated;

-- Called by the payment webhook (service role only).
create or replace function public.fulfill_order(p_order uuid, p_provider text, p_ref text)
returns public.orders language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status = 'paid' then return o; end if;                       -- idempotent
  if o.status = 'expired' then                                      -- paid late: re-reserve
    update public.ticket_types set sold = sold + o.quantity where id = o.ticket_type_id;
  end if;
  update public.orders set status = 'paid', paid_at = now(), provider = p_provider, provider_ref = coalesce(p_ref, provider_ref)
   where id = o.id returning * into o;
  perform public._issue_tickets(o);
  return o;
end $$;
revoke all on function public.fulfill_order(uuid, text, text) from public, anon, authenticated;
grant execute on function public.fulfill_order(uuid, text, text) to service_role;

create or replace function public.fail_order(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order for update;
  if found and o.status = 'pending' then
    update public.orders set status = 'failed' where id = o.id;
    update public.ticket_types set sold = greatest(sold - o.quantity, 0) where id = o.ticket_type_id;
  end if;
end $$;
revoke all on function public.fail_order(uuid) from public, anon, authenticated;
grant execute on function public.fail_order(uuid) to service_role;

-- Atomic check-in (service role; the API verifies the scanner's role + rotating code first).
create or replace function public.check_in_ticket(p_code text, p_event uuid, p_scanner uuid, p_raw text)
returns table (result public.scan_result, ticket_id uuid, holder_name text, ticket_type text, checked_in_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare t public.tickets%rowtype; tt_name text; r public.scan_result;
begin
  select * into t from public.tickets where code = upper(p_code) for update;
  if not found then
    insert into public.check_ins (event_id, scanned_by, result, raw) values (p_event, p_scanner, 'invalid', left(p_raw, 200));
    return query select 'invalid'::public.scan_result, null::uuid, null::text, null::text, null::timestamptz; return;
  end if;
  select name into tt_name from public.ticket_types where id = t.ticket_type_id;

  if t.event_id <> p_event then r := 'wrong_event';
  elsif t.status = 'void' then r := 'void';
  elsif t.status = 'used' then r := 'already_used';
  else
    update public.tickets set status = 'used', checked_in_at = now(), checked_in_by = p_scanner where id = t.id
      returning * into t;
    r := 'admitted';
  end if;

  insert into public.check_ins (ticket_id, event_id, scanned_by, result, raw) values (t.id, p_event, p_scanner, r, left(p_raw, 200));
  return query select r, t.id, t.holder_name, tt_name, t.checked_in_at;
end $$;
revoke all on function public.check_in_ticket(text, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.check_in_ticket(text, uuid, uuid, text) to service_role;

-- Event stats for dashboards.
create or replace view public.event_stats with (security_invoker = true) as
select e.id as event_id, e.university_id,
  coalesce((select sum(sold) from public.ticket_types t where t.event_id = e.id), 0)::int as sold,
  coalesce((select sum(quantity) from public.ticket_types t where t.event_id = e.id), 0)::int as capacity,
  (select count(*) from public.tickets k where k.event_id = e.id and k.status = 'used')::int as checked_in,
  coalesce((select sum(amount_cents) from public.orders o where o.event_id = e.id and o.status = 'paid'), 0)::bigint as revenue_cents
from public.events e;
grant select on public.event_stats to authenticated, service_role;

-- Realtime for live check-in counters.
alter publication supabase_realtime add table public.check_ins;

-- ---------- Storage bucket for event covers / logos -------------------
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

create policy "public read media" on storage.objects for select using (bucket_id = 'media');
create policy "signed-in upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner manages own media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and owner = auth.uid());
create policy "owner deletes own media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and owner = auth.uid());
