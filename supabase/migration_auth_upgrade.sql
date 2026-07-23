-- Umgalelo: security migration — real Supabase Auth enforcement
-- Run this in your EXISTING Supabase project's SQL editor. It's additive
-- and safe to run on a database that already has admins/stokvels/etc —
-- it does not delete any existing rows.
--
-- After running this, existing admin accounts (created before this
-- migration) will NOT be able to log in until they're migrated to real
-- Supabase Auth users — see "EXISTING ADMINS" note at the bottom.

-- 1. Add the column that links an admins row to a real Supabase Auth user.
alter table admins add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

-- 2. pin_hash is no longer required for new admins (Supabase Auth now
--    verifies the PIN-as-password) — keep the column and existing values
--    for now, just make it optional going forward.
alter table admins alter column pin_hash drop not null;

-- 3. Helper function RLS policies check against, instead of `using (true)`.
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

-- 4. Drop every old permissive policy.
drop policy if exists "admins_all" on admins;
drop policy if exists "stokvels_all" on stokvels;
drop policy if exists "members_all" on members;
drop policy if exists "contributions_all" on contributions;
drop policy if exists "payout_rounds_all" on payout_rounds;
drop policy if exists "audit_log_insert" on audit_log;
drop policy if exists "audit_log_select" on audit_log;
drop policy if exists "join_requests_all" on join_requests;

-- 5. Recreate real policies (same set as in the current schema.sql).
create policy "admins_select_for_login" on admins for select using (true);
create policy "admins_update_lockout" on admins for update using (true);
create policy "admins_insert_by_existing_admin" on admins
  for insert with check (is_authenticated_admin() or not exists (select 1 from admins));

create policy "stokvels_by_admins" on stokvels
  for all using (is_authenticated_admin()) with check (is_authenticated_admin());
create policy "members_by_admins" on members
  for all using (is_authenticated_admin()) with check (is_authenticated_admin());
create policy "contributions_by_admins" on contributions
  for all using (is_authenticated_admin()) with check (is_authenticated_admin());
create policy "payout_rounds_by_admins" on payout_rounds
  for all using (is_authenticated_admin()) with check (is_authenticated_admin());
create policy "audit_log_insert" on audit_log for insert with check (is_authenticated_admin());
create policy "audit_log_select" on audit_log for select using (is_authenticated_admin());

create policy "join_requests_insert_public" on join_requests for insert with check (true);
create policy "join_requests_manage_by_admins" on join_requests for select using (is_authenticated_admin());
create policy "join_requests_update_by_admins" on join_requests for update using (is_authenticated_admin());

-- ---------------------------------------------------------------------
-- REQUIRED MANUAL STEP in the Supabase dashboard (not SQL):
-- Go to Authentication -> Providers -> Email, and turn OFF "Confirm email".
-- These are synthetic, non-deliverable addresses (admin-{id}@umgalelo.internal)
-- — they can never receive a real confirmation email, so leaving email
-- confirmation on would permanently lock every admin out after signup.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- EXISTING ADMINS: any admin created BEFORE this migration only has a
-- pin_hash, not a real Supabase Auth user, so auth_user_id is null and
-- they will fail to log in via the new signInWithPassword() flow. Each
-- existing admin needs a one-time re-registration: have them use the
-- app to "sign up" again with the SAME name (or ask them their old PIN
-- and re-create it) via the normal registerUser() flow, then manually
-- update their original admins row to point at the new auth user and
-- delete the duplicate, e.g.:
--
--   update admins set auth_user_id = '<new-auth-user-id>' where id = '<original-admin-id>';
--   delete from admins where id = '<duplicate-admin-id-created-during-resignup>';
--
-- If you only have one real admin so far (as of this migration), the
-- simplest path is: delete that one admins row entirely and use the
-- app's first-run "create the first administrator" screen to recreate
-- it fresh — you'll lose nothing except needing to re-enter that one
-- admin's name/PIN.
-- ---------------------------------------------------------------------
