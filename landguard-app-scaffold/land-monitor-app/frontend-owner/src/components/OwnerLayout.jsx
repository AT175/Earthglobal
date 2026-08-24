import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  LayoutDashboard, FileCheck, Landmark, CreditCard, User, LogOut, MapPin, Shield, ClipboardList, FileText,
} from 'lucide-react';
import { LanguageSwitcher } from '@earthglobal/design-system';

const NAV_ITEMS = [
  { to: '/dashboard', labelKey: 'nav.dashboard', fallbackLabel: 'Dashboard', icon: LayoutDashboard },
  { to: '/visits', labelKey: 'nav.myVisits', fallbackLabel: 'My Visits', icon: ClipboardList },
  { to: '/sell', labelKey: 'nav.sell', fallbackLabel: 'Sell Land', icon: Landmark },
  { to: '/pricing', labelKey: 'nav.pricing', fallbackLabel: 'Subscribe', icon: CreditCard },
  { to: '/validation', labelKey: 'nav.validation', fallbackLabel: 'Validation', icon: FileCheck },
  { to: '/site-plans', labelKey: 'nav.sitePlans', fallbackLabel: 'Site Plans', icon: FileText },
  { to: '/profile', labelKey: 'nav.profile', fallbackLabel: 'Profile', icon: User },
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

  &:hover { color: ${({ theme }) => theme.colors.error}; border-color: ${({ theme }) => theme.colors.error}40; }
`;

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing[6]};
  @media (max-width: 768px) { padding: 16px; }
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderDark};
  overflow-x: auto;
  @media (max-width: 768px) { margin-bottom: 16px; }
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

export default function OwnerLayout({ children }) {
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
    navigate('/login');
  };

  return (
    <Page>
      <TopBar>
        <Logo>
          <LogoIcon><MapPin size={22} /></LogoIcon>
          Earth<span style={{ color: '#5ce1ff' }}>Global</span>
        </Logo>
        <UserInfo>
          <LanguageSwitcher />
          {user && (
            <UserBadge>
              <span>{user.name}</span>
              <span>Landowner</span>
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
