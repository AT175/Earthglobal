import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  MapPin, Users, Building2, Camera, AlertTriangle, DollarSign,
  TrendingUp, Clock, CheckCircle2, ArrowRight, LogOut,
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';

const Page = styled.div`
  color: ${({ theme }) => theme.colors.text};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const PageSubtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StatCard = styled(motion.div)`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[5]};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: ${({ $color }) => $color || '#1677ff'};
  }
`;

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ $bg }) => $bg || 'rgba(22,119,255,0.15)'};
  color: ${({ $color }) => $color || '#3ba7ff'};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  line-height: 1;
`;

const StatLabel = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const StatSub = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};

  span { display: flex; align-items: center; gap: 4px; }
`;

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const Panel = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
`;

const PanelTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ViewAllLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => theme.colors.primaryBright};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-decoration: none;
  transition: opacity 0.2s;

  &:hover { opacity: 0.8; }
`;

const ActivityList = styled.div`
  padding: ${({ theme }) => theme.spacing[2]};
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.md};
  transition: background 0.2s;

  &:hover { background: ${({ theme }) => theme.colors.surfaceLight}; }
`;

const ActivityIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const ActivityInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ActivityTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ActivityMeta = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

const Loading = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ErrorBox = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.error};
  background: ${({ theme }) => theme.colors.error}10;
  border-radius: ${({ theme }) => theme.radii.lg};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
const fmtMoney = (v) => v ? `$${Number(v).toLocaleString()}` : '$0';

const statusColors = {
  pending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  completed: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  in_progress: { bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' },
  cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t: tCommon } = useTranslation('common');
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/recent-activity'),
    ]).then(([s, a]) => {
      setStats(s.data);
      setActivity(a.data);
    }).catch((err) => {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><Loading>Loading dashboard...</Loading></AdminLayout>;
  if (error) return <AdminLayout><ErrorBox>{error}</ErrorBox></AdminLayout>;

  return (
    <AdminLayout>
      <Page>
        <Header>
          <PageTitle>Admin Dashboard</PageTitle>
          <PageSubtitle>Overview of parcels, agents, visits, and alerts across the platform.</PageSubtitle>
        </Header>

        <StatsGrid>
          <StatCard $color="#1677ff" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <StatIcon $bg="rgba(22,119,255,0.15)" $color="#3ba7ff"><MapPin size={20} /></StatIcon>
            <StatValue>{stats.parcels}</StatValue>
            <StatLabel>Registered Parcels</StatLabel>
          </StatCard>

          <StatCard $color="#22c55e" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <StatIcon $bg="rgba(34,197,94,0.15)" $color="#4ade80"><Users size={20} /></StatIcon>
            <StatValue>{stats.owners}</StatValue>
            <StatLabel>Land Owners</StatLabel>
          </StatCard>

          <StatCard $color="#a855f7" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <StatIcon $bg="rgba(168,85,247,0.15)" $color="#c084fc"><Building2 size={20} /></StatIcon>
            <StatValue>{stats.agents.active}</StatValue>
            <StatLabel>Active Agents</StatLabel>
            <StatSub><span>of {stats.agents.total} total</span></StatSub>
          </StatCard>

          <StatCard $color="#fbbf24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <StatIcon $bg="rgba(251,191,36,0.15)" $color="#fbbf24"><Camera size={20} /></StatIcon>
            <StatValue>{stats.visits.completed}</StatValue>
            <StatLabel>Completed Visits</StatLabel>
            <StatSub>
              <span><Clock size={11} /> {stats.visits.pending} pending</span>
            </StatSub>
          </StatCard>

          <StatCard $color="#ef4444" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <StatIcon $bg="rgba(239,68,68,0.15)" $color="#f87171"><AlertTriangle size={20} /></StatIcon>
            <StatValue>{stats.alerts.unverified}</StatValue>
            <StatLabel>Unverified Alerts</StatLabel>
            <StatSub><span>of {stats.alerts.total} total</span></StatSub>
          </StatCard>

          <StatCard $color="#22c55e" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <StatIcon $bg="rgba(34,197,94,0.15)" $color="#4ade80"><DollarSign size={20} /></StatIcon>
            <StatValue>{fmtMoney(stats.revenue)}</StatValue>
            <StatLabel>Revenue Collected</StatLabel>
          </StatCard>
        </StatsGrid>

        <Grid2>
          <Panel>
            <PanelHeader>
              <PanelTitle><MapPin size={18} /> Recent Parcels</PanelTitle>
              <ViewAllLink to="/admin/parcels">View all <ArrowRight size={14} /></ViewAllLink>
            </PanelHeader>
            <ActivityList>
              {activity.parcels.length === 0 ? (
                <Loading style={{ padding: '2rem' }}>No parcels yet</Loading>
              ) : activity.parcels.map((p) => (
                <ActivityItem key={p.id}>
                  <ActivityIcon $bg="rgba(22,119,255,0.15)" $color="#3ba7ff"><MapPin size={16} /></ActivityIcon>
                  <ActivityInfo>
                    <ActivityTitle>{p.name}</ActivityTitle>
                    <ActivityMeta>{p.region || 'No region'} - {p.owner_name || 'Unknown owner'}</ActivityMeta>
                  </ActivityInfo>
                  <ActivityMeta>{fmtDate(p.created_at)}</ActivityMeta>
                </ActivityItem>
              ))}
            </ActivityList>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle><Camera size={18} /> Recent Visits</PanelTitle>
            </PanelHeader>
            <ActivityList>
              {activity.visits.length === 0 ? (
                <Loading style={{ padding: '2rem' }}>No visits yet</Loading>
              ) : activity.visits.map((v) => (
                <ActivityItem key={v.id}>
                  <ActivityIcon $bg="rgba(251,191,36,0.15)" $color="#fbbf24"><Camera size={16} /></ActivityIcon>
                  <ActivityInfo>
                    <ActivityTitle>{v.parcel_name || 'Unknown parcel'}</ActivityTitle>
                    <ActivityMeta>{tCommon(`visitType.${v.type}`)} visit</ActivityMeta>
                  </ActivityInfo>
                  <StatusBadge $bg={statusColors[v.status]?.bg} $color={statusColors[v.status]?.color}>
                    {v.status.replace(/_/g, ' ')}
                  </StatusBadge>
                </ActivityItem>
              ))}
            </ActivityList>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle><AlertTriangle size={18} /> Recent Alerts</PanelTitle>
            </PanelHeader>
            <ActivityList>
              {activity.alerts.length === 0 ? (
                <Loading style={{ padding: '2rem' }}>No alerts yet</Loading>
              ) : activity.alerts.map((a) => (
                <ActivityItem key={a.id}>
                  <ActivityIcon $bg="rgba(239,68,68,0.15)" $color="#f87171"><AlertTriangle size={16} /></ActivityIcon>
                  <ActivityInfo>
                    <ActivityTitle>{a.parcel_name || 'Unknown parcel'}</ActivityTitle>
                    <ActivityMeta>{a.alert_type.replace(/_/g, ' ')}</ActivityMeta>
                  </ActivityInfo>
                  {a.verified ? (
                    <StatusBadge $bg="rgba(34,197,94,0.15)" $color="#4ade80"><CheckCircle2 size={12} /> verified</StatusBadge>
                  ) : (
                    <StatusBadge $bg="rgba(251,191,36,0.15)" $color="#fbbf24"><Clock size={12} /> pending</StatusBadge>
                  )}
                </ActivityItem>
              ))}
            </ActivityList>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle><TrendingUp size={18} /> Quick Actions</PanelTitle>
            </PanelHeader>
            <ActivityList>
              <Link to="/admin" style={{ textDecoration: 'none' }}>
                <ActivityItem>
                  <ActivityIcon $bg="rgba(22,119,255,0.15)" $color="#3ba7ff"><MapPin size={16} /></ActivityIcon>
                  <ActivityInfo><ActivityTitle>Onboard New Parcel</ActivityTitle><ActivityMeta>Add a new land parcel with GPS or file import</ActivityMeta></ActivityInfo>
                  <ArrowRight size={16} color="#aab7d4" />
                </ActivityItem>
              </Link>
              <Link to="/admin/agents" style={{ textDecoration: 'none' }}>
                <ActivityItem>
                  <ActivityIcon $bg="rgba(168,85,247,0.15)" $color="#c084fc"><Users size={16} /></ActivityIcon>
                  <ActivityInfo><ActivityTitle>Manage Agents</ActivityTitle><ActivityMeta>Add, activate, or deactivate field agents</ActivityMeta></ActivityInfo>
                  <ArrowRight size={16} color="#aab7d4" />
                </ActivityItem>
              </Link>
              <Link to="/admin/parcels" style={{ textDecoration: 'none' }}>
                <ActivityItem>
                  <ActivityIcon $bg="rgba(34,197,94,0.15)" $color="#4ade80"><Building2 size={16} /></ActivityIcon>
                  <ActivityInfo><ActivityTitle>View All Parcels</ActivityTitle><ActivityMeta>Browse and search registered parcels</ActivityMeta></ActivityInfo>
                  <ArrowRight size={16} color="#aab7d4" />
                </ActivityItem>
              </Link>
            </ActivityList>
          </Panel>
        </Grid2>
      </Page>
    </AdminLayout>
  );
}
