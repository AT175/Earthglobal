import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, MapPin, Bell, Settings, FileCheck, Landmark } from 'lucide-react';
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
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/sell', labelKey: 'nav.sell', fallbackLabel: 'Sell Land', icon: Landmark },
  { to: '/validation', labelKey: 'nav.validation', icon: FileCheck },
  { to: '/notifications', labelKey: 'nav.notifications', icon: Bell },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export default function OwnerLayout({ children }) {
  const location = useLocation();
  const { t } = useTranslation('common');

  const navItems = NAV_ITEMS.map((item) => ({ ...item, label: t(item.labelKey, { defaultValue: item.fallbackLabel || item.labelKey }) }));

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
            <MapPin size={22} aria-hidden="true" />
            Earth<span>Global</span>
          </Logo>
          {navContent}
          <div style={{ marginTop: 'auto', paddingTop: 24 }}>
            <LanguageSwitcher />
          </div>
        </Sidebar>
      }
      topBar={
        <MobileTopBar>
          <Logo>
            <MapPin size={20} aria-hidden="true" />
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
