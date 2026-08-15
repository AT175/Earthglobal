import styled from 'styled-components';

// Responsive dashboard shell: fixed sidebar on desktop, top bar + drawer on mobile.
// Consumed by each app's top-level layout (Owner/Agent/Admin) so navigation stays consistent.
const ShellWrapper = styled.div`
  display: flex;
  min-height: 100vh;
`;

export const Sidebar = styled.aside`
  display: none;
  flex-direction: column;
  width: 260px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]};

  ${({ theme }) => theme.media.md`
    display: flex;
  `}
`;

export const MobileTopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: sticky;
  top: 0;
  z-index: ${({ theme }) => theme.zIndices.sticky};

  ${({ theme }) => theme.media.md`
    display: none;
  `}
`;

export const MainContent = styled.main`
  flex: 1;
  min-width: 0;
  padding: ${({ theme }) => theme.spacing[4]};
  /* leave room for the fixed BottomNav on mobile */
  padding-bottom: ${({ theme }) => theme.spacing[20]};

  ${({ theme }) => theme.media.md`
    padding: ${theme.spacing[8]};
  `}
`;

// Fixed bottom tab bar shown only on mobile — mirrors the desktop Sidebar's NavItems
// so the same nav destinations are always reachable, per the mobile-first requirement.
export const BottomNav = styled.nav`
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.colors.backgroundSecondary}F2;
  backdrop-filter: blur(12px);
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[2]};
  padding-bottom: max(${({ theme }) => theme.spacing[2]}, env(safe-area-inset-bottom));
  z-index: ${({ theme }) => theme.zIndices.sticky};

  ${({ theme }) => theme.media.md`
    display: none;
  `}
`;

export const BottomNavItem = styled.a`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[0.5]};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme, $active }) => ($active ? theme.colors.primaryBright : theme.colors.textMuted)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  text-decoration: none;
  flex: 1;
  transition: color ${({ theme }) => theme.durations.fast} ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

export const NavList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-top: ${({ theme }) => theme.spacing[8]};
`;

export const NavItem = styled.a`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme, $active }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  background: ${({ theme, $active }) => ($active ? theme.colors.surfaceLight : 'transparent')};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  text-decoration: none;
  transition: background ${({ theme }) => theme.durations.fast} ease, color ${({ theme }) => theme.durations.fast} ease;
  box-shadow: ${({ theme, $active }) => ($active ? theme.shadows.glowCard : 'none')};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.surfaceLight};
  }
`;

export const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text};

  span {
    color: ${({ theme }) => theme.colors.primaryBright};
  }
`;

export default function AppShell({ sidebar, topBar, bottomNav, children }) {
  return (
    <ShellWrapper>
      {sidebar}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {topBar}
        <MainContent id="main-content" role="main">
          {children}
        </MainContent>
        {bottomNav}
      </div>
    </ShellWrapper>
  );
}
