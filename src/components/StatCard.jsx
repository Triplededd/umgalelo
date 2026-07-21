export default function StatCard({ icon: Icon, label, value, tone = "navy", sub }) {
  const toneClasses = {
    navy: "bg-circle-navy/5 text-circle-navy",
    green: "bg-green-50 text-circle-green",
    gold: "bg-yellow-50 text-circle-gold",
    rust: "bg-red-50 text-circle-rust",
  };
  return (
    <div className="panel p-4 flex items-start gap-3">
      <div className={`rounded-lg p-2.5 ${toneClasses[tone]}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-mono font-medium leading-tight">{value}</div>
        <div className="text-xs text-circle-ink/55 mt-1">{label}</div>
        {sub && <div className="text-xs text-circle-ink/40 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
