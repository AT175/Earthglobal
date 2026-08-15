import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from './theme';
import GlobalStyles from './GlobalStyles';

// Wraps an app with the EarthGlobal styled-components theme + global styles.
// Accepts an optional `overrides` prop so Phase 14 (user customization) can
// merge in user-selected accent colors / density without duplicating the base theme.
export default function ThemeProvider({ children, overrides }) {
  const mergedTheme = overrides ? { ...theme, ...overrides, colors: { ...theme.colors, ...(overrides.colors || {}) } } : theme;

  return (
    <StyledThemeProvider theme={mergedTheme}>
      <GlobalStyles />
      {children}
    </StyledThemeProvider>
  );
}
