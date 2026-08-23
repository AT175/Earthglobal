import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  DollarSign, TrendingUp, Building2, CreditCard, Wallet, AlertCircle,
  ArrowRight, Receipt, Users, Split, PiggyBank,
} from 'lucide-react';
import FinanceLayout from '../../components/FinanceLayout';
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
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
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
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
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

const List = styled.div`
  padding: ${({ theme }) => theme.spacing[2]};
`;

const ListItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.md};
  transition: background 0.2s;
  flex-wrap: wrap;

  &:hover { background: ${({ theme }) => theme.colors.surfaceLight}; }
  @media (max-width: 480px) { gap: ${({ theme }) => theme.spacing[2]}; }
`;

const ItemIcon = styled.div`
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

const ItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemMeta = styled.div`
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

const fmtMoney = (v, currency = 'GHS') => {
  const n = Number(v || 0);
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';

const statusColors = {
  pending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  succeeded: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  paid: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  active: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  trial: { bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' },
  failed: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  refunded: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
  overdue: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  suspended: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  cancelled: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
};

export default function FinanceDashboard() {
  const [stats, setStats] = useState(null);
  const [settlements, setSettlements] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/finance/stats'),
      api.get('/finance/settlements'),
      api.get('/finance/wallets'),
    ]).then(([s, set, w]) => {
      setStats(s.data);
      setSettlements(set.data);
      setWallets(w.data);
    }).catch((err) => setError(err.response?.data?.error || 'Failed to load finance data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <FinanceLayout><Loading>Loading finance dashboard...</Loading></FinanceLayout>;
  if (error) return <FinanceLayout><ErrorBox>{error}</ErrorBox></FinanceLayout>;

  const systemTotal = settlements?.summary?.find((s) => s.destination === 'system')?.total || 0;
  const tenantTotal = settlements?.summary?.find((s) => s.destination === 'tenant')?.total || 0;
  const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  const totalMrr = stats.mrr.total_mrr;
  const totalPayments = stats.payments_by_status.reduce((sum, s) => sum + s.total, 0);
  const pendingPayments = stats.payments_by_status.find((s) => s.status === 'pending')?.count || 0;
  const overdueInvoices = stats.invoices_by_status.find((s) => s.status === 'overdue')?.count || 0;
  const pendingInvoices = stats.invoices_by_status.find((s) => s.status === 'pending')?.count || 0;

  return (
    <FinanceLayout>
      <Page>
        <Header>
          <PageTitle>Finance Dashboard</PageTitle>
          <PageSubtitle>Platform-wide overview of revenue, subscriptions, commissions, and tenant billing.</PageSubtitle>
        </Header>

        <StatsGrid>
          <StatCard $color="#22c55e" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <StatIcon $bg="rgba(34,197,94,0.15)" $color="#4ade80"><TrendingUp size={20} /></StatIcon>
            <StatValue>{fmtMoney(totalMrr)}</StatValue>
            <StatLabel>Monthly Recurring Revenue</StatLabel>
            <StatSub>
              <span>Tenant: {fmtMoney(stats.mrr.tenant_mrr)}</span>
              <span>Owner: {fmtMoney(stats.mrr.owner_mrr)}</span>
            </StatSub>
          </StatCard>

          <StatCard $color="#1677ff" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <StatIcon $bg="rgba(22,119,255,0.15)" $color="#3ba7ff"><Wallet size={20} /></StatIcon>
            <StatValue>{fmtMoney(totalPayments)}</StatValue>
            <StatLabel>Total Payments Processed</StatLabel>
            <StatSub><span><AlertCircle size={11} /> {pendingPayments} pending</span></StatSub>
          </StatCard>

          <StatCard $color="#fbbf24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <StatIcon $bg="rgba(251,191,36,0.15)" $color="#fbbf24"><DollarSign size={20} /></StatIcon>
            <StatValue>{fmtMoney(stats.commission.outstanding)}</StatValue>
            <StatLabel>Outstanding Commissions</StatLabel>
            <StatSub><span>Paid: {fmtMoney(stats.commission.paid)}</span></StatSub>
          </StatCard>

          <StatCard $color="#a855f7" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <StatIcon $bg="rgba(168,85,247,0.15)" $color="#c084fc"><Building2 size={20} /></StatIcon>
            <StatValue>{stats.tenants.active}</StatValue>
            <StatLabel>Active Tenants</StatLabel>
            <StatSub>
              <span>{stats.tenants.trial} trial</span>
              <span>{stats.tenants.suspended} suspended</span>
            </StatSub>
          </StatCard>

          <StatCard $color="#ef4444" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <StatIcon $bg="rgba(239,68,68,0.15)" $color="#f87171"><Receipt size={20} /></StatIcon>
            <StatValue>{overdueInvoices}</StatValue>
            <StatLabel>Overdue Invoices</StatLabel>
            <StatSub><span>{pendingInvoices} pending</span></StatSub>
          </StatCard>

          <StatCard $color="#5ce1ff" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <StatIcon $bg="rgba(92,225,255,0.15)" $color="#5ce1ff"><CreditCard size={20} /></StatIcon>
            <StatValue>{stats.subscriptions_by_status.find((s) => s.status === 'active')?.count || 0}</StatValue>
            <StatLabel>Active Owner Subscriptions</StatLabel>
          </StatCard>

          <StatCard $color="#22c55e" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <StatIcon $bg="rgba(34,197,94,0.15)" $color="#4ade80"><Split size={20} /></StatIcon>
            <StatValue>{fmtMoney(systemTotal)}</StatValue>
            <StatLabel>System Revenue (Settled)</StatLabel>
            <StatSub><span>Subs, upgrades, fees, commissions</span></StatSub>
          </StatCard>

          <StatCard $color="#a855f7" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <StatIcon $bg="rgba(168,85,247,0.15)" $color="#c084fc"><PiggyBank size={20} /></StatIcon>
            <StatValue>{fmtMoney(totalWalletBalance)}</StatValue>
            <StatLabel>Tenant Wallets Balance</StatLabel>
            <StatSub><span>{wallets.length} wallets - {fmtMoney(tenantTotal)} earned</span></StatSub>
          </StatCard>
        </StatsGrid>

        <Grid2>
          <Panel>
            <PanelHeader>
              <PanelTitle><Wallet size={18} /> Recent Payments</PanelTitle>
              <ViewAllLink to="/finance/payments">View all <ArrowRight size={14} /></ViewAllLink>
            </PanelHeader>
            <List>
              {stats.recent_payments.length === 0 ? (
                <Loading style={{ padding: '2rem' }}>No payments yet</Loading>
              ) : stats.recent_payments.map((p) => (
                <ListItem key={p.id}>
                  <ItemIcon $bg="rgba(34,197,94,0.15)" $color="#4ade80"><DollarSign size={16} /></ItemIcon>
                  <ItemInfo>
                    <ItemTitle>{p.owner_name}</ItemTitle>
                    <ItemMeta>{p.purpose.replace(/_/g, ' ')} - {p.provider || 'manual'}</ItemMeta>
                  </ItemInfo>
                  <ItemMeta>{fmtMoney(p.amount, p.currency)}</ItemMeta>
                  <StatusBadge $bg={statusColors[p.status]?.bg} $color={statusColors[p.status]?.color}>
                    {p.status}
                  </StatusBadge>
                </ListItem>
              ))}
            </List>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle><Users size={18} /> Subscriptions by Status</PanelTitle>
              <ViewAllLink to="/finance/plans">Manage <ArrowRight size={14} /></ViewAllLink>
            </PanelHeader>
            <List>
              {stats.subscriptions_by_status.length === 0 ? (
                <Loading style={{ padding: '2rem' }}>No subscriptions yet</Loading>
              ) : stats.subscriptions_by_status.map((s) => (
                <ListItem key={s.status}>
                  <ItemIcon $bg={statusColors[s.status]?.bg || 'rgba(107,114,128,0.15)'} $color={statusColors[s.status]?.color || '#9ca3af'}>
                    <CreditCard size={16} />
                  </ItemIcon>
                  <ItemInfo>
                    <ItemTitle style={{ textTransform: 'capitalize' }}>{s.status}</ItemTitle>
                    <ItemMeta>Owner subscriptions</ItemMeta>
                  </ItemInfo>
                  <StatValue style={{ fontSize: '1.25rem' }}>{s.count}</StatValue>
                </ListItem>
              ))}
            </List>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle><Receipt size={18} /> Invoices by Status</PanelTitle>
              <ViewAllLink to="/finance/tenants">Manage <ArrowRight size={14} /></ViewAllLink>
            </PanelHeader>
            <List>
              {stats.invoices_by_status.length === 0 ? (
                <Loading style={{ padding: '2rem' }}>No invoices yet</Loading>
              ) : stats.invoices_by_status.map((s) => (
                <ListItem key={s.status}>
                  <ItemIcon $bg={statusColors[s.status]?.bg || 'rgba(107,114,128,0.15)'} $color={statusColors[s.status]?.color || '#9ca3af'}>
                    <Receipt size={16} />
                  </ItemIcon>
                  <ItemInfo>
                    <ItemTitle style={{ textTransform: 'capitalize' }}>{s.status}</ItemTitle>
                    <ItemMeta>Tenant invoices</ItemMeta>
                  </ItemInfo>
                  <ItemMeta>{fmtMoney(s.total)}</ItemMeta>
                  <StatusBadge $bg="rgba(22,119,255,0.15)" $color="#3ba7ff">{s.count}</StatusBadge>
                </ListItem>
              ))}
            </List>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle><DollarSign size={18} /> Commission Summary</PanelTitle>
              <ViewAllLink to="/finance/payments">Details <ArrowRight size={14} /></ViewAllLink>
            </PanelHeader>
            <List>
              <ListItem>
                <ItemIcon $bg="rgba(251,191,36,0.15)" $color="#fbbf24"><AlertCircle size={16} /></ItemIcon>
                <ItemInfo>
                  <ItemTitle>Outstanding Commission</ItemTitle>
                  <ItemMeta>Across all sellers</ItemMeta>
                </ItemInfo>
                <StatValue style={{ fontSize: '1.25rem', color: '#fbbf24' }}>{fmtMoney(stats.commission.outstanding)}</StatValue>
              </ListItem>
              <ListItem>
                <ItemIcon $bg="rgba(34,197,94,0.15)" $color="#4ade80"><DollarSign size={16} /></ItemIcon>
                <ItemInfo>
                  <ItemTitle>Total Commission Paid</ItemTitle>
                  <ItemMeta>Collected from sellers</ItemMeta>
                </ItemInfo>
                <StatValue style={{ fontSize: '1.25rem', color: '#4ade80' }}>{fmtMoney(stats.commission.paid)}</StatValue>
              </ListItem>
              <ListItem>
                <ItemIcon $bg="rgba(92,225,255,0.15)" $color="#5ce1ff"><TrendingUp size={16} /></ItemIcon>
                <ItemInfo>
                  <ItemTitle>Tenant MRR</ItemTitle>
                  <ItemMeta>Monthly recurring from assemblies</ItemMeta>
                </ItemInfo>
                <StatValue style={{ fontSize: '1.25rem' }}>{fmtMoney(stats.mrr.tenant_mrr)}</StatValue>
              </ListItem>
              <ListItem>
                <ItemIcon $bg="rgba(168,85,247,0.15)" $color="#c084fc"><TrendingUp size={16} /></ItemIcon>
                <ItemInfo>
                  <ItemTitle>Owner MRR</ItemTitle>
                  <ItemMeta>Monthly recurring from owners</ItemMeta>
                </ItemInfo>
                <StatValue style={{ fontSize: '1.25rem' }}>{fmtMoney(stats.mrr.owner_mrr)}</StatValue>
              </ListItem>
            </List>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle><PiggyBank size={18} /> Tenant Wallets</PanelTitle>
              <ViewAllLink to="/finance/settlements">Manage <ArrowRight size={14} /></ViewAllLink>
            </PanelHeader>
            <List>
              {wallets.length === 0 ? (
                <Loading style={{ padding: '2rem' }}>No tenant wallets yet</Loading>
              ) : wallets.slice(0, 6).map((w) => (
                <ListItem key={w.id}>
                  <ItemIcon $bg="rgba(168,85,247,0.15)" $color="#c084fc"><Building2 size={16} /></ItemIcon>
                  <ItemInfo>
                    <ItemTitle>{w.organization_name}</ItemTitle>
                    <ItemMeta>{w.organization_type?.replace(/_/g, ' ')} - {w.region}</ItemMeta>
                  </ItemInfo>
                  <StatValue style={{ fontSize: '1.1rem', color: '#c084fc' }}>{fmtMoney(w.balance)}</StatValue>
                </ListItem>
              ))}
            </List>
          </Panel>
        </Grid2>
      </Page>
    </FinanceLayout>
  );
}
