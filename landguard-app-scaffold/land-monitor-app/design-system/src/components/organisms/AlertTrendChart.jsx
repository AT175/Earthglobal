import { useTheme } from 'styled-components';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

const TrendTooltip = ({ active, payload, label, theme }) => {
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
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 2,
              background: entry.color,
            }}
            aria-hidden="true"
          />
          <span style={{ fontWeight: theme.fontWeights.semibold }}>{entry.value}</span>
          <span style={{ color: theme.colors.textMuted }}>{entry.name}</span>
        </div>
      ))}
    </div>
  );
};

const LegendLabel = ({ value, color, theme }) => (
  <span style={{ color: theme.colors.textMuted, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <span
      style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: color }}
      aria-hidden="true"
    />
    {value}
  </span>
);

/**
 * AlertTrendChart — themed recharts area chart showing alert counts over time
 * with separate series for verified vs unverified alerts.
 *
 * @param {{month: string, verified: number, unverified: number}[]} data
 */
export default function AlertTrendChart({ data = [], height = 240 }) {
  const theme = useTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="earthglobalVerifiedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.colors.success} stopOpacity={0.5} />
            <stop offset="100%" stopColor={theme.colors.success} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="earthglobalUnverifiedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.colors.warning} stopOpacity={0.5} />
            <stop offset="100%" stopColor={theme.colors.warning} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={theme.colors.borderDark} vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: theme.colors.textMuted, fontSize: 12 }}
          axisLine={{ stroke: theme.colors.border }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: theme.colors.textMuted, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<TrendTooltip theme={theme} />} cursor={{ stroke: theme.colors.border }} />
        <Legend
          formatter={(value) => {
            if (value === 'verified') return <LegendLabel value="Verified" color={theme.colors.success} theme={theme} />;
            return <LegendLabel value="Unverified" color={theme.colors.warning} theme={theme} />;
          }}
        />
        <Area
          type="monotone"
          dataKey="verified"
          stroke={theme.colors.success}
          strokeWidth={2}
          fill="url(#earthglobalVerifiedFill)"
        />
        <Area
          type="monotone"
          dataKey="unverified"
          stroke={theme.colors.warning}
          strokeWidth={2}
          fill="url(#earthglobalUnverifiedFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
