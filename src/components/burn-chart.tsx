import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BurnPoint {
  t: number;
  altKm: number;
  speed: number;
}

function compactTick(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) >= 100) return Math.round(value).toString();
  return value.toFixed(value >= 10 ? 1 : 2);
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: number | string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const t = typeof label === "number" ? label : Number(label);
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-fg">
      <div className="mb-1 tabular-nums text-muted">{Number.isFinite(t) ? `t ${t.toFixed(1)} s` : ""}</div>
      {payload.map((row) => (
        <div key={row.name} className="flex items-baseline justify-between gap-4 tabular-nums">
          <span style={{ color: row.color }}>{row.name}</span>
          <span>
            {row.value === undefined ? "—" : row.name === "Altitude" ? row.value.toFixed(2) : row.value.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

function timeAxis(data: BurnPoint[]): { end: number; ticks: number[] } {
  const last = data.length > 0 ? data[data.length - 1].t : 90;
  if (last <= 90) return { end: 90, ticks: [0, 30, 60, 90] };
  if (last <= 120) return { end: 120, ticks: [0, 30, 60, 90, 120] };
  if (last <= 300) {
    const end = last;
    const ticks = [0, 60, 120, 180, 240, 300].filter((tick) => tick <= end + 1e-6);
    return { end, ticks };
  }
  const step = last > 1200 ? 240 : 120;
  const ticks: number[] = [];
  for (let tick = 0; tick < last - 1e-3; tick += step) ticks.push(tick);
  const endTick = Math.round(last);
  if (ticks[ticks.length - 1] !== endTick) ticks.push(endTick);
  return { end: last, ticks };
}

export function BurnChart({ data, timeS }: { data: BurnPoint[]; timeS: number }) {
  const axis = timeAxis(data);
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={[0, axis.end]}
            ticks={axis.ticks}
            tickFormatter={(value: number) => `${value}`}
            stroke="var(--color-border)"
            tick={{ fill: "var(--color-muted)", fontSize: 11, fontFamily: "IBM Plex Mono, ui-monospace, monospace" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="alt"
            width={44}
            tickFormatter={compactTick}
            stroke="var(--color-border)"
            tick={{ fill: "var(--color-primary)", fontSize: 11, fontFamily: "IBM Plex Mono, ui-monospace, monospace" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="spd"
            orientation="right"
            width={48}
            tickFormatter={compactTick}
            stroke="var(--color-border)"
            tick={{ fill: "var(--color-fg)", fontSize: 11, fontFamily: "IBM Plex Mono, ui-monospace, monospace" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTip />} />
          <ReferenceLine yAxisId="alt" x={timeS} stroke="var(--color-primary)" strokeDasharray="3 3" />
          <Line
            yAxisId="alt"
            type="monotone"
            dataKey="altKm"
            name="Altitude"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="spd"
            type="monotone"
            dataKey="speed"
            name="Speed"
            stroke="var(--color-fg)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
