import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  Building2, FileCheck, FileX, AlertTriangle, DollarSign, Shield,
  Trees, MapPin, LogOut, RefreshCw, TrendingUp, Home, Landmark,
  CheckCircle2, XCircle, Clock, ArrowRight, Search,
  Users, Plus, Trash2, X, Save, Mail, Phone as PhoneIcon, UserCog, Map, FileText, User,
} from 'lucide-react';
import { LanguageSwitcher } from '@earthglobal/design-system';
import api from '../../services/api';

// ═══════════════════════════════════════════════════════════
// Layout
// ═══════════════════════════════════════════════════════════
const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.body};
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  background: ${({ theme }) => theme.colors.background}f0;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  @media (max-width: 768px) { padding: 12px 16px; flex-wrap: wrap; }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const LogoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  box-shadow: ${({ theme }) => theme.shadows.glowSoft};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  justify-content: flex-end;
  @media (max-width: 768px) { gap: 6px; }
  @media (max-width: 640px) { width: 100%; justify-content: flex-start; }
`;

const UserBadge = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  span:first-child { font-weight: 600; }
  span:last-child { color: ${({ theme }) => theme.colors.textMuted}; font-size: 0.75rem; }
  @media (max-width: 640px) { display: none; }
`;

const LogoutBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;
  white-space: nowrap;

  &:hover { color: ${({ theme }) => theme.colors.error}; border-color: ${({ theme }) => theme.colors.error}40; }
  @media (max-width: 640px) {
    padding: 8px; font-size: 0;
    svg { width: 16px; height: 16px; }
  }
`;

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing[6]};
  @media (max-width: 768px) { padding: ${({ theme }) => theme.spacing[4]}; }
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(92,225,255,0.3); border-radius: 4px; }
`;

const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  white-space: nowrap;
  transition: all 0.2s;

  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

// ═══════════════════════════════════════════════════════════
// Stat Cards
// ═══════════════════════════════════════════════════════════
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
  width: 44px;
  height: 44px;
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
  margin-top: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};

  span { display: flex; align-items: center; gap: 4px; }
`;

// ═══════════════════════════════════════════════════════════
// Tables
// ═══════════════════════════════════════════════════════════
const Panel = styled.div`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
  & > table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  @media (max-width: 640px) { flex-direction: column; align-items: flex-start; gap: 8px; }
`;

const PanelTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const FilterBtn = styled.button`
  padding: 4px 12px;
  border-radius: ${({ theme }) => theme.radii.full};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.borderDark)};
  background: ${({ $active, theme }) => ($active ? theme.colors.primary + '20' : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.primaryBright : theme.colors.textMuted)};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 500;
  transition: all 0.2s;

  &:hover { border-color: ${({ theme }) => theme.colors.borderLight}; }
`;

const AddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  transition: all 0.2s;

  &:hover { transform: translateY(-1px); box-shadow: ${({ theme }) => theme.shadows.glowPrimarySoft}; }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;

  th {
    text-align: left;
    padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[5]}`};
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  }

  td {
    padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[5]}`};
    font-size: ${({ theme }) => theme.fontSizes.sm};
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  }

  tr:last-child td { border-bottom: none; }
  tr:hover td { background: ${({ theme }) => theme.colors.surfaceLight}; }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ErrorState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[6]};
  color: ${({ theme }) => theme.colors.error};
  background: ${({ theme }) => theme.colors.error}10;
  border-radius: ${({ theme }) => theme.radii.lg};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════
const TABS = [
  { id: 'overview', labelKey: 'assemblyDashboard.tabs.overview', label: 'Overview', icon: TrendingUp, roles: ['assembly_admin', 'planning_officer', 'revenue_officer', 'inspector'] },
  { id: 'permits', labelKey: 'assemblyDashboard.tabs.permits', label: 'Building Permits', icon: FileCheck, roles: ['assembly_admin', 'planning_officer', 'inspector'] },
  { id: 'buildings', labelKey: 'assemblyDashboard.tabs.buildings', label: 'Detected Buildings', icon: Building2, roles: ['assembly_admin', 'planning_officer', 'inspector'] },
  { id: 'transactions', labelKey: 'assemblyDashboard.tabs.transactions', label: 'Land Transactions', icon: Landmark, roles: ['assembly_admin', 'planning_officer', 'revenue_officer'] },
  { id: 'designs', labelKey: 'assemblyDashboard.tabs.designs', label: 'Building Designs', icon: Home, roles: ['assembly_admin', 'planning_officer'] },
  { id: 'siteplans', labelKey: 'assemblyDashboard.tabs.siteplans', label: 'Site Plans', icon: FileText, roles: ['assembly_admin', 'planning_officer'] },
  { id: 'protected', labelKey: 'assemblyDashboard.tabs.protected', label: 'Protected Areas', icon: Trees, roles: ['assembly_admin', 'planning_officer', 'inspector'] },
  { id: 'revenue', labelKey: 'assemblyDashboard.tabs.revenue', label: 'Revenue', icon: DollarSign, roles: ['assembly_admin', 'revenue_officer'] },
  { id: 'alerts', labelKey: 'assemblyDashboard.tabs.alerts', label: 'Alerts', icon: AlertTriangle, roles: ['assembly_admin', 'planning_officer', 'inspector'] },
  { id: 'users', labelKey: 'assemblyDashboard.tabs.users', label: 'User Management', icon: UserCog, roles: ['assembly_admin'] },
];

const statusColors = {
  approved: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  pending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  rejected: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  unverified: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  verified_permitted: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  verified_unpermitted: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  under_investigation: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
  proper: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  improper: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  missing: { bg: 'rgba(239,68,68,0.2)', color: '#ef4444' },
  under_review: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  submitted: { bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' },
  completed: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  disputed: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  draft: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  certified: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  in_progress: { bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' },
  cancelled: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
};

export default function AssemblyDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [permits, setPermits] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [sitePlans, setSitePlans] = useState([]);
  const [sitePlanRequests, setSitePlanRequests] = useState([]);
  const [protectedAreas, setProtectedAreas] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [revenueSummary, setRevenueSummary] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);
  const [orgInfo, setOrgInfo] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', password: '', role: 'planning_officer' });
  const [savingUser, setSavingUser] = useState(false);
  const [userToast, setUserToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  const fetchData = useCallback(async (tab) => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'overview') {
        const { data } = await api.get('/assembly/stats');
        setStats(data);
      } else if (tab === 'permits') {
        const { data } = await api.get('/assembly/permits', filter ? { params: { status: filter } } : {});
        setPermits(data);
      } else if (tab === 'buildings') {
        const { data } = await api.get('/assembly/buildings', filter ? { params: { status: filter } } : {});
        setBuildings(data);
      } else if (tab === 'transactions') {
        const { data } = await api.get('/assembly/transactions', filter ? { params: { documentation_status: filter } } : {});
        setTransactions(data);
      } else if (tab === 'designs') {
        const { data } = await api.get('/assembly/designs', filter ? { params: { status: filter } } : {});
        setDesigns(data);
      } else if (tab === 'siteplans') {
        const [plansRes, reqRes] = await Promise.all([
          api.get('/site-plans'),
          api.get('/site-plans/requests/list'),
        ]);
        setSitePlans(plansRes.data);
        setSitePlanRequests(reqRes.data);
      } else if (tab === 'protected') {
        const { data } = await api.get('/assembly/protected-areas');
        setProtectedAreas(data);
      } else if (tab === 'revenue') {
        const [rev, summary] = await Promise.all([
          api.get('/assembly/revenue', filter ? { params: { category: filter } } : {}),
          api.get('/assembly/revenue/summary'),
        ]);
        setRevenue(rev.data);
        setRevenueSummary(summary.data);
      } else if (tab === 'alerts') {
        const { data } = await api.get('/assembly/alerts', filter ? { params: { alert_type: filter } } : {});
        setAlerts(data);
      } else if (tab === 'users') {
        const [usersRes, orgRes] = await Promise.all([
          api.get('/assembly/users'),
          api.get('/assembly/organization'),
        ]);
        setOrgUsers(usersRes.data);
        setOrgInfo(orgRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || t('assemblyDashboard.error'));
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // ── User management handlers ──
  const showToast = (msg, type = 'success') => {
    setUserToast({ msg, type });
    setTimeout(() => setUserToast(null), 3000);
  };

  const createUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.password) {
      showToast('Name, email, and password are required', 'error'); return;
    }
    setSavingUser(true);
    try {
      await api.post('/assembly/users', userForm);
      showToast('User created');
      setUserForm({ name: '', email: '', phone: '', password: '', role: 'planning_officer' });
      setShowUserForm(false);
      const { data } = await api.get('/assembly/users');
      setOrgUsers(data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create user', 'error');
    } finally { setSavingUser(false); }
  };

  const toggleUserActive = async (u) => {
    try {
      await api.patch(`/assembly/users/${u.id}`, { active: !u.active });
      showToast(`User ${u.active ? 'deactivated' : 'activated'}`);
      const { data } = await api.get('/assembly/users');
      setOrgUsers(data);
    } catch { showToast('Failed to update user', 'error'); }
  };

  const deleteUser = async (u) => {
    if (!confirm(`Delete user "${u.name}"?`)) return;
    try {
      await api.delete(`/assembly/users/${u.id}`);
      showToast('User deleted');
      const { data } = await api.get('/assembly/users');
      setOrgUsers(data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  const initials = (name) => name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '??';

  const fmtMoney = (v) => v ? `GHS ${Number(v).toLocaleString()}` : '—';
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

  return (
    <Page>
      <TopBar>
        <Logo>
          <LogoIcon><Landmark size={22} /></LogoIcon>
          EarthGlobal <span style={{ color: '#5ce1ff' }}>Assembly</span>
        </Logo>
        <UserInfo>
          {user && (
            <UserBadge>
              <span>{user.name}</span>
              <span>{user.assemblyRole?.replace(/_/g, ' ')}</span>
            </UserBadge>
          )}
          {user?.assemblyRole === 'planning_officer' && (
            <LogoutBtn onClick={() => navigate('/assembly/planning')} style={{ borderColor: 'rgba(92,225,255,0.3)', color: '#5ce1ff' }}>
              <Map size={16} /> Planning Map
            </LogoutBtn>
          )}
          {(user?.assemblyRole === 'planning_officer' || user?.assemblyRole === 'assembly_admin') && (
            <LogoutBtn onClick={() => navigate('/assembly/planning/schemes')} style={{ borderColor: 'rgba(92,225,255,0.3)', color: '#5ce1ff' }}>
              <FileText size={16} /> Scheme Management
            </LogoutBtn>
          )}
          {(user?.assemblyRole === 'planning_officer' || user?.assemblyRole === 'assembly_admin') && (
            <LogoutBtn onClick={() => navigate('/assembly/validation')} style={{ borderColor: 'rgba(92,225,255,0.3)', color: '#5ce1ff' }}>
              <FileCheck size={16} /> Search Validation
            </LogoutBtn>
          )}
          {(user?.assemblyRole === 'planning_officer' || user?.assemblyRole === 'assembly_admin') && (
            <LogoutBtn onClick={() => navigate('/assembly/marketplace')} style={{ borderColor: 'rgba(168,85,247,0.3)', color: '#c084fc' }}>
              <Landmark size={16} /> Land Sale Approvals
            </LogoutBtn>
          )}
          <LogoutBtn onClick={() => navigate('/assembly/profile')} style={{ borderColor: 'rgba(22,119,255,0.3)', color: '#3ba7ff' }}>
            <User size={16} /> My Profile
          </LogoutBtn>
          <LogoutBtn onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </LogoutBtn>
          <LanguageSwitcher />
        </UserInfo>
      </TopBar>

      <Container>
        <Tabs>
          {TABS.filter(tab => !user?.assemblyRole || tab.roles.includes(user.assemblyRole)).map(({ id, label, labelKey, icon: Icon }) => (
            <Tab key={id} $active={activeTab === id} onClick={() => { setActiveTab(id); setFilter(''); }}>
              <Icon size={16} /> {t(labelKey, label)}
            </Tab>
          ))}
        </Tabs>

        {error && <ErrorState>{error}</ErrorState>}

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <>
            {loading ? <LoadingState>{t('assemblyDashboard.loading')}</LoadingState> : stats ? (
              <>
                <StatsGrid>
                  <StatCard $color="#1677ff" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <StatIcon $bg="rgba(22,119,255,0.15)" $color="#3ba7ff"><MapPin size={22} /></StatIcon>
                    <StatValue>{stats.parcels}</StatValue>
                    <StatLabel>{t('assemblyDashboard.stats.registeredParcels')}</StatLabel>
                  </StatCard>

                  <StatCard $color="#22c55e" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <StatIcon $bg="rgba(34,197,94,0.15)" $color="#4ade80"><FileCheck size={22} /></StatIcon>
                    <StatValue>{stats.permits.approved}</StatValue>
                    <StatLabel>{t('assemblyDashboard.stats.approvedPermits')}</StatLabel>
                    <StatSub>
                      <span><Clock size={12} /> {stats.permits.pending} {t('assemblyDashboard.stats.pending')}</span>
                      <span><XCircle size={12} /> {stats.permits.rejected} {t('assemblyDashboard.stats.rejected')}</span>
                    </StatSub>
                  </StatCard>

                  <StatCard $color="#ef4444" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <StatIcon $bg="rgba(239,68,68,0.15)" $color="#f87171"><Building2 size={22} /></StatIcon>
                    <StatValue>{stats.buildings.total}</StatValue>
                    <StatLabel>{t('assemblyDashboard.stats.detectedBuildings')}</StatLabel>
                    <StatSub>
                      <span><AlertTriangle size={12} /> {stats.alerts.unpermitted} {t('assemblyDashboard.stats.unpermitted')}</span>
                    </StatSub>
                  </StatCard>

                  <StatCard $color="#fbbf24" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <StatIcon $bg="rgba(251,191,36,0.15)" $color="#fbbf24"><Landmark size={22} /></StatIcon>
                    <StatValue>{stats.transactions.proper + stats.transactions.improper + stats.transactions.missing}</StatValue>
                    <StatLabel>{t('assemblyDashboard.stats.landTransactions')}</StatLabel>
                    <StatSub>
                      <span><CheckCircle2 size={12} /> {stats.transactions.proper} {t('assemblyDashboard.stats.proper')}</span>
                      <span><XCircle size={12} /> {stats.transactions.improper + stats.transactions.missing} {t('assemblyDashboard.stats.issues')}</span>
                    </StatSub>
                  </StatCard>

                  <StatCard $color="#22c55e" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <StatIcon $bg="rgba(34,197,94,0.15)" $color="#4ade80"><DollarSign size={22} /></StatIcon>
                    <StatValue>{fmtMoney(stats.revenue.total)}</StatValue>
                    <StatLabel>{t('assemblyDashboard.stats.totalRevenue')}</StatLabel>
                  </StatCard>

                  <StatCard $color="#a855f7" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <StatIcon $bg="rgba(168,85,247,0.15)" $color="#c084fc"><Trees size={22} /></StatIcon>
                    <StatValue>{stats.protectedAreas}</StatValue>
                    <StatLabel>{t('assemblyDashboard.stats.protectedAreas')}</StatLabel>
                    <StatSub>
                      <span><AlertTriangle size={12} /> {stats.alerts.protectedViolations} {t('assemblyDashboard.stats.violations')}</span>
                    </StatSub>
                  </StatCard>
                </StatsGrid>

                <Panel>
                  <PanelHeader>
                    <PanelTitle><AlertTriangle size={18} /> {t('assemblyDashboard.panels.recentAlerts')}</PanelTitle>
                    <FilterBtn $active onClick={() => setActiveTab('alerts')}>{t('assemblyDashboard.panels.viewAll')} <ArrowRight size={12} /></FilterBtn>
                  </PanelHeader>
                  <Table>
                    <thead><tr><th>Type</th><th>Parcel</th><th>Detected</th><th>Status</th></tr></thead>
                    <tbody>
                      <tr><td colSpan={4}><EmptyState>{t('assemblyDashboard.panels.noAlertsOverview')}</EmptyState></td></tr>
                    </tbody>
                  </Table>
                </Panel>
              </>
            ) : <ErrorState>{t('assemblyDashboard.failedStats')}</ErrorState>}
          </>
        )}

        {/* ── Permits ── */}
        {activeTab === 'permits' && (
          <Panel>
            <PanelHeader>
              <PanelTitle><FileCheck size={18} /> {t('assemblyDashboard.panels.buildingPermits')}</PanelTitle>
              <FilterBar>
                {['', 'pending', 'approved', 'rejected'].map(f => (
                  <FilterBtn key={f} $active={filter === f} onClick={() => setFilter(f)}>
                    {f || t('assemblyDashboard.panels.all')}
                  </FilterBtn>
                ))}
              </FilterBar>
            </PanelHeader>
            {loading ? <LoadingState>{t('assemblyDashboard.loading')}</LoadingState> : permits.length === 0 ? <EmptyState>{t('assemblyDashboard.panels.noPermits')}</EmptyState> : (
              <Table>
                <thead><tr><th>Applicant</th><th>Type</th><th>Permit #</th><th>Status</th><th>Fee Paid</th><th>Submitted</th></tr></thead>
                <tbody>
                  {permits.map(p => (
                    <tr key={p.id}>
                      <td>{p.applicant_name}</td>
                      <td style={{ textTransform: 'capitalize' }}>{p.permit_type}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.permit_number}</td>
                      <td><StatusBadge $bg={statusColors[p.status]?.bg} $color={statusColors[p.status]?.color}>{p.status}</StatusBadge></td>
                      <td>{fmtMoney(p.fee_paid)}</td>
                      <td>{fmtDate(p.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        )}

        {/* ── Buildings ── */}
        {activeTab === 'buildings' && (
          <Panel>
            <PanelHeader>
              <PanelTitle><Building2 size={18} /> {t('assemblyDashboard.panels.detectedBuildings')}</PanelTitle>
              <FilterBar>
                {['', 'unverified', 'verified_permitted', 'verified_unpermitted', 'under_investigation'].map(f => (
                  <FilterBtn key={f} $active={filter === f} onClick={() => setFilter(f)}>
                    {f ? f.replace(/_/g, ' ') : t('assemblyDashboard.panels.all')}
                  </FilterBtn>
                ))}
              </FilterBar>
            </PanelHeader>
            {loading ? <LoadingState>{t('assemblyDashboard.loading')}</LoadingState> : buildings.length === 0 ? <EmptyState>{t('assemblyDashboard.panels.noBuildings')}</EmptyState> : (
              <Table>
                <thead><tr><th>Parcel</th><th>Area (sqm)</th><th>Status</th><th>Protected Area</th><th>Detected</th></tr></thead>
                <tbody>
                  {buildings.map(b => (
                    <tr key={b.id}>
                      <td>{b.parcel_name || 'Unknown'}</td>
                      <td>{b.area_sqm ? Number(b.area_sqm).toFixed(1) : '—'}</td>
                      <td><StatusBadge $bg={statusColors[b.status]?.bg} $color={statusColors[b.status]?.color}>{b.status.replace(/_/g, ' ')}</StatusBadge></td>
                      <td>{b.in_protected_area ? <span style={{ color: '#ef4444' }}>Yes</span> : 'No'}</td>
                      <td>{fmtDate(b.detected_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        )}

        {/* ── Transactions ── */}
        {activeTab === 'transactions' && (
          <Panel>
            <PanelHeader>
              <PanelTitle><Landmark size={18} /> {t('assemblyDashboard.panels.landTransactions')}</PanelTitle>
              <FilterBar>
                {['', 'proper', 'improper', 'missing', 'under_review'].map(f => (
                  <FilterBtn key={f} $active={filter === f} onClick={() => setFilter(f)}>
                    {f ? f.replace(/_/g, ' ') : t('assemblyDashboard.panels.all')}
                  </FilterBtn>
                ))}
              </FilterBar>
            </PanelHeader>
            {loading ? <LoadingState>{t('assemblyDashboard.loading')}</LoadingState> : transactions.length === 0 ? <EmptyState>{t('assemblyDashboard.panels.noTransactions')}</EmptyState> : (
              <Table>
                <thead><tr><th>Seller</th><th>Buyer</th><th>Sale Price</th><th>Documentation</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td>{tx.seller_name}</td>
                      <td>{tx.buyer_name}</td>
                      <td>{fmtMoney(tx.sale_price)}</td>
                      <td><StatusBadge $bg={statusColors[tx.documentation_status]?.bg} $color={statusColors[tx.documentation_status]?.color}>{tx.documentation_status.replace(/_/g, ' ')}</StatusBadge></td>
                      <td><StatusBadge $bg={statusColors[tx.status]?.bg} $color={statusColors[tx.status]?.color}>{tx.status}</StatusBadge></td>
                      <td>{fmtDate(tx.transaction_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        )}

        {/* ── Designs ── */}
        {activeTab === 'designs' && (
          <Panel>
            <PanelHeader>
              <PanelTitle><Home size={18} /> {t('assemblyDashboard.panels.buildingDesigns')}</PanelTitle>
              <FilterBar>
                {['', 'submitted', 'under_review', 'approved', 'rejected'].map(f => (
                  <FilterBtn key={f} $active={filter === f} onClick={() => setFilter(f)}>
                    {f ? f.replace(/_/g, ' ') : t('assemblyDashboard.panels.all')}
                  </FilterBtn>
                ))}
              </FilterBar>
            </PanelHeader>
            {loading ? <LoadingState>{t('assemblyDashboard.loading')}</LoadingState> : designs.length === 0 ? <EmptyState>{t('assemblyDashboard.panels.noDesigns')}</EmptyState> : (
              <Table>
                <thead><tr><th>Design Name</th><th>Designer</th><th>Parcel</th><th>Est. Cost</th><th>Status</th><th>Submitted</th></tr></thead>
                <tbody>
                  {designs.map(d => (
                    <tr key={d.id}>
                      <td>{d.design_name}</td>
                      <td>{d.designer_name || '—'}</td>
                      <td>{d.parcel_name || '—'}</td>
                      <td>{fmtMoney(d.estimated_cost)}</td>
                      <td><StatusBadge $bg={statusColors[d.status]?.bg} $color={statusColors[d.status]?.color}>{d.status.replace(/_/g, ' ')}</StatusBadge></td>
                      <td>{fmtDate(d.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        )}

        {/* ── Site Plans ── */}
        {activeTab === 'siteplans' && (
          <>
            <Panel style={{ marginBottom: 24 }}>
              <PanelHeader>
                <PanelTitle><FileText size={18} /> {t('assemblyDashboard.panels.sitePlans')}</PanelTitle>
                <FilterBar>
                  {['', 'draft', 'certified', 'rejected'].map(f => (
                    <FilterBtn key={f} $active={filter === f} onClick={() => setFilter(f)}>
                      {f ? f.replace(/_/g, ' ') : t('assemblyDashboard.panels.all')}
                    </FilterBtn>
                  ))}
                </FilterBar>
              </PanelHeader>
              {loading ? <LoadingState>{t('assemblyDashboard.loading')}</LoadingState> : sitePlans.length === 0 ? <EmptyState>{t('assemblyDashboard.panels.noSitePlans')}</EmptyState> : (
                <Table>
                  <thead><tr><th>Title</th><th>Parcel</th><th>Owner</th><th>Generated By</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                  <tbody>
                    {sitePlans.filter(p => !filter || p.status === filter).map(p => (
                      <tr key={p.id}>
                        <td>{p.title || 'Untitled'}</td>
                        <td>{p.parcel_name || '—'}</td>
                        <td>{p.owner_name || '—'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{p.generated_by_role}</td>
                        <td><StatusBadge $bg={statusColors[p.status]?.bg || 'rgba(251,191,36,0.15)'} $color={statusColors[p.status]?.color || '#fbbf24'}>{p.status}</StatusBadge></td>
                        <td>{fmtDate(p.created_at)}</td>
                        <td>
                          {p.status === 'draft' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={async () => { try { await api.patch(`/site-plans/${p.id}/certify`); showToast('Site plan certified'); fetchData('siteplans'); } catch { showToast('Failed to certify', 'error'); } }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', color: '#4ade80', cursor: 'pointer', fontSize: '0.8rem' }}><CheckCircle2 size={14} /> {t('assemblyDashboard.actions.certify')}</button>
                              <button onClick={async () => { const reason = prompt('Rejection reason:'); if (reason === null) return; try { await api.patch(`/site-plans/${p.id}/reject`, { reason }); showToast('Site plan rejected'); fetchData('siteplans'); } catch { showToast('Failed to reject', 'error'); } }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem' }}><XCircle size={14} /> {t('assemblyDashboard.actions.reject')}</button>
                            </div>
                          )}
                          {p.status === 'certified' && <span style={{ color: '#4ade80', fontSize: '0.8rem' }}>Certified {fmtDate(p.certified_at)}</span>}
                          {p.status === 'rejected' && <span style={{ color: '#f87171', fontSize: '0.8rem' }}>{p.rejection_reason || 'Rejected'}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>

            <Panel>
              <PanelHeader>
                <PanelTitle><Clock size={18} /> {t('assemblyDashboard.panels.certifiedRequests')}</PanelTitle>
              </PanelHeader>
              {sitePlanRequests.length === 0 ? <EmptyState>{t('assemblyDashboard.panels.noRequests')}</EmptyState> : (
                <Table>
                  <thead><tr><th>Parcel</th><th>Owner</th><th>Purpose</th><th>Status</th><th>Requested</th><th>Actions</th></tr></thead>
                  <tbody>
                    {sitePlanRequests.map(r => (
                      <tr key={r.id}>
                        <td>{r.parcel_name || '—'}</td>
                        <td>{r.owner_name || '—'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{(r.purpose || '—').replace(/_/g, ' ')}</td>
                        <td><StatusBadge $bg={statusColors[r.status]?.bg || 'rgba(251,191,36,0.15)'} $color={statusColors[r.status]?.color || '#fbbf24'}>{r.status.replace(/_/g, ' ')}</StatusBadge></td>
                        <td>{fmtDate(r.requested_at)}</td>
                        <td>
                          {r.status === 'pending' && (
                            <button onClick={async () => { try { await api.patch(`/site-plans/requests/${r.id}`, { status: 'in_progress' }); showToast('Request accepted'); fetchData('siteplans'); } catch { showToast('Failed', 'error'); } }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(92,225,255,0.3)', background: 'rgba(92,225,255,0.1)', color: '#5ce1ff', cursor: 'pointer', fontSize: '0.8rem' }}>{t('assemblyDashboard.actions.start')}</button>
                          )}
                          {r.status === 'in_progress' && (
                            <button onClick={async () => { try { await api.patch(`/site-plans/requests/${r.id}`, { status: 'completed' }); showToast('Request completed'); fetchData('siteplans'); } catch { showToast('Failed', 'error'); } }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', color: '#4ade80', cursor: 'pointer', fontSize: '0.8rem' }}><CheckCircle2 size={14} /> {t('assemblyDashboard.actions.complete')}</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>
          </>
        )}

        {/* ── Protected Areas ── */}
        {activeTab === 'protected' && (
          <Panel>
            <PanelHeader>
              <PanelTitle><Trees size={18} /> {t('assemblyDashboard.panels.protectedAreas')}</PanelTitle>
            </PanelHeader>
            {loading ? <LoadingState>{t('assemblyDashboard.loading')}</LoadingState> : protectedAreas.length === 0 ? <EmptyState>{t('assemblyDashboard.panels.noProtected')}</EmptyState> : (
              <Table>
                <thead><tr><th>Name</th><th>Type</th><th>Description</th><th>Active</th></tr></thead>
                <tbody>
                  {protectedAreas.map(pa => (
                    <tr key={pa.id}>
                      <td>{pa.name}</td>
                      <td style={{ textTransform: 'capitalize' }}>{pa.type.replace(/_/g, ' ')}</td>
                      <td style={{ maxWidth: '300px' }}>{pa.description || '—'}</td>
                      <td>{pa.active ? <CheckCircle2 size={16} color="#4ade80" /> : <XCircle size={16} color="#f87171" />}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        )}

        {/* ── Revenue ── */}
        {activeTab === 'revenue' && (
          <>
            {revenueSummary.length > 0 && (
              <StatsGrid>
                {revenueSummary.map((r, i) => (
                  <StatCard key={r.category} $color="#22c55e" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <StatIcon $bg="rgba(34,197,94,0.15)" $color="#4ade80"><DollarSign size={22} /></StatIcon>
                    <StatValue>{fmtMoney(r.total)}</StatValue>
                    <StatLabel>{r.category.replace(/_/g, ' ')} ({r.count})</StatLabel>
                  </StatCard>
                ))}
              </StatsGrid>
            )}
            <Panel>
              <PanelHeader>
                <PanelTitle><DollarSign size={18} /> {t('assemblyDashboard.panels.revenue')}</PanelTitle>
                <FilterBar>
                  {['', 'permit_fee', 'transaction_fee', 'stamp_duty', 'penalty', 'inspection_fee'].map(f => (
                    <FilterBtn key={f} $active={filter === f} onClick={() => setFilter(f)}>
                      {f ? f.replace(/_/g, ' ') : t('assemblyDashboard.panels.all')}
                    </FilterBtn>
                  ))}
                </FilterBar>
              </PanelHeader>
              {loading ? <LoadingState>{t('assemblyDashboard.loading')}</LoadingState> : revenue.length === 0 ? <EmptyState>{t('assemblyDashboard.panels.noRevenue')}</EmptyState> : (
                <Table>
                  <thead><tr><th>Category</th><th>Description</th><th>Amount</th><th>Payer</th><th>Method</th><th>Date</th></tr></thead>
                  <tbody>
                    {revenue.map(r => (
                      <tr key={r.id}>
                        <td style={{ textTransform: 'capitalize' }}>{r.category.replace(/_/g, ' ')}</td>
                        <td>{r.description}</td>
                        <td style={{ fontWeight: 600, color: '#4ade80' }}>{fmtMoney(r.amount)}</td>
                        <td>{r.payer_name || '—'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.payment_method || '—'}</td>
                        <td>{fmtDate(r.collected_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>
          </>
        )}

        {/* ── Alerts ── */}
        {activeTab === 'alerts' && (
          <Panel>
            <PanelHeader>
              <PanelTitle><AlertTriangle size={18} /> {t('assemblyDashboard.panels.alerts')}</PanelTitle>
              <FilterBar>
                {['', 'unpermitted_building', 'protected_area_violation', 'design_submitted', 'improper_transaction', 'clearing'].map(f => (
                  <FilterBtn key={f} $active={filter === f} onClick={() => setFilter(f)}>
                    {f ? f.replace(/_/g, ' ') : t('assemblyDashboard.panels.all')}
                  </FilterBtn>
                ))}
              </FilterBar>
            </PanelHeader>
            {loading ? <LoadingState>{t('assemblyDashboard.loading')}</LoadingState> : alerts.length === 0 ? <EmptyState>{t('assemblyDashboard.panels.noAlerts')}</EmptyState> : (
              <Table>
                <thead><tr><th>Type</th><th>Parcel</th><th>NDVI Change</th><th>Verified</th><th>Detected</th></tr></thead>
                <tbody>
                  {alerts.map(a => (
                    <tr key={a.id}>
                      <td style={{ textTransform: 'capitalize' }}>{a.alert_type.replace(/_/g, ' ')}</td>
                      <td>{a.parcel_name || '—'}</td>
                      <td>{a.change_score ? Number(a.change_score).toFixed(3) : '—'}</td>
                      <td>{a.verified ? <CheckCircle2 size={16} color="#4ade80" /> : <Clock size={16} color="#fbbf24" />}</td>
                      <td>{fmtDate(a.detected_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        )}

        {/* ── User Management ── */}
        {activeTab === 'users' && (
          <Panel>
            <PanelHeader>
              <PanelTitle><UserCog size={18} /> {t('assemblyDashboard.panels.users')}</PanelTitle>
              <AddBtn onClick={() => setShowUserForm(!showUserForm)}>
                <Plus size={16} /> Add User
              </AddBtn>
            </PanelHeader>

            {orgInfo && (
              <div style={{ padding: '0 24px 16px', borderBottom: '1px solid rgba(92,225,255,0.1)' }}>
                <div style={{ fontSize: '0.85rem', color: '#aab7d4' }}>
                  Organization: <span style={{ color: '#5ce1ff', fontWeight: 600 }}>{orgInfo.name}</span> — {orgInfo.region}
                </div>
              </div>
            )}

            {showUserForm && (
              <div style={{ padding: 24, background: 'rgba(13,23,51,0.5)', borderBottom: '1px solid rgba(92,225,255,0.1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#aab7d4', display: 'block', marginBottom: 6 }}>Full Name *</label>
                    <input
                      style={{ width: '100%', padding: 10, background: '#080f24', border: '1px solid rgba(92,225,255,0.15)', borderRadius: 8, color: '#e6edf7', fontSize: '0.9rem', outline: 'none' }}
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      placeholder="e.g. Planning Officer"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#aab7d4', display: 'block', marginBottom: 6 }}>Email *</label>
                    <input
                      type="email"
                      style={{ width: '100%', padding: 10, background: '#080f24', border: '1px solid rgba(92,225,255,0.15)', borderRadius: 8, color: '#e6edf7', fontSize: '0.9rem', outline: 'none' }}
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="officer@assembly.gov.gh"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#aab7d4', display: 'block', marginBottom: 6 }}>Phone</label>
                    <input
                      style={{ width: '100%', padding: 10, background: '#080f24', border: '1px solid rgba(92,225,255,0.15)', borderRadius: 8, color: '#e6edf7', fontSize: '0.9rem', outline: 'none' }}
                      value={userForm.phone}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                      placeholder="+233240000000"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#aab7d4', display: 'block', marginBottom: 6 }}>Password *</label>
                    <input
                      type="password"
                      style={{ width: '100%', padding: 10, background: '#080f24', border: '1px solid rgba(92,225,255,0.15)', borderRadius: 8, color: '#e6edf7', fontSize: '0.9rem', outline: 'none' }}
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="Set login password"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.85rem', color: '#aab7d4', display: 'block', marginBottom: 6 }}>Role</label>
                  <select
                    style={{ padding: 10, background: '#080f24', border: '1px solid rgba(92,225,255,0.15)', borderRadius: 8, color: '#e6edf7', fontSize: '0.9rem', outline: 'none' }}
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <option value="assembly_admin">Assembly Admin</option>
                    <option value="planning_officer">Planning Officer</option>
                    <option value="revenue_officer">Revenue Officer</option>
                    <option value="inspector">Inspector</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={createUser}
                    disabled={savingUser}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg, #1677ff, #5ce1ff)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', opacity: savingUser ? 0.5 : 1 }}
                  >
                    {savingUser ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    {savingUser ? 'Creating...' : 'Create User'}
                  </button>
                  <button
                    onClick={() => setShowUserForm(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'transparent', border: '1px solid rgba(92,225,255,0.15)', color: '#aab7d4', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <LoadingState>{t('assemblyDashboard.loading')}</LoadingState>
            ) : orgUsers.length === 0 ? (
              <EmptyState>{t('assemblyDashboard.empty.noResults')}</EmptyState>
            ) : (
              <div style={{ padding: 16 }}>
                {orgUsers.map((u) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, background: 'rgba(13,23,51,0.5)', marginBottom: 8, border: '1px solid rgba(92,225,255,0.08)', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', background: 'rgba(168,85,247,0.15)', color: '#c084fc', fontWeight: 600, fontSize: '0.8rem', flexShrink: 0 }}>
                      {initials(u.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                        {u.name}
                        {u.id === user?.id && <span style={{ color: '#5ce1ff', fontSize: '0.75rem', marginLeft: 8 }}>(You)</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#aab7d4', display: 'flex', gap: 12, marginTop: 2, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} /> {u.email}</span>
                        {u.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><PhoneIcon size={11} /> {u.phone}</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#5ce1ff', marginTop: 4 }}>{u.assembly_role?.replace(/_/g, ' ')}</div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, background: u.active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: u.active ? '#4ade80' : '#f87171' }}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => toggleUserActive(u)}
                      title={u.active ? 'Deactivate' : 'Activate'}
                      disabled={u.id === user?.id}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(92,225,255,0.15)', background: 'transparent', color: '#aab7d4', cursor: u.id === user?.id ? 'not-allowed' : 'pointer', opacity: u.id === user?.id ? 0.4 : 1 }}
                    >
                      {u.active ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                    </button>
                    <button
                      onClick={() => deleteUser(u)}
                      title="Delete"
                      disabled={u.id === user?.id}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#f87171', cursor: u.id === user?.id ? 'not-allowed' : 'pointer', opacity: u.id === user?.id ? 0.4 : 1 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {userToast && (
          <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: userToast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', border: `1px solid ${userToast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, borderRadius: 12, color: userToast.type === 'error' ? '#f87171' : '#4ade80', zIndex: 2000, fontSize: '0.9rem' }}>
            {userToast.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
            {userToast.msg}
          </div>
        )}
      </Container>
    </Page>
  );
}
