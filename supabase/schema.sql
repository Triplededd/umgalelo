-- Stokvel Manager: Supabase schema

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin_hash text not null,
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

-- SAME CAVEAT AS THE AUDIT SUITE PROJECT: this app uses PIN-only login
-- (no Supabase Auth session), so auth.uid() is never set. The policies
-- below are intentionally permissive for a small trusted-user app (family
-- members running a stokvel together) rather than a public multi-tenant
-- product. Money is involved here, so if you ever open this up beyond a
-- small trusted circle, move PIN verification into a Postgres function
-- (SECURITY DEFINER) that never returns pin_hash to the client, and scope
-- these policies by a real session identity instead of "true".
create policy "admins_all" on admins for all using (true) with check (true);
create policy "stokvels_all" on stokvels for all using (true) with check (true);
create policy "members_all" on members for all using (true) with check (true);
create policy "contributions_all" on contributions for all using (true) with check (true);
create policy "payout_rounds_all" on payout_rounds for all using (true) with check (true);
create policy "audit_log_insert" on audit_log for insert with check (true);
create policy "audit_log_select" on audit_log for select using (true);
create policy "join_requests_all" on join_requests for all using (true) with check (true);
-- NOTE: join_requests being world-insertable is intentional — that's the
-- whole point of the invite-code flow (a prospective member who isn't an
-- admin needs to be able to submit a request). Approving a request into a
-- real `members` row is a deliberate, separate step an admin takes inside
-- the app, so this doesn't let strangers add themselves as members directly.
