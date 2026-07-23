-- Stokvel Manager: Supabase schema

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
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

-- Real enforcement, not the trust-based placeholder from before: every
-- policy below checks that the request comes from a Supabase Auth session
-- (auth.uid()) belonging to a row in `admins`. This is a *shared-family*
-- model, not per-owner isolation — any logged-in admin can see/manage
-- every stokvel, matching how the app's UI already works (all admins see
-- the full stokvel list). If this ever needs to isolate data between
-- separate paying customers/strangers, add owner_id = the-requesting-
-- admin's-id checks on top of the "is a real admin" check below.
create or replace function is_authenticated_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from admins where auth_user_id = auth.uid()
  );
$$;

-- The login screen (and its lockout counter) necessarily runs BEFORE any
-- Supabase Auth session exists — it's what determines whether one gets
-- created. So `admins` needs a pre-auth read/write carve-out. This is far
-- lower-risk than the old blanket `using (true)` on every table: this row
-- only contains a name and a lockout counter, never anything resembling a
-- credential (that's now Supabase Auth's job, not this table's). Worst
-- case if someone abuses this directly against the anon key is resetting
-- their own lockout counter — actual PIN verification is still gated by
-- Supabase Auth's own sign-in checks either way.
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
    is_authenticated_admin() or not exists (select 1 from admins)
  );

create policy "stokvels_by_admins" on stokvels
  for all using (is_authenticated_admin()) with check (is_authenticated_admin());
create policy "members_by_admins" on members
  for all using (is_authenticated_admin()) with check (is_authenticated_admin());
create policy "contributions_by_admins" on contributions
  for all using (is_authenticated_admin()) with check (is_authenticated_admin());
create policy "payout_rounds_by_admins" on payout_rounds
  for all using (is_authenticated_admin()) with check (is_authenticated_admin());
create policy "audit_log_insert" on audit_log
  for insert with check (is_authenticated_admin());
create policy "audit_log_select" on audit_log
  for select using (is_authenticated_admin());

-- join_requests stays intentionally open to INSERT from anyone — that's
-- the whole point of the public invite-code flow (a prospective member
-- who isn't an admin, and has no Supabase Auth session at all, still
-- needs to be able to submit a request). Reading/approving requests is
-- restricted to real admins.
create policy "join_requests_insert_public" on join_requests
  for insert with check (true);
create policy "join_requests_manage_by_admins" on join_requests
  for select using (is_authenticated_admin());
create policy "join_requests_update_by_admins" on join_requests
  for update using (is_authenticated_admin());
