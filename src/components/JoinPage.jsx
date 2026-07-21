import { useState, useEffect } from "react";
import { UserPlus, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { verifyPin } from "../lib/crypto";
import Logo from "./Logo";

export default function JoinPage({ code }) {
  const [stokvel, setStokvel] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState("password"); // password | details | done
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("stokvels")
        .select("id, name, invite_code, invite_password_hash")
        .eq("invite_code", code)
        .single();
      if (!data) setNotFound(true);
      else setStokvel(data);
    }
    load();
  }, [code]);

  async function checkPassword(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const valid = await verifyPin(password, stokvel.invite_password_hash);
    setBusy(false);
    if (!valid) return setError("Incorrect password.");
    setStep("details");
  }

  async function submitRequest(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.from("join_requests").insert({
      stokvel_id: stokvel.id,
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
    });
    setBusy(false);
    if (err) return setError(err.message);
    setStep("done");
  }

  if (notFound) {
    return (
      <Centered>
        <p className="text-circle-rust">This invite link isn't valid or has been revoked.</p>
      </Centered>
    );
  }

  if (!stokvel) {
    return <Centered><p className="text-circle-ink/50">Loading…</p></Centered>;
  }

  return (
    <Centered>
      <div className="flex justify-center mb-2">
        <Logo size="lg" showText={false} />
      </div>
      <h1 className="text-2xl mb-1 text-center">Join {stokvel.name}</h1>

      {step === "password" && (
        <form onSubmit={checkPassword} className="mt-6 space-y-3">
          <p className="text-sm text-circle-ink/60 text-center">Enter the join password shared with you.</p>
          <input
            type="password"
            className="w-full border border-circle-line rounded-md px-3 py-2"
            placeholder="Join password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <ErrorMsg text={error} />}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Checking…" : "Continue"}
          </button>
        </form>
      )}

      {step === "details" && (
        <form onSubmit={submitRequest} className="mt-6 space-y-3">
          <p className="text-sm text-circle-ink/60 text-center">
            Your details go to the group's administrators for approval — you won't be added automatically.
          </p>
          <input className="w-full border border-circle-line rounded-md px-3 py-2" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <input className="w-full border border-circle-line rounded-md px-3 py-2" placeholder="Phone number (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="w-full border border-circle-line rounded-md px-3 py-2" type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <ErrorMsg text={error} />}
          <button type="submit" disabled={busy} className="btn-primary w-full flex items-center justify-center gap-1.5">
            <UserPlus size={16} />
            {busy ? "Sending…" : "Request to join"}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="mt-6 text-center space-y-2">
          <CheckCircle2 className="mx-auto text-circle-green" size={40} />
          <p className="text-sm text-circle-ink/70">
            Request sent! An administrator will review it and add you to {stokvel.name}.
          </p>
        </div>
      )}
    </Centered>
  );
}

function Centered({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="panel w-full max-w-sm p-8">{children}</div>
    </div>
  );
}

function ErrorMsg({ text }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-circle-rust/30 text-circle-rust text-sm rounded-md px-3 py-2">
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}
