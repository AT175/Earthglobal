import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Users, MapPinned, Home, LogOut } from 'lucide-react';
import {
  AppShell,
  Sidebar,
  MobileTopBar,
  NavList,
  NavItem,
  Logo,
  BottomNav,
  BottomNavItem,
  LanguageSwitcher,
} from '@earthglobal/design-system';

const NAV_ITEMS = [
  { to: '/admin/dashboard', labelKey: 'nav.dashboard', icon: LayoutGrid },
  { to: '/admin', labelKey: 'nav.parcelOnboarding', icon: MapPinned },
  { to: '/admin/agents', labelKey: 'nav.agents', icon: Users },
  { to: '/admin/parcels', labelKey: 'nav.parcels', icon: Home },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const navItems = NAV_ITEMS.map((item) => ({ ...item, label: t(item.labelKey) }));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const navContent = (
    <NavList aria-label="Primary navigation">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavItem
          key={to}
          as={Link}
          to={to}
          $active={location.pathname === to}
          aria-current={location.pathname === to ? 'page' : undefined}
        >
          <Icon size={18} aria-hidden="true" />
          {label}
        </NavItem>
      ))}
    </NavList>
  );

  return (
    <AppShell
      sidebar={
        <Sidebar style={{ display: 'flex', flexDirection: 'column' }}>
          <Logo>
            <MapPinned size={22} aria-hidden="true" />
            Earth<span>Global</span> Admin
          </Logo>
          {navContent}
          <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <LanguageSwitcher />
            <NavItem
              as="button"
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              <LogOut size={18} aria-hidden="true" />
              Logout
            </NavItem>
          </div>
        </Sidebar>
      }
      topBar={
        <MobileTopBar>
          <Logo>
            <MapPinned size={20} aria-hidden="true" />
            Earth<span>Global</span>
          </Logo>
        </MobileTopBar>
      }
      bottomNav={
        <BottomNav aria-label="Primary navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <BottomNavItem
              key={to}
              as={Link}
              to={to}
              $active={location.pathname === to}
              aria-current={location.pathname === to ? 'page' : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </BottomNavItem>
          ))}
        </BottomNav>
      }
    >
      {children}
    </AppShell>
  );
}
