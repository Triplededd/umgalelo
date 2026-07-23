import { useState } from "react";
import { UserCog, X, AlertCircle } from "lucide-react";
import { login, registerUser } from "../lib/auth";

export default function AddAdminModal({ currentUser, onClose, onAdded }) {
  const [step, setStep] = useState("confirm"); // confirm | create
  const [currentPin, setCurrentPin] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirmIdentity(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // Re-verify the CURRENT admin's own PIN before allowing them to add
      // anyone new — this is what stops a stranger who's simply sitting at
      // an already-unlocked screen (or who guessed the URL) from adding
      // themselves as an administrator.
      await login({ userId: currentUser.id, pin: currentPin });
      setStep("create");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function createAdmin(e) {
    e.preventDefault();
    setError("");
    if (pin.length < 6) return setError("PIN should be at least 6 digits (Supabase requires this).");
    if (pin !== confirmPin) return setError("PINs don't match.");
    setBusy(true);
    try {
      await registerUser({ name, pin });
      // registerUser() calls supabase.auth.signUp(), which silently swaps
      // the browser's active session to the brand-new admin. Restore the
      // ORIGINAL admin's session immediately, using the PIN they already
      // confirmed a moment ago — otherwise creating a new admin would
      // accidentally log the current admin out and in as someone else.
      await login({ userId: currentUser.id, pin: currentPin });
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="panel w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-circle-ink/40 hover:text-circle-ink">
          <X size={18} />
        </button>

        <h2 className="text-lg mb-1 flex items-center gap-2">
          <UserCog size={18} className="text-circle-navy" />
          Add administrator
        </h2>

        {step === "confirm" && (
          <form onSubmit={confirmIdentity} className="mt-4 space-y-3">
            <p className="text-sm text-circle-ink/60">
              For security, confirm your own PIN before adding a new administrator.
            </p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              className="w-full border border-circle-line rounded-md px-3 py-2 tracking-widest"
              placeholder="Your PIN"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
            />
            {error && <ErrorMsg text={error} />}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Checking…" : "Confirm"}
            </button>
          </form>
        )}

        {step === "create" && (
          <form onSubmit={createAdmin} className="mt-4 space-y-3">
            <input className="w-full border border-circle-line rounded-md px-3 py-2" placeholder="New administrator's name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
            <input type="password" inputMode="numeric" className="w-full border border-circle-line rounded-md px-3 py-2 tracking-widest" placeholder="Choose their PIN" value={pin} onChange={(e) => setPin(e.target.value)} required />
            <input type="password" inputMode="numeric" className="w-full border border-circle-line rounded-md px-3 py-2 tracking-widest" placeholder="Confirm PIN" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} required />
            {error && <ErrorMsg text={error} />}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Creating…" : "Create administrator"}
            </button>
          </form>
        )}
      </div>
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
