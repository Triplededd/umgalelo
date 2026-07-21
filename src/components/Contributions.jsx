import { useState } from "react";
import { CheckCircle2, CircleDollarSign, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { buildContributionSummary, expectedAmount } from "../lib/stokvelEngine";
import { currentPeriod } from "../lib/stokvelEngine";

export default function Contributions({ stokvel, members, contributions, onChange }) {
  const [period] = useState(currentPeriod(stokvel.period_type));
  const [error, setError] = useState("");
  const summary = buildContributionSummary(stokvel, members, contributions, period);
  const pct = summary.totalExpected > 0 ? Math.round((summary.totalCollected / summary.totalExpected) * 100) : 0;

  async function markPaid(member, amount) {
    setError("");
    const { error: err } = await supabase.from("contributions").upsert(
      { stokvel_id: stokvel.id, member_id: member.id, period, amount },
      { onConflict: "member_id,period" }
    );
    if (err) return setError(err.message);
    onChange();
  }

  async function markUnpaid(memberId) {
    setError("");
    const { error: err } = await supabase.from("contributions").delete().eq("member_id", memberId).eq("period", period);
    if (err) return setError(err.message);
    onChange();
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg flex items-center gap-2">
          <CircleDollarSign size={18} className="text-circle-navy" />
          Contributions — {period}
        </h2>
        <span className="text-sm text-circle-ink/60 font-mono">
          R{summary.totalCollected} / R{summary.totalExpected}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-circle-line overflow-hidden mb-4">
        <div className="h-full bg-circle-green rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-circle-rust/30 text-circle-rust text-sm rounded-md px-3 py-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <ul className="divide-y divide-circle-line">
        {summary.rows.map(({ member, expected, paidAmount, isPaid }) => (
          <li key={member.id} className="py-2.5 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              {isPaid && <CheckCircle2 size={16} className="text-circle-green" />}
              {member.name}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-circle-ink/50 font-mono">R{expected}</span>
              {isPaid ? (
                <>
                  <span className="tag-paid">Paid R{paidAmount}</span>
                  <button onClick={() => markUnpaid(member.id)} className="text-xs text-circle-ink/50 underline">
                    Undo
                  </button>
                </>
              ) : (
                <>
                  <span className="tag-unpaid">Unpaid</span>
                  <button onClick={() => markPaid(member, expectedAmount(stokvel, member))} className="btn-secondary py-1 px-2 text-xs">
                    Mark paid
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
        {members.length === 0 && <p className="text-circle-ink/50 text-sm py-2">Add members first.</p>}
      </ul>

      {summary.outstanding > 0 && members.length > 0 && (
        <p className="text-xs text-circle-rust mt-3">R{summary.outstanding} still outstanding this period.</p>
      )}
    </div>
  );
}
