import { supabase } from "./supabaseClient";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Supabase Auth needs an email + password. Admins only ever think in terms
// of a PIN, so we synthesize a stable, non-guessable "email" per admin and
// use the PIN as the password. Nothing is ever actually emailed here.
function syntheticEmail(adminId) {
  return `admin-${adminId}@umgalelo.internal`;
}

// IMPORTANT — required one-time setup in the Supabase dashboard:
// Authentication -> Providers -> Email -> turn OFF "Confirm email".
// These synthetic addresses can never receive a real confirmation email,
// so leaving confirmation on would permanently lock every admin out right
// after they sign up.

// PINs are validated at 6+ digits in Setup.jsx / AddAdminModal.jsx to match
// Supabase's default minimum password length.

/**
 * Create a new admin. If `householdId` is given, the new admin JOINS that
 * household (used when an existing admin adds a colleague/family member —
 * see AddAdminModal.jsx). If omitted, a BRAND NEW household is created
 * first and the admin becomes its first member — used only for the very
 * first admin ever (Setup.jsx's bootstrap screen).
 */
export async function registerUser({ name, pin, householdId }) {
  let household_id = householdId;

  if (!household_id) {
    const { data: household, error: householdError } = await supabase
      .from("households")
      .insert({ name: `${name}'s household` })
      .select()
      .single();
    if (householdError) throw householdError;
    household_id = household.id;
  }

  // 1. Create the admins row first so we have an id to build the
  //    synthetic email from.
  const { data: admin, error: insertError } = await supabase
    .from("admins")
    .insert({ name, household_id })
    .select()
    .single();
  if (insertError) throw insertError;

  // 2. Create the real Supabase Auth user, PIN as password.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: syntheticEmail(admin.id),
    password: pin,
  });
  if (authError) {
    // Roll back the admins row so a failed signup (e.g. PIN too short)
    // doesn't leave an orphaned, unusable admin record behind.
    await supabase.from("admins").delete().eq("id", admin.id);
    throw authError;
  }

  // 3. Link the two together.
  const { data: linked, error: linkError } = await supabase
    .from("admins")
    .update({ auth_user_id: authData.user.id })
    .eq("id", admin.id)
    .select()
    .single();
  if (linkError) throw linkError;

  // If "Confirm email" is still on in the Supabase dashboard, signUp()
  // won't return an active session — surface a clear error instead of a
  // confusing later failure, so this gets caught during setup, not after.
  if (!authData.session) {
    throw new Error(
      "Account created, but couldn't sign in automatically. In Supabase, go to Authentication → Providers → Email and turn OFF \"Confirm email\", then try again."
    );
  }

  return linked;
}

export async function login({ userId, pin }) {
  const { data: user, error } = await supabase
    .from("admins")
    // No pin_hash to check anymore — Supabase Auth now owns password
    // verification. failed_attempts/locked_until stay here purely for the
    // app-level "locked out, try again in N minutes" UX.
    .select("id, name, household_id, failed_attempts, locked_until")
    .eq("id", userId)
    .single();
  if (error) throw error;

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    throw new Error(`Account locked. Try again in ${mins} minute(s).`);
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: syntheticEmail(userId),
    password: pin,
  });

  if (authError) {
    const attempts = (user.failed_attempts || 0) + 1;
    const patch = { failed_attempts: attempts };
    if (attempts >= MAX_ATTEMPTS) {
      patch.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
      patch.failed_attempts = 0;
    }
    await supabase.from("admins").update(patch).eq("id", userId);
    throw new Error("Incorrect PIN.");
  }

  await supabase
    .from("admins")
    .update({ failed_attempts: 0, locked_until: null, last_login: new Date().toISOString() })
    .eq("id", userId);

  return user;
}

export async function logout() {
  await supabase.auth.signOut();
}
