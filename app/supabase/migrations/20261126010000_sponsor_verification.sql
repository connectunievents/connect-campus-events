-- Sponsor verification + paid listings.
--  1. A sponsor profile starts as a hidden 'draft'.
--  2. The sponsor submits business details + documents (private bucket) -> 'pending'.
--  3. A platform owner approves or rejects (with a reason).
--  4. An approved sponsor buys a listing (week / month / quarter / custom dates).
--  The directory and messaging only show sponsors that are approved AND currently listed.
-- Safe to run more than once.

-- ---------- Profile columns ----------------------------------------------------
alter table public.sponsor_profiles add column if not exists verification_status text not null default 'draft';
alter table public.sponsor_profiles drop constraint if exists sponsor_profiles_verification_status_check;
alter table public.sponsor_profiles add constraint sponsor_profiles_verification_status_check
  check (verification_status in ('draft', 'pending', 'approved', 'rejected'));
alter table public.sponsor_profiles add column if not exists legal_name text;
alter table public.sponsor_profiles add column if not exists registration_number text;
alter table public.sponsor_profiles add column if not exists registration_country text;
alter table public.sponsor_profiles add column if not exists submitted_at timestamptz;
alter table public.sponsor_profiles add column if not exists verified_at timestamptz;
alter table public.sponsor_profiles add column if not exists verified_by uuid references public.profiles(id) on delete set null;
alter table public.sponsor_profiles add column if not exists review_notes text;
alter table public.sponsor_profiles add column if not exists listed_from timestamptz;
alter table public.sponsor_profiles add column if not exists listed_until timestamptz;

grant select (verification_status, legal_name, registration_number, registration_country, submitted_at,
              verified_at, review_notes, listed_from, listed_until)
  on public.sponsor_profiles to authenticated;
grant select (verification_status, listed_from, listed_until) on public.sponsor_profiles to anon;

create or replace function public.sponsor_is_live(sp uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sponsor_profiles s
    where s.id = sp and s.verification_status = 'approved' and not s.is_hidden
      and s.listed_from <= now() and s.listed_until > now()
  )
$$;
grant execute on function public.sponsor_is_live(uuid) to anon, authenticated;

-- Sponsors may only submit for review; everything a reviewer or payment sets is locked.
create or replace function public.protect_sponsor_admin_fields()
returns trigger language plpgsql as $$
declare trusted boolean := current_user not in ('authenticated', 'anon') or public.is_owner();
begin
  if trusted then return new; end if;

  if tg_op = 'INSERT' then
    new.verification_status := 'draft';
    new.is_hidden := false;
    new.verified_at := null; new.verified_by := null; new.review_notes := null;
    new.listed_from := null; new.listed_until := null; new.submitted_at := null;
    return new;
  end if;

  if new.is_hidden is distinct from old.is_hidden
     or new.verified_at is distinct from old.verified_at
     or new.verified_by is distinct from old.verified_by
     or new.review_notes is distinct from old.review_notes
     or new.listed_from is distinct from old.listed_from
     or new.listed_until is distinct from old.listed_until then
    raise exception 'These fields are managed by the Connect team';
  end if;

  if new.verification_status is distinct from old.verification_status then
    if not (old.verification_status in ('draft', 'rejected') and new.verification_status = 'pending') then
      raise exception 'You can only submit your business for review';
    end if;
    new.submitted_at := now();
  end if;

  -- Changing the legal identity of an approved business sends it back to review.
  if old.verification_status = 'approved'
     and (new.legal_name is distinct from old.legal_name
          or new.registration_number is distinct from old.registration_number
          or new.registration_country is distinct from old.registration_country) then
    new.verification_status := 'pending';
    new.submitted_at := now();
  end if;
  return new;
end $$;
drop trigger if exists sponsor_profiles_protect_hidden on public.sponsor_profiles;
drop trigger if exists sponsor_profiles_protect_admin on public.sponsor_profiles;
create trigger sponsor_profiles_protect_admin before insert or update on public.sponsor_profiles
  for each row execute function public.protect_sponsor_admin_fields();

-- Public directory: approved + currently listed only (owners and the sponsor itself see everything).
drop policy if exists "public sponsor profiles" on public.sponsor_profiles;
create policy "public sponsor profiles" on public.sponsor_profiles for select
  using ((is_published and not is_hidden and verification_status = 'approved'
          and listed_from <= now() and listed_until > now())
         or owner_id = auth.uid() or public.is_owner());

-- Conversations can only start with a live (approved + listed) sponsor.
drop policy if exists "participants start threads" on public.sponsor_threads;
create policy "participants start threads" on public.sponsor_threads for insert
  with check (started_by = auth.uid()
              and (public.owns_sponsor(sponsor_id)
                   or public.has_uni_role(university_id, array['admin','organizer']::public.member_role[]))
              and public.sponsor_is_live(sponsor_id));

-- ---------- Business documents (private) ----------------------------------------
create table if not exists public.sponsor_documents (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.sponsor_profiles(id) on delete cascade,
  owner_id    uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  kind        text not null check (kind in ('registration', 'tax', 'other')),
  file_path   text not null,
  file_name   text not null,
  uploaded_at timestamptz not null default now()
);
create index if not exists sponsor_documents_profile on public.sponsor_documents (profile_id);
alter table public.sponsor_documents enable row level security;
grant select, insert, delete on public.sponsor_documents to authenticated;
grant all on public.sponsor_documents to service_role;

drop policy if exists "own or owner read documents" on public.sponsor_documents;
create policy "own or owner read documents" on public.sponsor_documents for select
  using (owner_id = auth.uid() or public.is_owner());
drop policy if exists "add own documents" on public.sponsor_documents;
create policy "add own documents" on public.sponsor_documents for insert
  with check (owner_id = auth.uid() and public.owns_sponsor(profile_id)
              and file_path like auth.uid()::text || '/%');
drop policy if exists "remove own documents before approval" on public.sponsor_documents;
create policy "remove own documents before approval" on public.sponsor_documents for delete
  using (owner_id = auth.uid()
         and exists (select 1 from public.sponsor_profiles s where s.id = profile_id and s.verification_status in ('draft', 'rejected')));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sponsor-docs', 'sponsor-docs', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sponsor docs upload own folder" on storage.objects;
create policy "sponsor docs upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'sponsor-docs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "sponsor docs read own or owner" on storage.objects;
create policy "sponsor docs read own or owner" on storage.objects for select to authenticated
  using (bucket_id = 'sponsor-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_owner()));
drop policy if exists "sponsor docs delete own" on storage.objects;
create policy "sponsor docs delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'sponsor-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Listing plans and pricing -------------------------------------------
create table if not exists public.listing_plans (
  id          text primary key,            -- 'week' | 'month' | 'quarter' | 'custom'
  name        text not null,
  days        int,                         -- null for custom
  price_cents int not null check (price_cents >= 0), -- fixed price, or price PER DAY for 'custom'
  currency    text not null default 'usd',
  sort_order  int not null default 0,
  is_active   boolean not null default true
);
alter table public.listing_plans enable row level security;
grant select on public.listing_plans to anon, authenticated;
grant all on public.listing_plans to service_role;
grant update (name, price_cents, is_active) on public.listing_plans to authenticated;
drop policy if exists "anyone reads plans" on public.listing_plans;
create policy "anyone reads plans" on public.listing_plans for select using (true);
drop policy if exists "owners edit plans" on public.listing_plans;
create policy "owners edit plans" on public.listing_plans for update using (public.is_owner()) with check (public.is_owner());

insert into public.listing_plans (id, name, days, price_cents, sort_order) values
  ('week',    '1 week',       7,  2500, 0),
  ('month',   '1 month',     30,  7900, 1),
  ('quarter', '3 months',    90, 19900, 2),
  ('custom',  'Custom dates', null, 500, 3)
on conflict (id) do nothing;

-- Server-side price quote (custom: per-day rate, 15% off from 30 days, 25% off from 90 days; 3–365 days).
create or replace function public.quote_listing(p_plan text, p_start date, p_end date default null)
returns table (days int, starts_at timestamptz, ends_at timestamptz, amount_cents int, currency text)
language plpgsql stable security definer set search_path = public as $$
declare pl public.listing_plans%rowtype; d int; amt int;
begin
  select * into pl from public.listing_plans where id = p_plan and is_active;
  if not found then raise exception 'Unknown plan'; end if;
  if p_start is null or p_start < (now() at time zone 'Asia/Beirut')::date then raise exception 'Start date must be today or later'; end if;
  if pl.days is not null then
    d := pl.days; amt := pl.price_cents;
  else
    if p_end is null or p_end < p_start then raise exception 'Choose an end date after the start date'; end if;
    d := (p_end - p_start) + 1;
    if d < 3 then raise exception 'Custom listings are at least 3 days'; end if;
    if d > 365 then raise exception 'Custom listings are at most 365 days'; end if;
    amt := d * pl.price_cents;
    if d >= 90 then amt := round(amt * 0.75);
    elsif d >= 30 then amt := round(amt * 0.85);
    end if;
  end if;
  return query select d,
    (p_start::timestamp at time zone 'Asia/Beirut'),
    ((p_start + d)::timestamp at time zone 'Asia/Beirut'),
    amt, pl.currency;
end $$;
grant execute on function public.quote_listing(text, date, date) to anon, authenticated;

-- ---------- Listing orders --------------------------------------------------------
create table if not exists public.sponsor_listings (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.sponsor_profiles(id) on delete cascade,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  plan_id      text not null references public.listing_plans(id),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  days         int not null,
  amount_cents int not null,
  currency     text not null default 'usd',
  status       text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  provider     text,
  provider_ref text unique,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);
create index if not exists sponsor_listings_profile on public.sponsor_listings (profile_id, created_at desc);
alter table public.sponsor_listings enable row level security;
grant select on public.sponsor_listings to authenticated;
grant all on public.sponsor_listings to service_role;
drop policy if exists "own or owner read listings" on public.sponsor_listings;
create policy "own or owner read listings" on public.sponsor_listings for select
  using (owner_id = auth.uid() or public.is_owner());

-- Create a pending order for the caller's APPROVED profile; price comes from quote_listing().
create or replace function public.create_listing_order(p_plan text, p_start date, p_end date default null)
returns public.sponsor_listings language plpgsql security definer set search_path = public as $$
declare sp public.sponsor_profiles%rowtype; q record; o public.sponsor_listings%rowtype;
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  select * into sp from public.sponsor_profiles where owner_id = auth.uid();
  if not found then raise exception 'Create your sponsor profile first'; end if;
  if sp.verification_status <> 'approved' then raise exception 'Your business must be approved before you can buy a listing'; end if;
  if sp.is_hidden then raise exception 'Your profile is suspended. Contact the Connect team.'; end if;
  -- While a listing is running, a new package is a renewal: it must start by the current end date
  -- (it is then added on after the current listing, so there is never a gap or overlap).
  if sp.listed_until is not null and sp.listed_until > now()
     and p_start > (sp.listed_until at time zone 'Asia/Beirut')::date then
    raise exception 'Your listing runs until %. Renewals start on or before that date and are added on after it.',
      to_char(sp.listed_until at time zone 'Asia/Beirut', 'Mon DD, YYYY');
  end if;
  select * into q from public.quote_listing(p_plan, p_start, p_end);
  insert into public.sponsor_listings (profile_id, owner_id, plan_id, starts_at, ends_at, days, amount_cents, currency)
  values (sp.id, auth.uid(), p_plan, q.starts_at, q.ends_at, q.days, q.amount_cents, q.currency)
  returning * into o;
  return o;
end $$;
revoke all on function public.create_listing_order(text, date, date) from public, anon;
grant execute on function public.create_listing_order(text, date, date) to authenticated;

-- Payment confirmed (service role only): mark paid and extend the listing window.
create or replace function public.fulfill_listing(p_listing uuid, p_provider text, p_ref text)
returns public.sponsor_listings language plpgsql security definer set search_path = public as $$
declare o public.sponsor_listings%rowtype; sp public.sponsor_profiles%rowtype;
begin
  select * into o from public.sponsor_listings where id = p_listing for update;
  if not found then raise exception 'Listing order not found'; end if;
  if o.status = 'paid' then return o; end if;
  update public.sponsor_listings set status = 'paid', paid_at = now(), provider = p_provider,
         provider_ref = coalesce(p_ref, provider_ref)
   where id = o.id returning * into o;
  select * into sp from public.sponsor_profiles where id = o.profile_id for update;
  if sp.listed_until is not null and sp.listed_until > now() then
    -- Renewal: add the purchased duration after the current listing ends.
    update public.sponsor_profiles
       set listed_until = sp.listed_until + (o.ends_at - o.starts_at)
     where id = sp.id;
  else
    update public.sponsor_profiles set listed_from = o.starts_at, listed_until = o.ends_at where id = sp.id;
  end if;
  return o;
end $$;
revoke all on function public.fulfill_listing(uuid, text, text) from public, anon, authenticated;
grant execute on function public.fulfill_listing(uuid, text, text) to service_role;

create or replace function public.fail_listing(p_listing uuid)
returns void language sql security definer set search_path = public as $$
  update public.sponsor_listings set status = 'failed' where id = p_listing and status = 'pending'
$$;
revoke all on function public.fail_listing(uuid) from public, anon, authenticated;
grant execute on function public.fail_listing(uuid) to service_role;

-- ---------- Sample profile: approved + listed for 30 days so the directory isn't empty ----------
update public.sponsor_profiles
   set verification_status = 'approved', verified_at = now(), review_notes = 'Sample profile for the prototype',
       legal_name = 'Cedar Coffee Co. (sample)', registration_number = 'SAMPLE-0001', registration_country = 'Lebanon',
       listed_from = now(), listed_until = now() + interval '30 days'
 where slug = 'connect-demo-sponsor';

select slug, verification_status, listed_until from public.sponsor_profiles;
