import { useState } from "react";
import { login } from "../lib/auth";
import Logo from "./Logo";

export default function Login({ users, onLoggedIn }) {
  const [selectedId, setSelectedId] = useState(users[0]?.id || "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login({ userId: selectedId, pin });
      onLoggedIn(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setPin("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="panel w-full max-w-sm p-8">
        <div className="flex justify-center mb-2">
          <Logo size="lg" showText={false} />
        </div>
        <h1 className="text-2xl mb-1 text-center">Umgalelo</h1>
        <p className="text-sm text-circle-ink/60 mb-6 text-center">Sign in to continue</p>

        <label className="block text-sm font-medium mb-1">Administrator</label>
        <select className="w-full border border-circle-line rounded-md px-3 py-2 mb-4 bg-white" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <label className="block text-sm font-medium mb-1">PIN</label>
        <input type="password" inputMode="numeric" className="w-full border border-circle-line rounded-md px-3 py-2 mb-4 tracking-widest" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />

        {error && <p className="text-circle-rust text-sm mb-4">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Checking…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
