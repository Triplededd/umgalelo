import { Wallet, Users, TrendingUp, Clock } from "lucide-react";
import StatCard from "./StatCard";
import MoneyChart from "./MoneyChart";
import ContributionDonut from "./ContributionDonut";
import Leaderboard from "./Leaderboard";
import { periodBreakdown, yearTotal, periodTotal, memberLeaderboard } from "../lib/stats";
import { currentPeriod, pendingRecipients } from "../lib/stokvelEngine";

export default function Overview({ stokvel, members, contributions, payoutRounds }) {
  const year = new Date().getFullYear();
  const period = currentPeriod(stokvel.period_type);
  const chartData = periodBreakdown(contributions, stokvel, year);
  const yTotal = yearTotal(contributions, year);
  const pTotal = periodTotal(contributions, period);
  const paidThisPeriod = new Set(contributions.filter((c) => c.period === period).map((c) => c.member_id));
  const paidCount = members.filter((m) => paidThisPeriod.has(m.id)).length;
  const unpaidCount = members.length - paidCount;
  const ranked = memberLeaderboard(members, contributions);
  const pending = pendingRecipients(members, payoutRounds);
  const nextInLine = payoutRounds.find((p) => p.status === "pending");
  const nextMember = nextInLine ? members.find((m) => m.id === nextInLine.member_id) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Wallet} label={`Collected in ${year}`} value={`R${yTotal.toLocaleString()}`} tone="navy" />
        <StatCard icon={TrendingUp} label="This period" value={`R${pTotal.toLocaleString()}`} tone="green" />
        <StatCard icon={Users} label="Members" value={members.length} tone="gold" />
        <StatCard
          icon={Clock}
          label="Next payout"
          value={nextMember ? nextMember.name : pending.length > 0 ? "Not yet set" : "Cycle done"}
          tone="rust"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <MoneyChart data={chartData} />
        </div>
        <ContributionDonut paidCount={paidCount} unpaidCount={unpaidCount} />
      </div>

      <Leaderboard ranked={ranked} />
    </div>
  );
}
