"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const SESSIONS_COLOR = "var(--color-navy-700)"; // brand accent, primary series
const PAGEVIEWS_COLOR = "var(--color-slate)"; // neutral, secondary series
const GRID_COLOR = "var(--color-line)";

function formatDay(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

function TooltipCard({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-navy">{label ? formatDay(label) : ""}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-1 flex items-center gap-1.5 text-slate">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-medium text-navy">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

export function AnalyticsTimeseriesChart({
  data,
}: {
  data: { date: string; sessions: number; pageviews: number }[];
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h3 className="font-display text-sm font-semibold text-navy">Visitors over time</h3>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="sessionsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SESSIONS_COLOR} stopOpacity={0.18} />
                <stop offset="100%" stopColor={SESSIONS_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDay}
              tick={{ fill: "var(--color-slate)", fontSize: 12 }}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--color-slate)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<TooltipCard />} />
            <Legend
              formatter={(value) => <span className="text-xs text-slate">{value}</span>}
              iconType="circle"
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey="sessions"
              name="Visitors"
              stroke={SESSIONS_COLOR}
              strokeWidth={2}
              fill="url(#sessionsFill)"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="pageviews"
              name="Pageviews"
              stroke={PAGEVIEWS_COLOR}
              strokeWidth={2}
              strokeOpacity={0.6}
              fill="transparent"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
