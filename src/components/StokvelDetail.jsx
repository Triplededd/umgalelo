import { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, Users, CircleDollarSign, RefreshCcw, ArrowLeft, Share2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Members from "./Members";
import Contributions from "./Contributions";
import PayoutRotation from "./PayoutRotation";
import Overview from "./Overview";
import ShareInvite from "./ShareInvite";
import JoinRequests from "./JoinRequests";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "members", label: "Members", icon: Users },
  { id: "contributions", label: "Contributions", icon: CircleDollarSign },
  { id: "payouts", label: "Payouts", icon: RefreshCcw },
  { id: "invite", label: "Invite", icon: Share2 },
];

export default function StokvelDetail({ stokvel: initialStokvel, onBack }) {
  const [stokvel, setStokvel] = useState(initialStokvel);
  const [tab, setTab] = useState("overview");
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [payoutRounds, setPayoutRounds] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [s, m, c, p, j] = await Promise.all([
      supabase.from("stokvels").select("*").eq("id", stokvel.id).single(),
      supabase.from("members").select("*").eq("stokvel_id", stokvel.id).order("joined_at"),
      supabase.from("contributions").select("*").eq("stokvel_id", stokvel.id),
      supabase.from("payout_rounds").select("*").eq("stokvel_id", stokvel.id),
      supabase.from("join_requests").select("*").eq("stokvel_id", stokvel.id).order("created_at", { ascending: false }),
    ]);
    if (s.data) setStokvel(s.data);
    setMembers(m.data || []);
    setContributions(c.data || []);
    setPayoutRounds(p.data || []);
    setJoinRequests(j.data || []);
    setLoading(false);
  }, [stokvel.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="text-center py-12 text-circle-ink/50">Loading…</div>;

  const pendingCount = joinRequests.filter((r) => r.status === "pending").length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div>
        <button onClick={onBack} className="text-sm text-circle-navy flex items-center gap-1 mb-2 hover:underline">
          <ArrowLeft size={14} />
          All stokvels
        </button>
        <h1 className="text-3xl">{stokvel.name}</h1>
      </div>

      <div className="flex gap-1 border-b border-circle-line overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
                active ? "border-circle-navy text-circle-navy" : "border-transparent text-circle-ink/50 hover:text-circle-ink"
              }`}
            >
              <Icon size={15} />
              {t.label}
              {t.id === "invite" && pendingCount > 0 && (
                <span className="bg-circle-gold text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <Overview stokvel={stokvel} members={members} contributions={contributions} payoutRounds={payoutRounds} />
      )}
      {tab === "members" && <Members stokvel={stokvel} members={members} onChange={load} />}
      {tab === "contributions" && (
        <Contributions stokvel={stokvel} members={members} contributions={contributions} onChange={load} />
      )}
      {tab === "payouts" && (
        <PayoutRotation stokvel={stokvel} members={members} payoutRounds={payoutRounds} onChange={load} />
      )}
      {tab === "invite" && (
        <div className="space-y-6">
          <ShareInvite stokvel={stokvel} onChange={load} />
          <JoinRequests stokvel={stokvel} requests={joinRequests} onChange={load} />
        </div>
      )}
    </div>
  );
}
