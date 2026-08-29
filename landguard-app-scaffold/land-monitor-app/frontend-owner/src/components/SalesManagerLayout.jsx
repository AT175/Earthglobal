import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  LayoutDashboard, FileCheck, Landmark, User, LogOut, MapPin,
  ClipboardList, FileText, ShoppingBag, Briefcase, PlusSquare,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/sales-manager', labelKey: 'nav.dashboard', fallbackLabel: 'Dashboard', icon: LayoutDashboard },
  { to: '/sales-manager/request-onboarding', labelKey: 'nav.requestOnboarding', fallbackLabel: 'Onboard a Parcel', icon: PlusSquare },
  { to: '/sales-manager/sell', labelKey: 'nav.sell', fallbackLabel: 'List Land for Sale', icon: Landmark },
  { to: '/sales-manager/buy-land', labelKey: 'nav.browseLand', fallbackLabel: 'Browse Land', icon: ShoppingBag },
  { to: '/sales-manager/validation', labelKey: 'nav.validation', fallbackLabel: 'Validation', icon: FileCheck },
  { to: '/sales-manager/site-plans', labelKey: 'nav.sitePlans', fallbackLabel: 'Site Plans', icon: FileText },
];

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
  background: linear-gradient(135deg, #a855f7, #5ce1ff);
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.3);
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
  span:last-child { color: #a855f7; font-size: 0.75rem; font-weight: 600; }
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
  border-bottom: 2px solid ${({ $active, theme }) => ($active ? '#a855f7' : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  white-space: nowrap;
  transition: all 0.2s;

  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

export default function SalesManagerLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  const navItems = NAV_ITEMS;

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
          Earth<span style={{ color: '#a855f7' }}>Global</span>
        </Logo>
        <UserInfo>
          {user && (
            <UserBadge>
              <span>{user.name}</span>
              <span>Sales Manager</span>
            </UserBadge>
          )}
          <LogoutBtn onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </LogoutBtn>
        </UserInfo>
      </TopBar>

      <Container>
        <Tabs>
          {navItems.map(({ to, fallbackLabel, icon: Icon }) => (
            <Tab key={to} $active={location.pathname === to} onClick={() => navigate(to)}>
              <Icon size={16} /> {fallbackLabel}
            </Tab>
          ))}
        </Tabs>

        {children}
      </Container>
    </Page>
  );
}
