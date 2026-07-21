import { useState, useEffect } from "react";
import { Users, Wallet, LayoutGrid, Plus, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import StatCard from "./StatCard";
import { yearTotal } from "../lib/stats";

export default function StokvelList({ onSelect, currentUser }) {
  const [stokvels, setStokvels] = useState([]);
  const [membersByStokvel, setMembersByStokvel] = useState({});
  const [contributionsByStokvel, setContributionsByStokvel] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [defaultContribution, setDefaultContribution] = useState("");
  const [variable, setVariable] = useState(false);
  const [periodType, setPeriodType] = useState("monthly");

  async function load() {
    setLoading(true);
    const { data: sData } = await supabase.from("stokvels").select("*").order("created_at");
    const list = sData || [];
    setStokvels(list);

    if (list.length > 0) {
      const ids = list.map((s) => s.id);
      const [{ data: mData }, { data: cData }] = await Promise.all([
        supabase.from("members").select("*").in("stokvel_id", ids),
        supabase.from("contributions").select("*").in("stokvel_id", ids),
      ]);
      const mGrouped = {};
      (mData || []).forEach((m) => {
        (mGrouped[m.stokvel_id] ||= []).push(m);
      });
      const cGrouped = {};
      (cData || []).forEach((c) => {
        (cGrouped[c.stokvel_id] ||= []).push(c);
      });
      setMembersByStokvel(mGrouped);
      setContributionsByStokvel(cGrouped);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createStokvel(e) {
    e.preventDefault();
    setError("");
    const { data, error: err } = await supabase
      .from("stokvels")
      .insert({
        name,
        default_contribution: variable ? null : parseFloat(defaultContribution) || 0,
        period_type: periodType,
        owner_id: currentUser.id,
      })
      .select()
      .single();
    if (err) return setError(err.message);
    setShowNew(false);
    setName("");
    setDefaultContribution("");
    await load();
    onSelect(data);
  }

  const year = new Date().getFullYear();
  const totalMembers = Object.values(membersByStokvel).reduce((s, arr) => s + arr.length, 0);
  const totalThisYear = stokvels.reduce((s, st) => s + yearTotal(contributionsByStokvel[st.id] || [], year), 0);

  if (loading) return <div className="text-center py-12 text-circle-ink/50">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl mb-6">Your stokvels</h1>

      {stokvels.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard icon={LayoutGrid} label="Active stokvels" value={stokvels.length} tone="navy" />
          <StatCard icon={Users} label="Total members" value={totalMembers} tone="gold" />
          <StatCard icon={Wallet} label={`Collected in ${year}`} value={`R${totalThisYear.toLocaleString()}`} tone="green" />
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-circle-rust/30 text-circle-rust text-sm rounded-md px-3 py-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-3 mb-6">
        {stokvels.map((s) => {
          const members = membersByStokvel[s.id] || [];
          const contributions = contributionsByStokvel[s.id] || [];
          const total = yearTotal(contributions, year);
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="panel w-full text-left p-4 flex items-center justify-between hover:border-circle-navy hover:shadow-md transition"
            >
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-circle-ink/50 capitalize mt-0.5">
                  {members.length} member{members.length !== 1 ? "s" : ""} · {s.period_type} ·{" "}
                  {s.default_contribution != null ? `R${s.default_contribution}/period` : "variable amounts"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-circle-navy font-medium">R{total.toLocaleString()}</div>
                <div className="text-xs text-circle-ink/40">this year</div>
              </div>
            </button>
          );
        })}
        {stokvels.length === 0 && <p className="text-circle-ink/50 text-sm">No stokvels yet — create the first one below.</p>}
      </div>

      {!showNew ? (
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowNew(true)}>
          <Plus size={16} />
          New stokvel
        </button>
      ) : (
        <form onSubmit={createStokvel} className="panel p-5 space-y-3">
          <div>
            <label className="text-sm font-medium">Stokvel name</label>
            <input className="w-full border border-circle-line rounded-md px-3 py-2 mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <label className="text-sm font-medium">Contribution period</label>
            <select className="w-full border border-circle-line rounded-md px-3 py-2 mt-1 bg-white" value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={variable} onChange={(e) => setVariable(e.target.checked)} />
            Members contribute different amounts
          </label>

          {!variable && (
            <div>
              <label className="text-sm font-medium">Default contribution amount (R)</label>
              <input type="number" className="w-full border border-circle-line rounded-md px-3 py-2 mt-1" value={defaultContribution} onChange={(e) => setDefaultContribution(e.target.value)} required={!variable} />
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Create</button>
            <button type="button" className="btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
