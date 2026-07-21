import { supabase } from "./supabaseClient";
import { hashPin, verifyPin } from "./crypto";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function registerUser({ name, pin }) {
  const pinHash = await hashPin(pin);
  const { data, error } = await supabase
    .from("admins")
    .insert({ name, pin_hash: pinHash })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function login({ userId, pin }) {
  const { data: user, error } = await supabase
    .from("admins")
    .select("id, name, pin_hash, failed_attempts, locked_until")
    .eq("id", userId)
    .single();
  if (error) throw error;

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    throw new Error(`Account locked. Try again in ${mins} minute(s).`);
  }

  const valid = await verifyPin(pin, user.pin_hash);

  if (!valid) {
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
