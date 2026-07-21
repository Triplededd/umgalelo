import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function MoneyChart({ data, currency = "R" }) {
  const hasData = data.some((d) => d.total > 0);

  return (
    <div className="panel p-5">
      <h2 className="text-lg mb-4">Contributions this year</h2>
      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DCD4C2" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#1C2733" }} axisLine={{ stroke: "#DCD4C2" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#1C2733" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              formatter={(value) => [`${currency}${value}`, "Collected"]}
              contentStyle={{ borderRadius: 8, borderColor: "#DCD4C2", fontSize: 13 }}
            />
            <Bar dataKey="total" fill="#1B3A5C" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-circle-ink/50 py-10 text-center">No contributions recorded yet this year.</p>
      )}
    </div>
  );
}
