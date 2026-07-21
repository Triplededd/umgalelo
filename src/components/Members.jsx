import { useState } from "react";
import { UserPlus, AlertCircle, Phone, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const AVATAR_COLORS = ["#1B3A5C", "#A6812E", "#1F5C4E", "#8C3A2B", "#4A5A6A"];

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default function Members({ stokvel, members, onChange }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const isVariable = stokvel.default_contribution == null;

  async function addMember(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    const { error: err } = await supabase.from("members").insert({
      stokvel_id: stokvel.id,
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      contribution_override: isVariable ? parseFloat(amount) || 0 : amount ? parseFloat(amount) : null,
    });
    if (err) return setError(err.message);
    setName("");
    setAmount("");
    setPhone("");
    setEmail("");
    onChange();
  }

  async function removeMember(id) {
    setError("");
    const { error: err } = await supabase.from("members").delete().eq("id", id);
    if (err) return setError(err.message);
    onChange();
  }

  return (
    <div className="panel p-5">
      <h2 className="text-lg mb-3 flex items-center gap-2">
        <UserPlus size={18} className="text-circle-navy" />
        Members
      </h2>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-circle-rust/30 text-circle-rust text-sm rounded-md px-3 py-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={addMember} className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input className="border border-circle-line rounded-md px-3 py-2 flex-1" placeholder="Member name" value={name} onChange={(e) => setName(e.target.value)} />
          <input
            type="number"
            className="border border-circle-line rounded-md px-3 py-2 w-32"
            placeholder={isVariable ? "Amount (R)" : "Override (R)"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button className="btn-primary" type="submit">Add</button>
        </div>

        <button type="button" onClick={() => setShowContact((s) => !s)} className="text-xs text-circle-navy flex items-center gap-1">
          {showContact ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showContact ? "Hide contact fields" : "Add phone / email (optional)"}
        </button>

        {showContact && (
          <div className="flex gap-2">
            <input className="border border-circle-line rounded-md px-3 py-2 flex-1 text-sm" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="border border-circle-line rounded-md px-3 py-2 flex-1 text-sm" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        )}
      </form>

      <ul className="divide-y divide-circle-line">
        {members.map((m, i) => {
          const expanded = expandedId === m.id;
          const hasContact = m.phone || m.email;
          return (
            <li key={m.id} className="py-2.5 text-sm">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-3 text-left"
                  onClick={() => hasContact && setExpandedId(expanded ? null : m.id)}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0"
                    style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {initials(m.name)}
                  </span>
                  <span>{m.name}</span>
                  {hasContact && (expanded ? <ChevronUp size={13} className="text-circle-ink/30" /> : <ChevronDown size={13} className="text-circle-ink/30" />)}
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-circle-ink/50 font-mono">
                    R{m.contribution_override ?? stokvel.default_contribution ?? 0}
                  </span>
                  <button onClick={() => removeMember(m.id)} className="text-circle-rust text-xs">Remove</button>
                </div>
              </div>
              {expanded && hasContact && (
                <div className="ml-10 mt-1.5 flex flex-col gap-1 text-xs text-circle-ink/60">
                  {m.phone && <span className="flex items-center gap-1.5"><Phone size={11} />{m.phone}</span>}
                  {m.email && <span className="flex items-center gap-1.5"><Mail size={11} />{m.email}</span>}
                </div>
              )}
            </li>
          );
        })}
        {members.length === 0 && <p className="text-circle-ink/50 text-sm py-2">No members yet.</p>}
      </ul>
    </div>
  );
}
