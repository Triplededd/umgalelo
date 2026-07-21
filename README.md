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
- **PIN login** with PBKDF2 hashing and lockout after repeated failed attempts.
- Modern, formal visual design — navy/gold palette, Fraunces/Inter typography, a soft animated
  gradient background, and a rotating-circle logo.

## Setup

Same process as your other projects:

### 1. Install and run locally
```powershell
npm install
npm run dev
```

### 2. Create the Supabase project
supabase.com → New project → name it, set a database password, pick a region, create.

### 3. Run the schema
Supabase dashboard → **SQL Editor** → paste all of `supabase/schema.sql` → **Run**.

### 4. Connect it
```powershell
copy .env.example .env.local
```
Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Project Settings → API. Restart `npm run dev`.

### 5. Create your account, then your parent's
First-run screen creates the first administrator. To add a **second** administrator, sign in,
click the small gear/person icon in the header, and confirm your own PIN — this is the only way
to add an admin now (see security notes).

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

- PINs are PBKDF2-hashed client-side (100k iterations) before ever being sent, with a 5-attempt
  lockout.
- **Admin creation is gated**: the very first administrator is created once, when the `admins`
  table is empty (unavoidable bootstrap step). Every admin after that can only be added by
  someone already signed in, and only after re-entering their own PIN — there's no route to
  becoming an admin without already being one.
- **Invite links require two things**: the code (in the link) and a separate password you share
  yourself (e.g. verbally or via a different channel than the link). Even then, submissions land
  as a *request* — an admin has to actively approve before someone becomes a real member with
  access to see the group's financial data.
- Same trade-off as before applies to the underlying database rules: this uses PIN-only login
  rather than Supabase Auth sessions, so the RLS policies in `schema.sql` are intentionally
  permissive for a small trusted-user app rather than a public product — read the note at the
  bottom of that file for the hardening path if this ever needs to scale beyond a family/friend
  group.
- `join_requests` is deliberately open to inserts from anyone (that's how the public join page
  works) — but reading/approving requests only happens inside the authenticated admin app.

## What's left to build

- Export contribution/payout history to PDF or Excel.
- Automated reminders (WhatsApp/SMS/email) for members who haven't paid this period.
- Edit stokvel settings after creation.
- Server-side PIN verification (Postgres function) as the next real hardening step, per the
  note in `schema.sql`.
