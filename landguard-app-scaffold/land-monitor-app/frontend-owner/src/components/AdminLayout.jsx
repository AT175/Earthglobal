import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  LayoutGrid, Users, MapPinned, Home, LogOut, Building2, UserCog, Shield, DollarSign, User, ClipboardList,
} from 'lucide-react';
import { LanguageSwitcher } from '@earthglobal/design-system';

const NAV_ITEMS = [
  { to: '/admin/dashboard', labelKey: 'nav.dashboard', fallbackLabel: 'Dashboard', icon: LayoutGrid },
  { to: '/admin', labelKey: 'nav.parcelOnboarding', fallbackLabel: 'Onboarding Requests', icon: MapPinned },
  { to: '/admin/parcels', labelKey: 'nav.parcels', fallbackLabel: 'Parcels', icon: Home },
  { to: '/admin/agents', labelKey: 'nav.agents', fallbackLabel: 'Agents', icon: Users },
  { to: '/admin/visits', labelKey: 'nav.visitAssignments', fallbackLabel: 'Visit Assignments', icon: ClipboardList },
  { to: '/admin/users', labelKey: 'nav.userManagement', fallbackLabel: 'User Management', icon: UserCog },
  { to: '/admin/organizations', labelKey: 'nav.organizations', fallbackLabel: 'Organizations', icon: Building2 },
  { to: '/finance', labelKey: 'nav.finance', fallbackLabel: 'Finance', icon: DollarSign },
  { to: '/admin/profile', labelKey: 'nav.profile', fallbackLabel: 'My Profile', icon: User },
];

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
`;

const UserBadge = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  span:first-child { font-weight: 600; }
  span:last-child { color: ${({ theme }) => theme.colors.textMuted}; font-size: 0.75rem; }
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

  &:hover { color: ${({ theme }) => theme.colors.error}; border-color: ${({ theme }) => theme.colors.error}40; }
`;

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing[6]};
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  overflow-x: auto;
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

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    label: t(item.labelKey, { defaultValue: item.fallbackLabel || item.labelKey }),
  }));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <Page>
      <TopBar>
        <Logo>
          <LogoIcon><Shield size={22} /></LogoIcon>
          EarthGlobal <span style={{ color: '#5ce1ff' }}>Admin</span>
        </Logo>
        <UserInfo>
          <LanguageSwitcher />
          {user && (
            <UserBadge>
              <span>{user.name}</span>
              <span>System Admin</span>
            </UserBadge>
          )}
          <LogoutBtn onClick={handleLogout}>
            <LogOut size={16} /> {t('nav.logout', { defaultValue: 'Logout' })}
          </LogoutBtn>
        </UserInfo>
      </TopBar>

      <Container>
        <Tabs>
          {navItems.map(({ to, label, icon: Icon }) => (
            <Tab key={to} $active={location.pathname === to} onClick={() => navigate(to)}>
              <Icon size={16} /> {label}
            </Tab>
          ))}
        </Tabs>

        {children}
      </Container>
    </Page>
  );
}
