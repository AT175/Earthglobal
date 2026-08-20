import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Users, MapPinned, Home, LogOut, Building2, UserCog } from 'lucide-react';
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
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/admin', label: 'Onboard Parcel', icon: MapPinned },
  { to: '/admin/parcels', label: 'Parcels', icon: Home },
  { to: '/admin/agents', label: 'Agents', icon: Users },
  { to: '/admin/users', label: 'User Management', icon: UserCog },
  { to: '/admin/organizations', label: 'Organizations', icon: Building2 },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = NAV_ITEMS;

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
