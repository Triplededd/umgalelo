import { createClient } from "@supabase/supabase-js";

// Credentials come from Vite env vars, set in .env.local (never committed)
// and in Vercel's Environment Variables panel for production.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  // Fail loudly in dev rather than silently running with an undefined client.
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in."
  );
}

// IMPORTANT: createClient() throws synchronously if given an empty/undefined
// URL or key — and that throw happens at *import time*, before React ever
// mounts, which produces a blank white screen with no on-page error. Guard
// against that by only constructing a real client when configured, and
// falling back to a placeholder URL/key otherwise (App.jsx checks
// isConfigured before ever calling a method on this client).
export const supabase = createClient(
  isConfigured ? supabaseUrl : "https://placeholder.supabase.co",
  isConfigured ? supabaseAnonKey : "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
