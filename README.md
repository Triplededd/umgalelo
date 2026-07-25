# Umgalelo

A web app for running a stokvel (rotating group savings scheme) — track
member contributions, manage the payout rotation, invite new members
securely, and see the group's activity summarized with charts.

## Features

- **Multiple stokvels** under one login.
- **Fixed or variable contributions** — one amount for everyone, or overrides per member.
- **Contribution tracking** per period (monthly/weekly), paid/unpaid status, running totals.
- **Payout rotation** — manual assignment or a random draw, full history, start a new cycle
  once everyone's had a turn.
- **Overview dashboard** — year-to-date and this-period totals collected, a monthly bar chart,
  a paid/unpaid donut chart, and a contribution leaderboard.
- **Member contact info** — optional phone/email per member, shown on request (not cluttering
  the main list).
- **Secure invite-to-join flow** — generate a shareable link + password for a specific stokvel;
  people who have both submit a join request with their details, which an *administrator* then
  approves or declines before they become a real member. Nobody is added automatically.
- **Locked-down admin creation** — administrators can only be added from inside the app by
  someone already logged in, and only after they re-enter their own PIN to confirm. There's no
  public "become an admin" link anywhere.
- **PIN login backed by real Supabase Auth** (not just app-level hashing), with lockout after
  repeated failed attempts and database-level access rules that actually require a valid login.
- Modern, formal visual design — navy/gold palette, Fraunces/Inter typography, a soft animated
  gradient background, and a rotating-circle logo.

## Upgrading an existing project (you have one already, again)

If you've already run `migration_auth_upgrade.sql` from before (real
Supabase Auth login working), there's one more migration on top of that:

1. **Run the household isolation migration.** Supabase dashboard → **SQL
   Editor** → paste all of `supabase/migration_households.sql` → **Run**.
   This backfills your existing admin(s) and stokvel(s) into a single
   "household" automatically — nothing you can currently see changes or
   disappears. It just adds the structure needed so a second, unrelated
   household could one day use the same deployment without ever seeing
   your family's data (or vice versa).
2. Pull the latest code and redeploy as normal — no dashboard settings to
   change this time, no admin accounts need recreating.
3. **Known limitation this migration does NOT fix**: the login screen
   still lists every admin's name across the whole database (harmless
   with one household, not fine with two) — see the note at the bottom of
   `migration_households.sql`. This is intentionally left as follow-up
   work, not silently swept under the rug — the actual financial/personal
   data is fully isolated regardless.

## Upgrading an existing project (from the very first version)

Your live Umgalelo may have started with one admin (Ndalo) created under
the original PIN-hash system, before any of the Supabase Auth work above.
Here's how to move it to the new, properly-secured setup without starting
over — do this section FIRST if you haven't already, then the household
migration above:

1. **Run the migration SQL.** Supabase dashboard → **SQL Editor** → paste
   all of `supabase/migration_auth_upgrade.sql` → **Run**. This upgrades
   your database's security rules without deleting any existing data.
2. **Turn off email confirmation** — Authentication → Providers → Email →
   turn OFF "Confirm email" (see the explanation under step 3b above).
   Required, or every new admin signup will get silently locked out.
3. **Recreate your one existing admin account.** The old "Ndalo" admin row
   only has a PIN hash, not a real Supabase Auth account, so it can't log
   in under the new system as-is. Simplest fix, since it's just the one
   account so far:
   - In Supabase → **Table Editor** → `admins` table → delete the existing
     "Ndalo" row.
   - Pull the latest code (this version), run `npm install && npm run dev`.
   - You'll land back on "create the first administrator" — recreate the
     same account (same name, a PIN 6+ digits long this time).
4. Any stokvels/members/contributions you'd already created are untouched
   by this — they're tied to the stokvel/member rows, not the admin login,
   so they'll still be there once you're logged back in.
5. Deploy as normal (`git add . && git commit && git push` — Vercel
   redeploys automatically since it's already connected).

## Setup

**Already have Umgalelo running with real data in it?** Skip to
"Upgrading an existing project" above instead of following steps
2-3 below — running the fresh `schema.sql` again won't retrofit the
security changes onto your existing tables.

Fresh install, same process as your other projects:

### 1. Install and run locally
```powershell
npm install
npm run dev
```

### 2. Create the Supabase project
supabase.com → New project → name it, set a database password, pick a region, create.

### 3. Run the schema
Supabase dashboard → **SQL Editor** → paste all of `supabase/schema.sql` → **Run**.

### 3b. Required dashboard setting — turn off email confirmation
Go to **Authentication → Providers → Email** and turn **OFF** "Confirm email".

Admin logins are built on real Supabase Auth accounts under the hood, using a
fake, never-emailed address per admin (so PINs get real, properly-verified
security instead of a hand-rolled check). Since that address can never
receive an actual confirmation email, leaving this ON would permanently
lock every admin out right after they sign up. This is a one-time setting.

### 4. Connect it
```powershell
copy .env.example .env.local
```
Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Project Settings → API. Restart `npm run dev`.

### 5. Create your account, then your parent's
First-run screen creates the first administrator — **PINs must be at least 6
digits** (Supabase's minimum password length). To add a **second**
administrator, sign in, click the small gear/person icon in the header,
and confirm your own PIN — this is the only way to add an admin now (see
security notes).

### 6. Invite members without giving them admin access
Open a stokvel → **Invite** tab → set a join password → copy the generated link. Share the link
and password (e.g. via WhatsApp) with the person you want to add. They open the link, enter the
password, fill in their name/phone/email, and submit — you'll see their request under the same
Invite tab with a badge showing how many are pending, and can approve or decline each one.

### 7. Deploy to Vercel
Watch for the `node_modules` git-tracking issue that came up before:
```powershell
git status
```
If `node_modules/...` files show up as about to be committed, run
`git rm -r --cached node_modules` first. Then:
```powershell
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/umgalelo.git
git push -u origin main
```
vercel.com → New Project → import `umgalelo` → add the two `VITE_SUPABASE_*` environment
variables → Deploy.

## Security notes

- **PIN verification is now real Supabase Auth**, not a hand-rolled hash
  comparison. Each admin has a genuine Supabase Auth account behind the
  scenes (a synthetic, never-emailed address + their PIN as the password),
  so Supabase's own battle-tested authentication handles password storage
  and session security — the app itself no longer needs to compare hashes.
  A 5-attempt app-level lockout still applies on top.
- **Data is isolated per household, not just per "any authenticated admin."**
  Every table's Row Level Security policy checks that the requesting admin
  belongs to the SAME household as the row (`current_admin_household()` in
  `schema.sql`) — stokvels, members, contributions, and payouts. Two
  unrelated households (say, your family and a friend's, both using the
  same deployment) can never see or touch each other's data, even though
  they'd share the same public Supabase URL/anon key. Within one household,
  every admin still sees everything, matching how your family actually
  uses it.
- **Known remaining gap, not yet fixed**: the login screen's admin-name
  dropdown still queries across every household with no filter — meaning
  admin *names* (not their data) would be visible across unrelated
  households if a second one ever used this deployment. See the note in
  `migration_households.sql`. Fixing this means redesigning the login
  flow itself (e.g. a household-specific link, or username/email-based
  login instead of "pick your name from a list") — worth doing before
  ever onboarding a second real, unrelated household.
- **Admin creation is still gated**: the very first administrator is
  created once, when the `admins` table is empty (unavoidable bootstrap
  step). Every admin after that can only be added by someone already
  signed in, and only after re-entering their own PIN.
- **Invite links require two things**: the code (in the link) and a
  separate password you share yourself. Submissions land as a *request* —
  an admin has to actively approve before someone becomes a real member
  with access to the group's financial data. (The invite/join password
  itself still uses the original PBKDF2 hashing in `crypto.js` — that's
  unrelated to admin login and didn't need to change.)
- `join_requests` stays deliberately open to inserts from anyone (that's
  how the public join page works) — reading/approving requests requires
  being a real, authenticated admin.
- The `admins` table's `select`/lockout-`update` policies are still
  intentionally permissive (`using (true)`) — necessary since the login
  screen itself runs before any session exists. This is low-risk: that
  table only ever exposes a name and a lockout counter, never a credential
  (Supabase Auth owns that separately, and isn't exposed via this table
  at all).

## What's left to build

- **Public sign-up** — right now, a brand new household can only be created via
  the one-time "zero admins exist yet" bootstrap screen. A real public
  version needs an always-available "create your own household" flow.
- **Fix the login screen's cross-household name list** (see security notes
  above) — required before a second unrelated household ever uses this.
- Export contribution/payout history to PDF or Excel.
- Automated reminders (WhatsApp/SMS/email) for members who haven't paid this period.
- Edit stokvel settings after creation.
- If actually launching publicly: re-read the "$0 funding" constraints
  discussed separately — Vercel's free tier prohibits commercial use, and
  POPIA obligations apply once you're holding strangers' financial/contact data.
