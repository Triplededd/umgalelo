import { useState } from "react";
import { Share2, RefreshCw, Copy, Check, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { generateInviteCode } from "../lib/stokvelEngine";
import { hashPin } from "../lib/crypto";

export default function ShareInvite({ stokvel, onChange }) {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const joinUrl = stokvel.invite_code
    ? `${window.location.origin}${window.location.pathname}?join=${stokvel.invite_code}`
    : null;

  async function generateInvite(e) {
    e.preventDefault();
    if (newPassword.length < 4) return setError("Password should be at least 4 characters.");
    setBusy(true);
    setError("");
    try {
      const code = stokvel.invite_code || generateInviteCode();
      const passwordHash = await hashPin(newPassword);
      const { error: err } = await supabase
        .from("stokvels")
        .update({ invite_code: code, invite_password_hash: passwordHash })
        .eq("id", stokvel.id);
      if (err) throw err;
      setNewPassword("");
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite() {
    if (!confirm("Revoke this invite link? The current code and password will stop working.")) return;
    await supabase.from("stokvels").update({ invite_code: null, invite_password_hash: null }).eq("id", stokvel.id);
    onChange();
  }

  function copyLink() {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="panel p-5">
      <h2 className="text-lg mb-3 flex items-center gap-2">
        <Share2 size={18} className="text-circle-navy" />
        Invite members to join
      </h2>

      {error && <p className="text-circle-rust text-sm mb-3">{error}</p>}

      {stokvel.invite_code ? (
        <div className="space-y-3">
          <p className="text-sm text-circle-ink/60">
            Share this link — anyone with it still needs the password to request joining, and you
            approve each request before they become a member.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-circle-bg border border-circle-line rounded-md px-3 py-2 text-sm truncate">
              {joinUrl}
            </code>
            <button onClick={copyLink} className="btn-secondary text-sm flex items-center gap-1.5 shrink-0">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-circle-ink/60">Invite code:</span>
            <span className="font-mono font-medium">{stokvel.invite_code}</span>
          </div>
          <button onClick={revokeInvite} className="text-xs text-circle-rust underline">
            Revoke invite link
          </button>
        </div>
      ) : (
        <form onSubmit={generateInvite} className="space-y-3">
          <p className="text-sm text-circle-ink/60">
            Set a join password, then share the generated link + password with people you want to invite.
          </p>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full border border-circle-line rounded-md px-3 py-2 pr-10"
              placeholder="Choose a join password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-2.5 text-circle-ink/40">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button type="submit" disabled={busy} className="btn-primary text-sm flex items-center gap-1.5">
            <RefreshCw size={14} />
            {busy ? "Generating…" : "Generate invite link"}
          </button>
        </form>
      )}
    </div>
  );
}
