import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  MapPin, AlertTriangle, TrendingUp, Building2, DollarSign,
  FileCheck, ShoppingBag, Landmark, Activity, ArrowRight, Satellite,
} from 'lucide-react';
import api from '../../services/api';
import SalesManagerLayout from '../../components/SalesManagerLayout';
import { Card, Badge, Skeleton, AreaBarChart, AlertTrendChart, useRealTime, ConnectionStatus } from '@earthglobal/design-system';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StatCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[5]};
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text};
`;

const StatSub = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin: ${({ theme }) => `${theme.spacing[6]} 0 ${theme.spacing[4]}`};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ParcelCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[4]};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #a855f7;
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(168, 85, 247, 0.15);
  }
`;

const ParcelName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  margin-bottom: 4px;
`;

const ParcelMeta = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ParcelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const QuickActions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(92, 225, 255, 0.1));
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(92, 225, 255, 0.15));
    border-color: #a855f7;
    transform: translateY(-1px);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const AlertBanner = styled.div`
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 16px 20px;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.9rem;
`;

function formatArea(sqm) {
  if (!sqm) return 'N/A';
  const ha = sqm / 10000;
  return `${ha.toFixed(2)} ha`;
}

export default function SalesManagerDashboard() {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState([]);
  const [alertTrends, setAlertTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalParcels: 0, totalAlerts: 0, totalListings: 0, totalSales: 0 });
  const { lastAlert } = useRealTime();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [parcelsRes, trendsRes] = await Promise.all([
        api.get('/parcels').catch(() => ({ data: [] })),
        api.get('/alerts/trends').catch(() => ({ data: [] })),
      ]);
      setParcels(parcelsRes.data || []);
      setAlertTrends(trendsRes.data || []);

      const totalAlerts = (trendsRes.data || []).reduce((sum, t) => sum + (t.verified || 0) + (t.unverified || 0), 0);
      setStats({
        totalParcels: (parcelsRes.data || []).length,
        totalAlerts,
        totalListings: 0,
        totalSales: 0,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <SalesManagerLayout>
      <ConnectionStatus />

      {lastAlert && (
        <AlertBanner>
          <AlertTriangle size={20} style={{ color: '#ef4444' }} />
          <span>
            New {lastAlert.alert_type || 'change'} alert detected on{' '}
            <strong>{lastAlert.parcel_name || 'a parcel'}</strong>
          </span>
        </AlertBanner>
      )}

      <SectionTitle><Activity size={20} /> Sales Manager Overview</SectionTitle>

      <Grid>
        <StatCard>
          <StatHeader><MapPin size={16} /> Parcels Available</StatHeader>
          <StatValue>{loading ? <Skeleton width="60px" /> : stats.totalParcels}</StatValue>
          <StatSub>Across all assemblies</StatSub>
        </StatCard>
        <StatCard>
          <StatHeader><AlertTriangle size={16} /> Active Alerts</StatHeader>
          <StatValue>{loading ? <Skeleton width="60px" /> : stats.totalAlerts}</StatValue>
          <StatSub>Last 12 months</StatSub>
        </StatCard>
        <StatCard>
          <StatHeader><Landmark size={16} /> Your Listings</StatHeader>
          <StatValue>{loading ? <Skeleton width="60px" /> : stats.totalListings}</StatValue>
          <StatSub>Land listed for sale</StatSub>
        </StatCard>
        <StatCard>
          <StatHeader><DollarSign size={16} /> Completed Sales</StatHeader>
          <StatValue>{loading ? <Skeleton width="60px" /> : stats.totalSales}</StatValue>
          <StatSub>10% commission per sale</StatSub>
        </StatCard>
      </Grid>

      <QuickActions>
        <ActionBtn onClick={() => navigate('/sales-manager/sell')}>
          <Landmark size={18} /> List Land for Sale
        </ActionBtn>
        <ActionBtn onClick={() => navigate('/sales-manager/buy-land')}>
          <ShoppingBag size={18} /> Browse Land Market
        </ActionBtn>
        <ActionBtn onClick={() => navigate('/sales-manager/validation')}>
          <FileCheck size={18} /> Request Validation Search
        </ActionBtn>
      </QuickActions>

      {alertTrends.length > 0 && (
        <>
          <SectionTitle><TrendingUp size={20} /> Alert Trends</SectionTitle>
          <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <AlertTrendChart data={alertTrends} />
          </Card>
        </>
      )}

      <SectionTitle><MapPin size={20} /> All Parcels (Universal Access)</SectionTitle>

      {loading ? (
        <ParcelGrid>
          {[1, 2, 3, 4, 6].map((i) => (
            <Card key={i} style={{ padding: '1rem' }}>
              <Skeleton height="24px" width="60%" style={{ marginBottom: 8 }} />
              <Skeleton height="16px" width="40%" />
            </Card>
          ))}
        </ParcelGrid>
      ) : parcels.length === 0 ? (
        <EmptyState>
          <MapPin size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div>No parcels found in the system yet.</div>
        </EmptyState>
      ) : (
        <ParcelGrid>
          {parcels.map((parcel) => (
            <ParcelCard key={parcel.id} onClick={() => navigate(`/sales-manager/parcels/${parcel.id}`)}>
              <ParcelName>{parcel.name || 'Unnamed Parcel'}</ParcelName>
              <ParcelMeta>
                <span><MapPin size={12} /> {parcel.region || 'Unknown region'}</span>
                <span>{formatArea(parcel.area_sqm)}</span>
                {parcel.survey_date && <span>Surveyed {new Date(parcel.survey_date).toLocaleDateString()}</span>}
              </ParcelMeta>
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Badge tone="purple">Monitor</Badge>
                <Badge tone="cyan">Sell</Badge>
              </div>
            </ParcelCard>
          ))}
        </ParcelGrid>
      )}
    </SalesManagerLayout>
  );
}
