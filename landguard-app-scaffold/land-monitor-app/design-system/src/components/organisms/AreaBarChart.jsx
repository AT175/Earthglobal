import { useTheme } from 'styled-components';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const CustomTooltip = ({ active, payload, label, theme, unit }) => {
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
        {payload[0].value.toFixed(2)} {unit}
      </div>
    </div>
  );
};

/**
 * AreaBarChart — themed recharts bar chart for parcel area (or any single-series
 * numeric data). Bars render in the EarthGlobal primary blue with a cyan gradient
 * top, axes/gridlines are muted to fit the dark surface.
 *
 * @param {{name: string, value: number}[]} data
 */
export default function AreaBarChart({ data = [], unit = 'ha', height = 240 }) {
  const theme = useTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="earthglobalBarFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.colors.cyan} stopOpacity={0.9} />
            <stop offset="100%" stopColor={theme.colors.primary} stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={theme.colors.borderDark} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: theme.colors.textMuted, fontSize: 12 }}
          axisLine={{ stroke: theme.colors.border }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: theme.colors.textMuted, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip theme={theme} unit={unit} />} cursor={{ fill: theme.colors.surfaceLight }} />
        <Bar dataKey="value" fill="url(#earthglobalBarFill)" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
