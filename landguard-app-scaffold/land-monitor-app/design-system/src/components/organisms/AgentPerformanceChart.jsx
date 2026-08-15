import { useTheme } from 'styled-components';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

const PerfTooltip = ({ active, payload, label, theme }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radii.md,
        padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
        color: theme.colors.text,
        fontSize: theme.fontSizes.sm,
        boxShadow: theme.shadows.md,
      }}
    >
      <div style={{ color: theme.colors.textMuted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: theme.fontWeights.semibold }}>
        {payload[0].value} {payload[0].value === 1 ? 'visit' : 'visits'}
      </div>
    </div>
  );
};

/**
 * AgentPerformanceChart — themed recharts bar chart showing completed visits
 * per agent. The top performer is highlighted in cyan; the rest use the
 * standard EarthGlobal blue gradient.
 *
 * @param {{name: string, visits: number}[]} data
 */
export default function AgentPerformanceChart({ data = [], height = 240 }) {
  const theme = useTheme();
  const maxVisits = data.reduce((max, d) => Math.max(max, d.visits), 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="earthglobalPerfFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.colors.cyan} stopOpacity={0.9} />
            <stop offset="100%" stopColor={theme.colors.primary} stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={theme.colors.borderDark} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: theme.colors.textMuted, fontSize: 11 }}
          axisLine={{ stroke: theme.colors.border }}
          tickLine={false}
          interval={0}
          angle={data.length > 5 ? -20 : 0}
          textAnchor={data.length > 5 ? 'end' : 'middle'}
          height={data.length > 5 ? 50 : 30}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: theme.colors.textMuted, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<PerfTooltip theme={theme} />} cursor={{ fill: theme.colors.surfaceLight }} />
        <Bar dataKey="visits" radius={[6, 6, 0, 0]} maxBarSize={56}>
          {data.map((entry, i) => (
            <Cell
              key={`cell-${i}`}
              fill={entry.visits === maxVisits && maxVisits > 0 ? theme.colors.cyan : 'url(#earthglobalPerfFill)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
