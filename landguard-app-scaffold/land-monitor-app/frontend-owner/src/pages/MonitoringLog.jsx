import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  Activity, Droplets, Flame, TreePine, Thermometer, Beaker, Waves,
  DollarSign, Layers, MapPin, Satellite, Building2, CloudRain, Leaf,
  Filter, ChevronRight,
} from 'lucide-react';
import { Card, Badge, Button, Skeleton } from '@earthglobal/design-system';
import api from '../services/api';
import OwnerLayout from '../components/OwnerLayout';

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const FilterBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  align-items: center;
`;

const FilterSelect = styled.select`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
`;

const LogTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const LogRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: center;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const IconWrap = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.md};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bg }) => $bg || 'rgba(59,167,255,0.1)'};
`;

const LogInfo = styled.div`
  min-width: 0;
`;

const LogTitle = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const LogSummary = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LogDate = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: right;
  white-space: nowrap;
`;

const ParcelLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primaryBright};
  text-decoration: none;
  font-size: ${({ theme }) => theme.fontSizes.xs};

  &:hover { text-decoration: underline; }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const StatsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
  flex-wrap: wrap;
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  min-width: 120px;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
`;

const INDICATOR_META = {
  flood: { label: 'Flood Monitor', icon: Droplets, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  encroachment: { label: 'Encroachment', icon: Building2, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  lulc: { label: 'Land Cover', icon: Layers, color: '#84cc16', bg: 'rgba(132,204,22,0.1)' },
  fire: { label: 'Fire Detection', icon: Flame, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  soil_moisture: { label: 'Soil Moisture', icon: Beaker, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  rainfall: { label: 'Rainfall', icon: CloudRain, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
  tree_cover_loss: { label: 'Tree Cover Loss', icon: TreePine, color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  land_surface_temp: { label: 'Surface Temp', icon: Thermometer, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  multi_index: { label: 'Vegetation Indices', icon: Leaf, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  water: { label: 'Water Body', icon: Waves, color: '#0284c7', bg: 'rgba(2,132,199,0.1)' },
  carbon_stock: { label: 'Carbon Stock', icon: Activity, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  valuation: { label: 'Valuation', icon: DollarSign, color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  historical_imagery: { label: 'Historical Imagery', icon: Satellite, color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
};

export default function MonitoringLog() {
  const [logs, setLogs] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterIndicator, setFilterIndicator] = useState('');
  const [filterParcel, setFilterParcel] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterIndicator) params.set('indicator', filterIndicator);
    params.set('limit', '500');
    api.get(`/parcels/monitoring-log/all?${params.toString()}`)
      .then((res) => {
        setLogs(res.data.logs || []);
        setParcels(res.data.parcels || []);
      })
      .catch(() => { setLogs([]); setParcels([]); })
      .finally(() => setLoading(false));
  }, [filterIndicator]);

  const filteredLogs = filterParcel
    ? logs.filter(l => l.parcel_id === filterParcel)
    : logs;

  // Stats
  const indicatorCounts = {};
  logs.forEach(l => { indicatorCounts[l.indicator] = (indicatorCounts[l.indicator] || 0) + 1; });
  const topIndicators = Object.entries(indicatorCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <OwnerLayout>
      <Title>Monitoring Log</Title>
      <Subtitle>Historical record of all monitoring runs on your parcels. Each time you run a monitoring tool, the result is saved here for future review.</Subtitle>

      <StatsRow>
        <StatCard>
          <StatValue>{logs.length}</StatValue>
          <StatLabel>Total monitoring runs</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{parcels.length}</StatValue>
          <StatLabel>Parcels monitored</StatLabel>
        </StatCard>
        {topIndicators.map(([ind, count]) => {
          const meta = INDICATOR_META[ind] || { label: ind, color: '#3ba7ff' };
          return (
            <StatCard key={ind}>
              <StatValue style={{ color: meta.color }}>{count}</StatValue>
              <StatLabel>{meta.label}</StatLabel>
            </StatCard>
          );
        })}
      </StatsRow>

      <FilterBar>
        <Filter style={{ width: 16, height: 16, color: '#aab7d4' }} />
        <FilterSelect value={filterIndicator} onChange={(e) => setFilterIndicator(e.target.value)}>
          <option value="">All indicators</option>
          {Object.entries(INDICATOR_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={filterParcel} onChange={(e) => setFilterParcel(e.target.value)}>
          <option value="">All parcels</option>
          {parcels.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </FilterSelect>
        {(filterIndicator || filterParcel) && (
          <Button variant="secondary" onClick={() => { setFilterIndicator(''); setFilterParcel(''); }}>
            Clear
          </Button>
        )}
      </FilterBar>

      {loading ? (
        <Skeleton height="400px" />
      ) : filteredLogs.length === 0 ? (
        <Card>
          <EmptyState>
            <Activity size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>No monitoring logs yet</div>
            <div style={{ fontSize: '0.85rem' }}>
              Run monitoring tools on your parcels to start building a history.
              Go to a <Link to="/dashboard" style={{ color: '#5ce1ff' }}>parcel</Link> and click "Run All Monitoring".
            </div>
          </EmptyState>
        </Card>
      ) : (
        <LogTable>
          {filteredLogs.map((log) => {
            const meta = INDICATOR_META[log.indicator] || { label: log.indicator, icon: Activity, color: '#3ba7ff', bg: 'rgba(59,167,255,0.1)' };
            const Icon = meta.icon;
            return (
              <LogRow key={log.id}>
                <IconWrap $bg={meta.bg}>
                  <Icon size={20} color={meta.color} />
                </IconWrap>
                <LogInfo>
                  <LogTitle>
                    {meta.label}
                    <ParcelLink to={`/parcels/${log.parcel_id}`}>{log.parcel_name}</ParcelLink>
                  </LogTitle>
                  <LogSummary>{log.summary || log.result?.interpretation || '—'}</LogSummary>
                </LogInfo>
                <LogDate>
                  {new Date(log.detected_at).toLocaleDateString()}<br />
                  {new Date(log.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </LogDate>
              </LogRow>
            );
          })}
        </LogTable>
      )}
    </OwnerLayout>
  );
}
