// EarthGlobal Breakpoints - Mobile First
export const breakpointValues = {
  xs: 375,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const breakpoints = {
  xs: `${breakpointValues.xs}px`,
  sm: `${breakpointValues.sm}px`,
  md: `${breakpointValues.md}px`,
  lg: `${breakpointValues.lg}px`,
  xl: `${breakpointValues.xl}px`,
  '2xl': `${breakpointValues['2xl']}px`,
};

// Mobile-first media query helpers for styled-components
// Usage: ${media.md`...css...`}
export const media = Object.keys(breakpointValues).reduce((acc, key) => {
  acc[key] = (...args) => `@media (min-width: ${breakpoints[key]}) { ${args.join('')} }`;
  return acc;
}, {});

export default { breakpoints, breakpointValues, media };
