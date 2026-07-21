import { useState } from "react";
import { Dices, CheckCircle2, Clock3, RotateCcw, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { pendingRecipients, randomOrder, currentPeriod } from "../lib/stokvelEngine";

export default function PayoutRotation({ stokvel, members, payoutRounds, onChange }) {
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = pendingRecipients(members, payoutRounds);
  const history = [...payoutRounds].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  async function assignPayout(member, method) {
    setError("");
    setBusy(true);
    const { error: err } = await supabase.from("payout_rounds").insert({
      stokvel_id: stokvel.id,
      member_id: member.id,
      period: currentPeriod(stokvel.period_type),
      method,
      status: "pending",
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    onChange();
  }

  async function markPaidOut(id) {
    setError("");
    const { error: err } = await supabase
      .from("payout_rounds")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (err) return setError(err.message);
    onChange();
  }

  async function pickRandom() {
    if (pending.length === 0) return;
    const [chosen] = randomOrder(pending);
    await assignPayout(chosen, "random");
  }

  async function resetCycle() {
    if (!confirm("Start a new rotation cycle? This clears the payout history so everyone becomes eligible again.")) return;
    setError("");
    const { error: err } = await supabase.from("payout_rounds").delete().eq("stokvel_id", stokvel.id);
    if (err) return setError(err.message);
    onChange();
  }

  return (
    <div className="panel p-5">
      <h2 className="text-lg mb-3">Payout rotation</h2>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-circle-rust/30 text-circle-rust text-sm rounded-md px-3 py-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {pending.length > 0 ? (
        <div className="mb-5 space-y-2">
          <p className="text-sm text-circle-ink/60">
            {pending.length} member{pending.length !== 1 ? "s" : ""} still due a payout this cycle.
          </p>
          <div className="flex gap-2 items-center flex-wrap">
            <select
              className="border border-circle-line rounded-md px-3 py-2 bg-white text-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={busy}
            >
              <option value="">Choose member…</option>
              {pending.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button
              className="btn-secondary text-sm disabled:opacity-50"
              disabled={!selectedId || busy}
              onClick={() => {
                const m = pending.find((p) => p.id === selectedId);
                if (m) assignPayout(m, "manual");
                setSelectedId("");
              }}
            >
              Assign manually
            </button>
            <button className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50" onClick={pickRandom} disabled={busy}>
              <Dices size={16} />
              {busy ? "Drawing…" : "Random draw"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-5">
          <p className="text-sm text-circle-ink/60 mb-2">Everyone has been assigned a payout this cycle.</p>
          <button className="btn-secondary text-sm flex items-center gap-1.5" onClick={resetCycle}>
            <RotateCcw size={14} />
            Start new cycle
          </button>
        </div>
      )}

      <ul className="divide-y divide-circle-line">
        {history.map((p) => {
          const member = members.find((m) => m.id === p.member_id);
          return (
            <li key={p.id} className="py-2.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {p.status === "paid" ? (
                  <CheckCircle2 size={16} className="text-circle-green" />
                ) : (
                  <Clock3 size={16} className="text-circle-gold" />
                )}
                {member?.name || "Unknown member"}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-circle-ink/40 capitalize">{p.method}</span>
                {p.status === "paid" ? (
                  <span className="tag-paid">Paid out</span>
                ) : (
                  <>
                    <span className="tag-turn">Next in line</span>
                    <button onClick={() => markPaidOut(p.id)} className="btn-secondary py-1 px-2 text-xs">
                      Mark paid out
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
        {history.length === 0 && <p className="text-circle-ink/50 text-sm py-2">No payouts assigned yet.</p>}
      </ul>
    </div>
  );
}
