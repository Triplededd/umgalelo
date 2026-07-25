-- Umgalelo: household isolation migration
-- Run this AFTER migration_auth_upgrade.sql has already been applied.
-- Safe to run on your existing live project — it backfills your current
-- admin(s) and stokvel(s) into a single household first, so nothing you
-- already have access to changes. It only adds the STRUCTURE needed to
-- support more than one isolated household later.

-- 1. Create the households table.
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My household',
  created_at timestamptz not null default now()
);

-- 2. Add household_id columns (nullable for now, until backfilled below).
alter table admins add column if not exists household_id uuid references households(id) on delete cascade;
alter table stokvels add column if not exists household_id uuid references households(id) on delete cascade;

-- 3. Create one household and backfill every EXISTING admin/stokvel into
--    it. This preserves your current "everyone sees everything" behavior
--    exactly — nothing you can currently see will disappear.
do $$
declare
  existing_household_id uuid;
begin
  if exists (select 1 from admins where household_id is null)
     or exists (select 1 from stokvels where household_id is null) then
    insert into households (name) values ('Umgalelo household') returning id into existing_household_id;
    update admins set household_id = existing_household_id where household_id is null;
    update stokvels set household_id = existing_household_id where household_id is null;
  end if;
end $$;

-- 4. Now that every row has one, make it required going forward.
alter table admins alter column household_id set not null;
alter table stokvels alter column household_id set not null;

-- 5. Replace the old "any authenticated admin" policies with real
--    per-household isolation.

create or replace function current_admin_household()
returns uuid
language sql
security definer
set search_path = public
as $$
  select household_id from admins where auth_user_id = auth.uid() limit 1;
$$;

drop policy if exists "stokvels_by_admins" on stokvels;
drop policy if exists "members_by_admins" on members;
drop policy if exists "contributions_by_admins" on contributions;
drop policy if exists "payout_rounds_by_admins" on payout_rounds;
drop policy if exists "audit_log_insert" on audit_log;
drop policy if exists "audit_log_select" on audit_log;
drop policy if exists "join_requests_manage_by_admins" on join_requests;
drop policy if exists "join_requests_update_by_admins" on join_requests;
drop policy if exists "admins_insert_by_existing_admin" on admins;

-- Now safe to drop — nothing references it anymore.
drop function if exists is_authenticated_admin();

alter table households enable row level security;
create policy "households_by_members" on households
  for select using (id = current_admin_household());

create policy "admins_insert_by_existing_admin" on admins
  for insert with check (
    household_id = current_admin_household() or not exists (select 1 from admins)
  );

create policy "stokvels_by_household" on stokvels
  for all using (household_id = current_admin_household())
  with check (household_id = current_admin_household());

create policy "members_by_household" on members
  for all using (
    exists (select 1 from stokvels s where s.id = members.stokvel_id and s.household_id = current_admin_household())
  )
  with check (
    exists (select 1 from stokvels s where s.id = members.stokvel_id and s.household_id = current_admin_household())
  );

create policy "contributions_by_household" on contributions
  for all using (
    exists (select 1 from stokvels s where s.id = contributions.stokvel_id and s.household_id = current_admin_household())
  )
  with check (
    exists (select 1 from stokvels s where s.id = contributions.stokvel_id and s.household_id = current_admin_household())
  );

create policy "payout_rounds_by_household" on payout_rounds
  for all using (
    exists (select 1 from stokvels s where s.id = payout_rounds.stokvel_id and s.household_id = current_admin_household())
  )
  with check (
    exists (select 1 from stokvels s where s.id = payout_rounds.stokvel_id and s.household_id = current_admin_household())
  );

create policy "audit_log_insert" on audit_log
  for insert with check (current_admin_household() is not null);
create policy "audit_log_select" on audit_log
  for select using (
    admin_id in (select id from admins where household_id = current_admin_household())
  );

create policy "join_requests_select_by_household" on join_requests
  for select using (
    exists (select 1 from stokvels s where s.id = join_requests.stokvel_id and s.household_id = current_admin_household())
  );
create policy "join_requests_update_by_household" on join_requests
  for update using (
    exists (select 1 from stokvels s where s.id = join_requests.stokvel_id and s.household_id = current_admin_household())
  );

-- ---------------------------------------------------------------------
-- KNOWN GAP after this migration: the login screen still shows a dropdown
-- of ALL admin names across every household (admins_select_for_login is
-- still `using (true)`, unchanged by this migration) — fine for one
-- household, but before a second real, unrelated household ever uses this
-- deployment, the login flow needs a redesign (household-specific link,
-- or username/email-based login) so one household's admin names aren't
-- visible to another's. The actual DATA (stokvels/members/money) is fully
-- isolated by the policies above regardless.
-- ---------------------------------------------------------------------
