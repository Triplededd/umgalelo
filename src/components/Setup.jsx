import { useState } from "react";
import { registerUser } from "../lib/auth";
import Logo from "./Logo";

export default function Setup({ onRegistered }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (pin.length < 6) return setError("PIN should be at least 6 digits (Supabase requires this).");
    if (pin !== confirmPin) return setError("PINs don't match.");
    setLoading(true);
    try {
      const user = await registerUser({ name, pin });
      onRegistered(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="panel w-full max-w-sm p-8">
        <div className="flex justify-center mb-2">
          <Logo size="lg" showText={false} />
        </div>
        <h1 className="text-2xl mb-1 text-center">Welcome</h1>
        <p className="text-sm text-circle-ink/60 mb-6 text-center">No administrators yet — set up the first account.</p>

        <label className="block text-sm font-medium mb-1">Name</label>
        <input className="w-full border border-circle-line rounded-md px-3 py-2 mb-4" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />

        <label className="block text-sm font-medium mb-1">Choose a PIN</label>
        <input type="password" inputMode="numeric" className="w-full border border-circle-line rounded-md px-3 py-2 mb-4 tracking-widest" value={pin} onChange={(e) => setPin(e.target.value)} required />

        <label className="block text-sm font-medium mb-1">Confirm PIN</label>
        <input type="password" inputMode="numeric" className="w-full border border-circle-line rounded-md px-3 py-2 mb-4 tracking-widest" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} required />

        {error && <p className="text-circle-rust text-sm mb-4">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
