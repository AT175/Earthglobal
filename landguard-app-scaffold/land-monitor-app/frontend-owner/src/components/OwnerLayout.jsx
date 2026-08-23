import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, MapPin, FileCheck, Landmark, CreditCard, User, LogOut } from 'lucide-react';
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
  { to: '/dashboard', labelKey: 'nav.dashboard', fallbackLabel: 'Dashboard', icon: LayoutDashboard },
  { to: '/sell', labelKey: 'nav.sell', fallbackLabel: 'Sell Land', icon: Landmark },
  { to: '/pricing', labelKey: 'nav.pricing', fallbackLabel: 'Subscribe', icon: CreditCard },
  { to: '/validation', labelKey: 'nav.validation', fallbackLabel: 'Validation', icon: FileCheck },
  { to: '/profile', labelKey: 'nav.profile', fallbackLabel: 'Profile', icon: User },
];

export default function OwnerLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const navItems = NAV_ITEMS.map((item) => ({ ...item, label: t(item.labelKey, { defaultValue: item.fallbackLabel || item.labelKey }) }));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
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
          <span>{label}</span>
        </NavItem>
      ))}
    </NavList>
  );

  const logoutBtn = (
    <button
      onClick={handleLogout}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '10px 12px',
        background: 'none',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        color: '#aab7d4',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 500,
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = '#aab7d4'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
    >
      <LogOut size={16} aria-hidden="true" />
      <span>{t('nav.logout', { defaultValue: 'Logout' })}</span>
    </button>
  );

  return (
    <AppShell
      sidebar={
        <Sidebar style={{ display: 'flex', flexDirection: 'column' }}>
          <Logo>
            <MapPin size={22} aria-hidden="true" />
            Earth<span>Global</span>
          </Logo>
          {navContent}
          <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <LanguageSwitcher />
            {logoutBtn}
          </div>
        </Sidebar>
      }
      topBar={
        <MobileTopBar>
          <Logo>
            <MapPin size={20} aria-hidden="true" />
            Earth<span>Global</span>
          </Logo>
          <button
            onClick={handleLogout}
            aria-label={t('nav.logout', { defaultValue: 'Logout' })}
            style={{ background: 'none', border: 'none', color: '#aab7d4', cursor: 'pointer', padding: 4 }}
          >
            <LogOut size={20} aria-hidden="true" />
          </button>
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
              <span>{label}</span>
            </BottomNavItem>
          ))}
        </BottomNav>
      }
    >
      {children}
    </AppShell>
  );
}
