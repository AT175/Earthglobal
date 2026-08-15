// EarthGlobal Spacing System - 4px base unit
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  2: '0.5rem',     // 8px
  3: '0.75rem',    // 12px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  8: '2rem',       // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  32: '8rem',      // 128px
};

export const radii = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.15)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.25)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',

  // EarthGlobal signature glow shadows
  glow: `
    0 0 10px rgba(22, 119, 255, 0.8),
    0 0 25px rgba(22, 119, 255, 0.55),
    0 0 50px rgba(22, 119, 255, 0.3)
  `,
  glowSoft: `
    0 0 20px rgba(22, 119, 255, 0.25),
    0 0 60px rgba(59, 167, 255, 0.15)
  `,
  glowCyan: `
    0 0 10px rgba(92, 225, 255, 0.7),
    0 0 30px rgba(92, 225, 255, 0.35)
  `,
  glowCard: '0 0 30px rgba(22, 119, 255, 0.08)',
  glowCardHover: '0 0 40px rgba(22, 119, 255, 0.18)',
};

export default { spacing, radii, shadows };
