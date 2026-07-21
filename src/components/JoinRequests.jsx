import { useState } from "react";
import { Inbox, Check, X, Phone, Mail } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function JoinRequests({ stokvel, requests, onChange }) {
  const [busyId, setBusyId] = useState(null);
  const pending = requests.filter((r) => r.status === "pending");

  async function approve(req) {
    setBusyId(req.id);
    await supabase.from("members").insert({
      stokvel_id: stokvel.id,
      name: req.name,
      phone: req.phone,
      email: req.email,
    });
    await supabase.from("join_requests").update({ status: "approved" }).eq("id", req.id);
    setBusyId(null);
    onChange();
  }

  async function decline(req) {
    setBusyId(req.id);
    await supabase.from("join_requests").update({ status: "declined" }).eq("id", req.id);
    setBusyId(null);
    onChange();
  }

  if (pending.length === 0) {
    return (
      <div className="panel p-5">
        <h2 className="text-lg mb-2 flex items-center gap-2">
          <Inbox size={18} className="text-circle-navy" />
          Join requests
        </h2>
        <p className="text-sm text-circle-ink/50">No pending requests.</p>
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <h2 className="text-lg mb-3 flex items-center gap-2">
        <Inbox size={18} className="text-circle-navy" />
        Join requests
        <span className="tag-turn">{pending.length} pending</span>
      </h2>
      <ul className="divide-y divide-circle-line">
        {pending.map((r) => (
          <li key={r.id} className="py-3 flex items-center justify-between text-sm">
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="flex items-center gap-3 text-xs text-circle-ink/50 mt-0.5">
                {r.phone && <span className="flex items-center gap-1"><Phone size={11} />{r.phone}</span>}
                {r.email && <span className="flex items-center gap-1"><Mail size={11} />{r.email}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={busyId === r.id}
                onClick={() => approve(r)}
                className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
              >
                <Check size={13} /> Approve
              </button>
              <button
                disabled={busyId === r.id}
                onClick={() => decline(r)}
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
              >
                <X size={13} /> Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
