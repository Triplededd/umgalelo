import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabaseClient";
import Login from "./components/Login";
import Setup from "./components/Setup";
import JoinPage from "./components/JoinPage";
import AppShell from "./AppShell";

function useJoinCode() {
  const [code] = useState(() => new URLSearchParams(window.location.search).get("join"));
  return code;
}

export default function App() {
  const joinCode = useJoinCode();
  const [status, setStatus] = useState("loading");
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadUsers = useCallback(async () => {
    const configured = Boolean(
      import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    if (!configured) {
      setStatus("needsConfig");
      return;
    }
    try {
      const { data, error } = await supabase.from("admins").select("id, name").order("created_at");
      if (error) throw error;
      setUsers(data);
      setStatus(data.length === 0 ? "needsSetup" : "needsLogin");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // The join flow is public — skip the admin-loading check entirely so
    // someone following an invite link never needs to log in.
    if (joinCode) return;
    loadUsers();
  }, [loadUsers, joinCode]);

  // Anyone with a valid invite link + password lands here, no login needed.
  if (joinCode) {
    return <JoinPage code={joinCode} />;
  }

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-circle-ink/50">Loading…</div>;
  }

  if (status === "needsConfig") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="panel max-w-md p-8">
          <h1 className="text-2xl mb-3">Supabase isn't configured yet</h1>
          <p className="text-sm text-circle-ink/70 mb-3">
            Copy <code>.env.example</code> to <code>.env.local</code>, fill in your Supabase
            project URL and anon key, run <code>supabase/schema.sql</code> in the Supabase SQL
            editor, then restart the dev server.
          </p>
          <p className="text-xs text-circle-ink/50">See README.md for the full walkthrough.</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="panel max-w-md p-8">
          <h1 className="text-2xl mb-3 text-circle-rust">Couldn't connect</h1>
          <p className="text-sm text-circle-ink/70">{errorMsg}</p>
        </div>
      </div>
    );
  }

  // needsSetup only fires when zero administrators exist anywhere — a
  // one-time bootstrap. Once at least one admin exists, every subsequent
  // admin must be added from inside the app (AddAdminModal), which
  // requires an existing admin's PIN to confirm. See AppShell.jsx.
  if (status === "needsSetup") {
    return (
      <Setup
        onRegistered={(newUser) => {
          setUser(newUser);
          setStatus("ready");
        }}
      />
    );
  }

  if (status === "needsLogin") {
    return (
      <Login
        users={users}
        onLoggedIn={(loggedInUser) => {
          setUser(loggedInUser);
          setStatus("ready");
        }}
      />
    );
  }

  return (
    <AppShell
      user={user}
      onLogout={() => {
        setUser(null);
        setStatus("needsLogin");
        loadUsers();
      }}
    />
  );
}
