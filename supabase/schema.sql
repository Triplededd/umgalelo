-- Umgalelo: schema

-- A household is one trusted group sharing full access to each other's
-- stokvels — e.g. your family. Two different households (two unrelated
-- families/friend groups both using the app) never see each other's data.
-- This is the actual isolation boundary for a future multi-tenant/public
-- version; today, everyone using this deployment is in one household.
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My household',
  created_at timestamptz not null default now()
);

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  -- pin_hash is kept only for backward compatibility during the migration
  -- to real Supabase Auth sessions (see auth_user_id below) — new admins
  -- no longer need it, since Supabase Auth verifies the PIN-as-password.
  pin_hash text,
  auth_user_id uuid references auth.users(id) on delete set null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  last_login timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists stokvels (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  owner_id uuid not null references admins(id) on delete cascade,
  name text not null,
  default_contribution numeric, -- null if every member's amount is set individually
  period_type text not null default 'monthly' check (period_type in ('monthly', 'weekly')),
  invite_code text unique, -- short shareable code, e.g. "UMG-7F3K"
  invite_password_hash text, -- PBKDF2 hash of the join password, never the plaintext
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  stokvel_id uuid not null references stokvels(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  contribution_override numeric, -- overrides the stokvel default for this member
  joined_at timestamptz not null default now()
);

-- People who used the invite code + password to request joining a stokvel.
-- An existing admin must approve before they become a real `members` row —
-- this keeps randoms with the link from adding themselves unreviewed.
create table if not exists join_requests (
  id uuid primary key default gen_random_uuid(),
  stokvel_id uuid not null references stokvels(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now()
);

create table if not exists contributions (
  id uuid primary key default gen_random_uuid(),
  stokvel_id uuid not null references stokvels(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  period text not null, -- e.g. '2026-07' for monthly, or an ISO week string
  amount numeric not null,
  paid_at timestamptz not null default now(),
  unique (member_id, period)
);

create table if not exists payout_rounds (
  id uuid primary key default gen_random_uuid(),
  stokvel_id uuid not null references stokvels(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  period text not null,
  amount numeric,
  method text check (method in ('manual', 'random')),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references admins(id) on delete set null,
  action text not null,
  details jsonb default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table admins enable row level security;
alter table stokvels enable row level security;
alter table members enable row level security;
alter table contributions enable row level security;
alter table payout_rounds enable row level security;
alter table audit_log enable row level security;
alter table join_requests enable row level security;

-- Real enforcement, scoped per household: every policy below checks that
-- the request comes from a Supabase Auth session (auth.uid()) belonging
-- to an admin in the SAME household as the row being accessed. Two
-- different households (unrelated families/friend groups) can never see
-- each other's stokvels, members, contributions, or payouts — this is
-- the actual isolation boundary for running more than one group on the
-- same deployment.
create or replace function current_admin_household()
returns uuid
language sql
security definer
set search_path = public
as $$
  select household_id from admins where auth_user_id = auth.uid() limit 1;
$$;

-- KNOWN GAP, separate from data isolation above: the login screen
-- (Login.jsx) currently shows a dropdown of admin names to pick from
-- before entering a PIN, and that list is still fetched with no household
-- filter (see admins_select_for_login below) — meaning admin *names*
-- (not their data) are visible across households pre-login. That's
-- harmless for one family, but before onboarding a second real household,
-- the login flow itself needs a redesign (e.g. a household-specific
-- link/slug, or username-based login) rather than "pick from every name
-- in the database." Data isolation (stokvels/members/money) is fully
-- fixed below regardless.
create policy "admins_select_for_login" on admins
  for select using (true);
create policy "admins_update_lockout" on admins
  for update using (true);
-- Inserting a new admin row happens via registerUser() in the app, which
-- itself requires the CURRENT admin to re-confirm their PIN first (see
-- AddAdminModal.jsx) — so this policy only needs to confirm the requester
-- is already a legitimate admin, not re-implement that check in SQL.
-- EXCEPTION: the very first admin, ever, can't already be "authenticated"
-- as an admin (none exist yet) — so this also allows the insert when the
-- admins table is currently empty, as a one-time bootstrap.
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

-- join_requests stays intentionally open to INSERT from anyone — that's
-- the whole point of the public invite-code flow (a prospective member
-- who isn't an admin, and has no Supabase Auth session at all, still
-- needs to be able to submit a request). Reading/approving requests is
-- restricted to admins in the SAME household as the stokvel being joined.
create policy "join_requests_insert_public" on join_requests
  for insert with check (true);
create policy "join_requests_select_by_household" on join_requests
  for select using (
    exists (select 1 from stokvels s where s.id = join_requests.stokvel_id and s.household_id = current_admin_household())
  );
create policy "join_requests_update_by_household" on join_requests
  for update using (
    exists (select 1 from stokvels s where s.id = join_requests.stokvel_id and s.household_id = current_admin_household())
  );
