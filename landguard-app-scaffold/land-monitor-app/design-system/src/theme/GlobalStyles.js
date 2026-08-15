import { createGlobalStyle } from 'styled-components';

// Base global styles + ambient blue glow background, per EarthGlobal color spec
const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    margin: 0;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: ${({ theme }) => theme.fontSizes.base};
    line-height: ${({ theme }) => theme.lineHeights.normal};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    min-height: 100vh;
  }

  /* Ambient atmospheric glow, applied once at the page level rather than per-component */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: -1;
    background:
      radial-gradient(circle at 50% 20%, rgba(22, 119, 255, 0.18), transparent 35%),
      radial-gradient(circle at 85% 70%, rgba(92, 225, 255, 0.08), transparent 30%);
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    line-height: ${({ theme }) => theme.lineHeights.tight};
    letter-spacing: ${({ theme }) => theme.letterSpacings.tight};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textMuted};
  }

  a {
    color: ${({ theme }) => theme.colors.primaryBright};
    text-decoration: none;
  }

  button {
    font-family: inherit;
  }

  ul, ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  img, svg {
    display: block;
    max-width: 100%;
  }

  /* Accessible, visible focus ring using the EarthGlobal cyan glow */
  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.cyan};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }

  /* Respect user's reduced motion preference (accessibility requirement) */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  ::selection {
    background: ${({ theme }) => theme.colors.glowPrimarySoft};
    color: ${({ theme }) => theme.colors.text};
  }

  /* Scrollbar theming for a consistent premium feel */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background};
  }
  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.surfaceLight};
    border-radius: ${({ theme }) => theme.radii.full};
  }
  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.primary};
  }
`;

export default GlobalStyles;
