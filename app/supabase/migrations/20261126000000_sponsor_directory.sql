-- Sponsor directory: companies create public profiles; universities and sponsors
-- message each other about collaborations (optionally tied to an event).
-- Safe to run more than once.

-- ---------- Profiles ----------------------------------------------------
create table if not exists public.sponsor_profiles (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null unique references public.profiles(id) on delete cascade,
  slug           text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name           text not null check (char_length(name) between 2 and 120),
  tagline        text check (char_length(tagline) <= 160),
  about          text check (char_length(about) <= 4000),
  industry       text not null default 'other',
  logo_url       text,
  cover_url      text,
  website_url    text,
  city           text,
  country        text,
  interests      text[] not null default '{}',   -- event categories they like to sponsor
  offer          text check (char_length(offer) <= 1000), -- what they can provide (cash, products, venue...)
  budget_range   text,
  contact_email  text,
  contact_phone  text,
  show_contact   boolean not null default false, -- show email/phone publicly
  is_published   boolean not null default true,
  is_hidden      boolean not null default false, -- set by platform owners (moderation)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists sponsor_profiles_name_trgm on public.sponsor_profiles using gin (name gin_trgm_ops);

drop trigger if exists sponsor_profiles_touch on public.sponsor_profiles;
create trigger sponsor_profiles_touch before update on public.sponsor_profiles
  for each row execute function public.touch_updated_at();

-- Only platform owners may hide/unhide a profile.
create or replace function public.protect_sponsor_hidden()
returns trigger language plpgsql as $$
begin
  if new.is_hidden is distinct from coalesce(old.is_hidden, false)
     and current_user in ('authenticated', 'anon')
     and not public.is_owner() then
    raise exception 'Only platform owners can hide sponsor profiles';
  end if;
  return new;
end $$;
drop trigger if exists sponsor_profiles_protect_hidden on public.sponsor_profiles;
create trigger sponsor_profiles_protect_hidden before insert or update on public.sponsor_profiles
  for each row execute function public.protect_sponsor_hidden();

-- ---------- Conversations ------------------------------------------------
create table if not exists public.sponsor_threads (
  id              uuid primary key default gen_random_uuid(),
  sponsor_id      uuid not null references public.sponsor_profiles(id) on delete cascade,
  university_id   uuid not null references public.universities(id) on delete cascade,
  event_id        uuid references public.events(id) on delete set null,
  started_by      uuid references public.profiles(id) on delete set null,
  subject         text not null check (char_length(subject) between 3 and 140),
  status          text not null default 'open' check (status in ('open', 'closed')),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists sponsor_threads_sponsor on public.sponsor_threads (sponsor_id, last_message_at desc);
create index if not exists sponsor_threads_uni on public.sponsor_threads (university_id, last_message_at desc);

create table if not exists public.sponsor_messages (
  id          bigint generated always as identity primary key,
  thread_id   uuid not null references public.sponsor_threads(id) on delete cascade,
  sender_id   uuid references public.profiles(id) on delete set null,
  sender_side text not null check (sender_side in ('sponsor', 'university')),
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);
create index if not exists sponsor_messages_thread on public.sponsor_messages (thread_id, created_at);

-- Last time each participant opened a thread (for unread badges).
create table if not exists public.sponsor_thread_reads (
  thread_id uuid not null references public.sponsor_threads(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  read_at   timestamptz not null default now(),
  primary key (thread_id, user_id)
);

-- ---------- Helpers -------------------------------------------------------
create or replace function public.owns_sponsor(sp uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sponsor_profiles where id = sp and owner_id = auth.uid())
$$;

create or replace function public.thread_side(t uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when public.owns_sponsor(th.sponsor_id) then 'sponsor'
    when public.has_uni_role(th.university_id, array['admin','organizer']::public.member_role[]) then 'university'
    else null end
  from public.sponsor_threads th where th.id = t
$$;

-- Messages: stamp sender and side from the session; bump the thread.
create or replace function public.before_sponsor_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare side text;
begin
  side := public.thread_side(new.thread_id);
  if side is null then raise exception 'You are not part of this conversation'; end if;
  new.sender_id := auth.uid();
  new.sender_side := side;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists sponsor_messages_stamp on public.sponsor_messages;
create trigger sponsor_messages_stamp before insert on public.sponsor_messages
  for each row execute function public.before_sponsor_message();

create or replace function public.after_sponsor_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.sponsor_threads set last_message_at = new.created_at where id = new.thread_id;
  insert into public.sponsor_thread_reads (thread_id, user_id, read_at)
  values (new.thread_id, new.sender_id, now())
  on conflict (thread_id, user_id) do update set read_at = excluded.read_at;
  return new;
end $$;
drop trigger if exists sponsor_messages_bump on public.sponsor_messages;
create trigger sponsor_messages_bump after insert on public.sponsor_messages
  for each row execute function public.after_sponsor_message();

-- ---------- Grants + RLS ---------------------------------------------------
grant select on public.sponsor_profiles to anon;
grant select, insert, update, delete on public.sponsor_profiles, public.sponsor_threads, public.sponsor_thread_reads to authenticated;
grant select, insert on public.sponsor_messages to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all on public.sponsor_profiles, public.sponsor_threads, public.sponsor_messages, public.sponsor_thread_reads to service_role;

-- Contact details are not readable directly; see sponsor_contact() below.
revoke select on public.sponsor_profiles from anon, authenticated;
grant select (id, owner_id, slug, name, tagline, about, industry, logo_url, cover_url, website_url, city, country,
              interests, offer, budget_range, show_contact, is_published, is_hidden, created_at, updated_at)
  on public.sponsor_profiles to anon, authenticated;

-- Email/phone: visible if the sponsor made them public, to the profile owner,
-- to platform owners, and to university staff (who need to reach sponsors).
create or replace function public.sponsor_contact(p uuid)
returns table (contact_email text, contact_phone text)
language sql stable security definer set search_path = public as $$
  select s.contact_email, s.contact_phone
  from public.sponsor_profiles s
  where s.id = p
    and (s.show_contact or s.owner_id = auth.uid() or public.is_owner()
         or exists (select 1 from public.university_members m
                    where m.user_id = auth.uid() and m.role in ('admin', 'organizer')))
$$;
grant execute on function public.sponsor_contact(uuid) to anon, authenticated;

alter table public.sponsor_profiles     enable row level security;
alter table public.sponsor_threads      enable row level security;
alter table public.sponsor_messages     enable row level security;
alter table public.sponsor_thread_reads enable row level security;

drop policy if exists "public sponsor profiles" on public.sponsor_profiles;
create policy "public sponsor profiles" on public.sponsor_profiles for select
  using ((is_published and not is_hidden) or owner_id = auth.uid() or public.is_owner());
drop policy if exists "create own sponsor profile" on public.sponsor_profiles;
create policy "create own sponsor profile" on public.sponsor_profiles for insert
  with check (owner_id = auth.uid());
drop policy if exists "edit own sponsor profile" on public.sponsor_profiles;
create policy "edit own sponsor profile" on public.sponsor_profiles for update
  using (owner_id = auth.uid() or public.is_owner())
  with check (owner_id = auth.uid() or public.is_owner());
drop policy if exists "delete own sponsor profile" on public.sponsor_profiles;
create policy "delete own sponsor profile" on public.sponsor_profiles for delete
  using (owner_id = auth.uid() or public.is_owner());

drop policy if exists "participants read threads" on public.sponsor_threads;
create policy "participants read threads" on public.sponsor_threads for select
  using (public.owns_sponsor(sponsor_id)
         or public.has_uni_role(university_id, array['admin','organizer']::public.member_role[]));
drop policy if exists "participants start threads" on public.sponsor_threads;
create policy "participants start threads" on public.sponsor_threads for insert
  with check (started_by = auth.uid()
              and (public.owns_sponsor(sponsor_id)
                   or public.has_uni_role(university_id, array['admin','organizer']::public.member_role[]))
              and exists (select 1 from public.sponsor_profiles p where p.id = sponsor_id and not p.is_hidden));
drop policy if exists "participants update threads" on public.sponsor_threads;
create policy "participants update threads" on public.sponsor_threads for update
  using (public.thread_side(id) is not null) with check (public.thread_side(id) is not null);
revoke update on public.sponsor_threads from authenticated;
grant update (status) on public.sponsor_threads to authenticated;

drop policy if exists "participants read messages" on public.sponsor_messages;
create policy "participants read messages" on public.sponsor_messages for select
  using (public.thread_side(thread_id) is not null);
drop policy if exists "participants send messages" on public.sponsor_messages;
create policy "participants send messages" on public.sponsor_messages for insert
  with check (public.thread_side(thread_id) is not null);

drop policy if exists "own read markers" on public.sponsor_thread_reads;
create policy "own read markers" on public.sponsor_thread_reads for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.thread_side(thread_id) is not null);

-- Live updates for open conversations.
do $$ begin
  alter publication supabase_realtime add table public.sponsor_messages;
exception when duplicate_object then null; end $$;

-- ---------- Demo profiles (owned by the platform owner account, so they are editable) ----------
insert into public.sponsor_profiles (owner_id, slug, name, tagline, about, industry, website_url, city, country, interests, offer, budget_range, contact_email, show_contact, logo_url)
select p.id, 'connect-demo-sponsor', 'Cedar Coffee Co. (sample)',
  'Fuel for every all-nighter.',
  'Sample sponsor profile for the Connect prototype. We love supporting student events with free coffee stations, branded cups and discounts for volunteers.',
  'food', null, 'Beirut', 'Lebanon', '{tech,career,music}',
  'Coffee stations for up to 500 guests, product giveaways, 15% discount codes for attendees.',
  '$500 – $2,000', null, false, null
from public.profiles p where p.is_owner
order by p.created_at limit 1
on conflict do nothing;
