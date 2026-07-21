import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function ContributionDonut({ paidCount, unpaidCount }) {
  const total = paidCount + unpaidCount;
  const data = [
    { name: "Paid", value: paidCount },
    { name: "Unpaid", value: unpaidCount },
  ];
  const colors = ["#1F5C4E", "#DCD4C2"];

  return (
    <div className="panel p-5 flex flex-col items-center">
      <h2 className="text-lg mb-2 self-start">This period</h2>
      {total === 0 ? (
        <p className="text-sm text-circle-ink/50 py-10">No members yet.</p>
      ) : (
        <div className="relative">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={55} outerRadius={80} startAngle={90} endAngle={-270} stroke="none">
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} member${value !== 1 ? "s" : ""}`, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-mono font-medium text-circle-navy">{paidCount}/{total}</span>
            <span className="text-xs text-circle-ink/50">paid</span>
          </div>
        </div>
      )}
    </div>
  );
}
