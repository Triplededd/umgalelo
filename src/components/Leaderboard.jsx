import { Trophy } from "lucide-react";

export default function Leaderboard({ ranked }) {
  const max = Math.max(1, ...ranked.map((r) => r.total));

  return (
    <div className="panel p-5">
      <h2 className="text-lg mb-4 flex items-center gap-2">
        <Trophy size={18} className="text-circle-gold" />
        Contribution leaderboard
      </h2>
      {ranked.length === 0 ? (
        <p className="text-sm text-circle-ink/50">No members yet.</p>
      ) : (
        <ul className="space-y-3">
          {ranked.map(({ member, total }, i) => (
            <li key={member.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <span className="text-xs text-circle-ink/40 w-4">{i + 1}</span>
                  {member.name}
                </span>
                <span className="font-mono text-circle-ink/70">R{total}</span>
              </div>
              <div className="h-1.5 rounded-full bg-circle-line overflow-hidden">
                <div
                  className="h-full bg-circle-navy rounded-full transition-all"
                  style={{ width: `${(total / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
