import { colors } from './colors';
import { typography } from './typography';
import { spacing, radii, shadows } from './spacing';
import { breakpoints, breakpointValues, media } from './breakpoints';
import { durations, easings, motionVariants } from './animations';

// Main EarthGlobal theme object, consumed by styled-components ThemeProvider
export const theme = {
  name: 'earthglobal-dark',
  colors,
  ...typography,
  spacing,
  radii,
  shadows,
  breakpoints,
  breakpointValues,
  media,
  durations,
  easings,
  motionVariants,
  zIndices: {
    hide: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    toast: 1600,
    tooltip: 1700,
  },
};

export default theme;
