import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  User, Mail, Phone, MapPin, Calendar, Save, Lock, Bell, Camera,
  LogOut, Edit2, Check, X, Shield, Building2, Home, AlertCircle,
  TrendingUp, ClipboardList, CreditCard,
} from 'lucide-react';
import api from '../services/api';

// ═══════════════════════════════════════════════════════════
// Layout wrappers — picks the right layout based on role
// ═══════════════════════════════════════════════════════════
import OwnerLayout from '../components/OwnerLayout';
import AgentLayout from '../components/AgentLayout';
import AdminLayout from '../components/AdminLayout';
import FinanceLayout from '../components/FinanceLayout';
import SalesManagerLayout from '../components/SalesManagerLayout';

// Assembly dashboard has its own layout baked in — we'll use a simple wrapper
const AssemblyWrapper = ({ children }) => {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };
  return (
    <div style={{ minHeight: '100vh', background: '#0d1020', color: '#e5e7eb', fontFamily: 'Inter, sans-serif' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50, background: '#0d1020f0', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #2a2f45', padding: '1rem 1.5rem', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40,
            borderRadius: 10, background: 'linear-gradient(135deg, #1677ff, #5ce1ff)' }}>
            <Building2 size={22} color="white" />
          </div>
          EarthGlobal <span style={{ color: '#5ce1ff' }}>Assembly</span>
        </div>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none',
          border: '1px solid #2a2f45', color: '#9ca3af', padding: '0.5rem 0.75rem',
          borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem',
        }}>
          <LogOut size={16} /> Logout
        </button>
      </header>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem' }}>
        {children}
      </div>
    </div>
  );
};

function getLayout(role, isSalesManager) {
  if (role === 'owner' && isSalesManager) return SalesManagerLayout;
  if (role === 'owner') return OwnerLayout;
  if (role === 'agent') return AgentLayout;
  if (role === 'admin') return AdminLayout;
  if (role === 'assembly') return AssemblyWrapper;
  return ({ children }) => <div>{children}</div>;
}

// ═══════════════════════════════════════════════════════════
// Styled components
// ═══════════════════════════════════════════════════════════
const Page = styled.div`
  color: ${({ theme }) => theme.colors.text};
  max-width: 900px;
  margin: 0 auto;
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

const ProfileCard = styled(motion.div)`
  background: ${({ theme }) => theme.colors.gradientSurface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

const CoverSection = styled.div`
  background: ${({ theme }) => theme.colors.gradientPrimary};
  height: 100px;
  position: relative;
`;

const AvatarSection = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[5]};
  margin-top: -40px;
`;

const Avatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 3px solid ${({ theme }) => theme.colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primaryBright};
  overflow: hidden;
  flex-shrink: 0;
  position: relative;

  img { width: 100%; height: 100%; object-fit: cover; }
`;

const AvatarUploadBtn = styled.button`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 26px;
  height: 26px;
  border-radius: ${({ theme }) => theme.radii.full};
  border: 2px solid ${({ theme }) => theme.colors.surface};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover { opacity: 0.8; }
`;

const NameSection = styled.div`
  flex: 1;
  padding-bottom: ${({ theme }) => theme.spacing[2]};
`;

const UserName = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const UserRole = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-transform: capitalize;
`;

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  text-transform: capitalize;
`;

const CardBody = styled.div`
  padding: ${({ theme }) => theme.spacing[5]};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const InfoLabel = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const InfoValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surfaceLight};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ $editable }) => ($editable ? theme.colors.borderDark : 'transparent')};
`;

const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-family: inherit;

  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-family: inherit;
  resize: vertical;
  min-height: 70px;

  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;

const Toggle = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.surfaceLight};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  & + & { margin-top: ${({ theme }) => theme.spacing[2]}; }
`;

const ToggleSwitch = styled.div`
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: ${({ $on, theme }) => ($on ? theme.colors.primary : '#3a3f5a')};
  position: relative;
  transition: background 0.2s;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $on }) => ($on ? '20px' : '2px')};
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    transition: left 0.2s;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
`;

const StatItem = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surfaceLight};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 2px;
`;

const ActionRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

const PrimaryBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: white;
  border: none;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SecondaryBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const LogoutBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.error}40;
  color: ${({ theme }) => theme.colors.error};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;

  &:hover { background: ${({ theme }) => theme.colors.error}10; }
`;

const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[6]};
  width: 100%;
  max-width: 420px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ModalTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const IconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.borderDark};
  background: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;

  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textMuted};
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

const SuccessBox = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[3]};
  color: #4ade80;
  background: rgba(34,197,94,0.1);
  border-radius: ${({ theme }) => theme.radii.lg};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

const roleConfig = {
  owner: { label: 'Land Owner', icon: Home, color: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' } },
  agent: { label: 'Field Agent', icon: ClipboardList, color: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' } },
  admin: { label: 'System Admin', icon: Shield, color: { bg: 'rgba(22,119,255,0.15)', color: '#3ba7ff' } },
  assembly: { label: 'Assembly Officer', icon: Building2, color: { bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' } },
};

const subRoleConfig = {
  super_admin: { label: 'Super Admin', bg: 'rgba(22,119,255,0.15)', color: '#3ba7ff' },
  finance_officer: { label: 'Finance Officer', bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  assembly_admin: { label: 'Assembly Admin', bg: 'rgba(92,225,255,0.15)', color: '#5ce1ff' },
  planning_officer: { label: 'Planning Officer', bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
  revenue_officer: { label: 'Revenue Officer', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  inspector: { label: 'Inspector', bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
};

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [notifPrefs, setNotifPrefs] = useState({});
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const loadProfile = useCallback(() => {
    Promise.all([
      api.get('/profile/me'),
      api.get('/profile/stats'),
    ]).then(([p, s]) => {
      setUser(p.data);
      setStats(s.data);
      setForm({
        name: p.data.name || '',
        phone: p.data.phone || '',
        avatar_url: p.data.avatar_url || '',
        bio: p.data.bio || '',
        address: p.data.address || '',
        region: p.data.region || '',
      });
      setNotifPrefs({
        notification_email: p.data.notification_email ?? true,
        notification_sms: p.data.notification_sms ?? false,
        notification_push: p.data.notification_push ?? true,
      });
    }).catch((err) => setError(err.response?.data?.error || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      // Only include notification prefs that exist for this role
      Object.keys(notifPrefs).forEach((k) => {
        if (user[k] !== undefined) payload[k] = notifPrefs[k];
      });
      const res = await api.patch('/profile', payload);
      setUser(res.data);
      // Update localStorage user
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem('user', JSON.stringify({ ...parsed, name: res.data.name, phone: res.data.phone }));
      }
      setEditing(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm_password) {
      setError('New passwords do not match');
      return;
    }
    setPwSaving(true);
    setError('');
    try {
      await api.patch('/profile/password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwModal(false);
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      setSuccess('Password changed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // For now, use a data URL. In production, upload to S3/R2.
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((f) => ({ ...f, avatar_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    const Layout = getLayout('owner', user?.isSalesManager);
    return <Layout><Loading>Loading profile...</Loading></Layout>;
  }

  const role = user?.role || 'owner';
  const Layout = getLayout(role, user?.isSalesManager);
  const rc = roleConfig[role] || roleConfig.owner;
  const subRole = user?.adminRole || user?.assemblyRole;
  const subRc = subRole ? subRoleConfig[subRole] : null;
  const RoleIcon = rc.icon;

  const initials = (user?.name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  // Role-specific stat rendering
  const renderStats = () => {
    if (!stats) return null;
    const items = [];
    if (role === 'owner') {
      items.push({ label: 'Parcels', value: stats.parcels || 0, icon: Home });
      items.push({ label: 'Alerts', value: stats.alerts?.total || 0, icon: AlertCircle });
      items.push({ label: 'Visits Done', value: stats.visits?.completed || 0, icon: ClipboardList });
      items.push({ label: 'Active Subs', value: stats.active_subscriptions || 0, icon: CreditCard });
    } else if (role === 'agent') {
      items.push({ label: 'Assigned', value: stats.assigned_visits || 0, icon: ClipboardList });
      items.push({ label: 'Completed', value: stats.completed_visits || 0, icon: Check });
      items.push({ label: 'Media Uploads', value: stats.media_uploads || 0, icon: Camera });
    } else if (role === 'admin') {
      items.push({ label: 'Owners', value: stats.total_owners || 0, icon: User });
      items.push({ label: 'Agents', value: stats.total_agents || 0, icon: ClipboardList });
      items.push({ label: 'Parcels', value: stats.total_parcels || 0, icon: Home });
    } else if (role === 'assembly') {
      items.push({ label: 'Org Parcels', value: stats.org_parcels || 0, icon: Home });
      items.push({ label: 'Permits', value: stats.org_permits || 0, icon: Shield });
      items.push({ label: 'Listings', value: stats.org_listings || 0, icon: TrendingUp });
    }
    items.push({ label: 'Member Since', value: stats.member_since ? new Date(stats.member_since).getFullYear() : '—', icon: Calendar });

    return (
      <StatsGrid>
        {items.map((s, i) => (
          <StatItem key={i}>
            <s.icon size={18} style={{ margin: '0 auto 4px', color: '#9ca3af' }} />
            <StatValue>{s.value}</StatValue>
            <StatLabel>{s.label}</StatLabel>
          </StatItem>
        ))}
      </StatsGrid>
    );
  };

  // Determine which notification toggles to show
  const notifToggles = [];
  if (user?.notification_email !== undefined) notifToggles.push({ key: 'notification_email', label: 'Email Notifications', icon: Mail });
  if (user?.notification_sms !== undefined) notifToggles.push({ key: 'notification_sms', label: 'SMS Notifications', icon: Phone });
  if (user?.notification_push !== undefined) notifToggles.push({ key: 'notification_push', label: 'Push Notifications', icon: Bell });

  return (
    <Layout>
      <Page>
        <Header>
          <PageTitle>My Profile</PageTitle>
          <PageSubtitle>View and manage your account information, notification preferences, and security settings.</PageSubtitle>
        </Header>

        {error && <ErrorBox>{error}</ErrorBox>}
        {success && <SuccessBox>{success}</SuccessBox>}

        {/* Profile header card */}
        <ProfileCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <CoverSection />
          <AvatarSection>
            <Avatar>
              {form.avatar_url ? (
                <img src={form.avatar_url} alt={user?.name} />
              ) : (
                initials
              )}
              {editing && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                    id="avatar-upload"
                  />
                  <AvatarUploadBtn onClick={() => document.getElementById('avatar-upload').click()}>
                    <Camera size={12} />
                  </AvatarUploadBtn>
                </>
              )}
            </Avatar>
            <NameSection>
              <UserName>{user?.name}</UserName>
              <UserRole>
                <RoleBadge $bg={rc.color.bg} $color={rc.color.color}>
                  <RoleIcon size={12} /> {rc.label}
                </RoleBadge>
                {subRc && (
                  <RoleBadge $bg={subRc.bg} $color={subRc.color}>
                    {subRc.label}
                  </RoleBadge>
                )}
              </UserRole>
            </NameSection>
          </AvatarSection>
          <CardBody>
            {renderStats()}
          </CardBody>
        </ProfileCard>

        {/* Personal information */}
        <ProfileCard>
          <CardBody>
            <SectionTitle>
              <User size={18} /> Personal Information
            </SectionTitle>

            {editing ? (
              <>
                <InfoGrid>
                  <InfoItem>
                    <InfoLabel><User size={12} /> Full Name</InfoLabel>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel><Mail size={12} /> Email</InfoLabel>
                    <InfoValue>{user?.email}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel><Phone size={12} /> Phone</InfoLabel>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +233 24 000 0000" />
                  </InfoItem>
                  {(role === 'owner' || role === 'agent') && (
                    <InfoItem>
                      <InfoLabel><MapPin size={12} /> Region</InfoLabel>
                      <Input value={form.region || ''} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="e.g. Greater Accra" />
                    </InfoItem>
                  )}
                  <InfoItem style={{ gridColumn: '1 / -1' }}>
                    <InfoLabel><MapPin size={12} /> Address</InfoLabel>
                    <Input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Your physical address" />
                  </InfoItem>
                  <InfoItem style={{ gridColumn: '1 / -1' }}>
                    <InfoLabel><Edit2 size={12} /> Bio</InfoLabel>
                    <TextArea value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." />
                  </InfoItem>
                </InfoGrid>
                <ActionRow>
                  <PrimaryBtn onClick={saveProfile} disabled={saving}>
                    <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                  </PrimaryBtn>
                  <SecondaryBtn onClick={() => { setEditing(false); loadProfile(); }}>
                    <X size={16} /> Cancel
                  </SecondaryBtn>
                </ActionRow>
              </>
            ) : (
              <>
                <InfoGrid>
                  <InfoItem>
                    <InfoLabel><User size={12} /> Full Name</InfoLabel>
                    <InfoValue>{user?.name || '—'}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel><Mail size={12} /> Email</InfoLabel>
                    <InfoValue>{user?.email || '—'}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel><Phone size={12} /> Phone</InfoLabel>
                    <InfoValue>{user?.phone || '—'}</InfoValue>
                  </InfoItem>
                  {(role === 'owner' || role === 'agent') && (
                    <InfoItem>
                      <InfoLabel><MapPin size={12} /> Region</InfoLabel>
                      <InfoValue>{user?.region || '—'}</InfoValue>
                    </InfoItem>
                  )}
                  {role === 'assembly' && user?.organization && (
                    <InfoItem>
                      <InfoLabel><Building2 size={12} /> Organization</InfoLabel>
                      <InfoValue>{user.organization.name} ({user.organization.type})</InfoValue>
                    </InfoItem>
                  )}
                  {user?.address && (
                    <InfoItem style={{ gridColumn: '1 / -1' }}>
                      <InfoLabel><MapPin size={12} /> Address</InfoLabel>
                      <InfoValue>{user.address}</InfoValue>
                    </InfoItem>
                  )}
                  {user?.bio && (
                    <InfoItem style={{ gridColumn: '1 / -1' }}>
                      <InfoLabel><Edit2 size={12} /> Bio</InfoLabel>
                      <InfoValue>{user.bio}</InfoValue>
                    </InfoItem>
                  )}
                  <InfoItem>
                    <InfoLabel><Calendar size={12} /> Member Since</InfoLabel>
                    <InfoValue>{fmtDate(stats?.member_since)}</InfoValue>
                  </InfoItem>
                </InfoGrid>
                <ActionRow>
                  <PrimaryBtn onClick={() => setEditing(true)}>
                    <Edit2 size={16} /> Edit Profile
                  </PrimaryBtn>
                  <SecondaryBtn onClick={() => setPwModal(true)}>
                    <Lock size={16} /> Change Password
                  </SecondaryBtn>
                  <LogoutBtn onClick={handleLogout}>
                    <LogOut size={16} /> Logout
                  </LogoutBtn>
                </ActionRow>
              </>
            )}
          </CardBody>
        </ProfileCard>

        {/* Notification preferences */}
        {notifToggles.length > 0 && (
          <ProfileCard>
            <CardBody>
              <SectionTitle>
                <Bell size={18} /> Notification Preferences
              </SectionTitle>
              {notifToggles.map((t) => (
                <Toggle key={t.key}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <t.icon size={16} color="#9ca3af" /> {t.label}
                  </span>
                  <ToggleSwitch
                    $on={editing ? notifPrefs[t.key] : user[t.key]}
                    onClick={() => {
                      if (editing) setNotifPrefs({ ...notifPrefs, [t.key]: !notifPrefs[t.key] });
                    }}
                  />
                </Toggle>
              ))}
              {!editing && (
                <div style={{ marginTop: '1rem' }}>
                  <SecondaryBtn onClick={() => setEditing(true)}>
                    <Edit2 size={16} /> Edit Preferences
                  </SecondaryBtn>
                </div>
              )}
            </CardBody>
          </ProfileCard>
        )}

        {/* Security */}
        <ProfileCard>
          <CardBody>
            <SectionTitle>
              <Lock size={18} /> Security
            </SectionTitle>
            <InfoGrid>
              <InfoItem>
                <InfoLabel><Lock size={12} /> Password</InfoLabel>
                <InfoValue>••••••••</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel><Shield size={12} /> Account Status</InfoLabel>
                <InfoValue>
                  <span style={{ color: '#4ade80', fontWeight: 600 }}>
                    {user?.approved === false ? 'Pending Approval' : user?.active === false ? 'Deactivated' : 'Active'}
                  </span>
                </InfoValue>
              </InfoItem>
            </InfoGrid>
            <ActionRow>
              <SecondaryBtn onClick={() => setPwModal(true)}>
                <Lock size={16} /> Change Password
              </SecondaryBtn>
            </ActionRow>
          </CardBody>
        </ProfileCard>
      </Page>

      {/* Password change modal */}
      {pwModal && (
        <Modal onClick={() => setPwModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Change Password</ModalTitle>
              <IconBtn onClick={() => setPwModal(false)}><X size={16} /></IconBtn>
            </ModalHeader>
            <FormGroup>
              <Label>Current Password</Label>
              <Input type="password" value={pwForm.current_password} onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>New Password</Label>
              <Input type="password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>Confirm New Password</Label>
              <Input type="password" value={pwForm.confirm_password} onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })} />
            </FormGroup>
            <ActionRow>
              <PrimaryBtn onClick={changePassword} disabled={pwSaving || !pwForm.current_password || !pwForm.new_password}>
                <Lock size={16} /> {pwSaving ? 'Changing...' : 'Change Password'}
              </PrimaryBtn>
              <SecondaryBtn onClick={() => setPwModal(false)}>Cancel</SecondaryBtn>
            </ActionRow>
          </ModalContent>
        </Modal>
      )}
    </Layout>
  );
}
