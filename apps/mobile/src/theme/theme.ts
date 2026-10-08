/**
 * Theme bridge from `@easycasa/design-tokens` — EC-APP-1 design v2.
 */
import { tokens } from '@easycasa/design-tokens';

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  colors: {
    background: string;
    surface: string;
    cream: string;
    sand: string;
    text: string;
    textMuted: string;
    primary: string;
    primaryText: string;
    ink: string;
    inkText: string;
    border: string;
    danger: string;
    ochre: string;
    orange: string;
    pine: string;
    verifiedBg: string;
    sellerIconBg: string;
    sellerIcon: string;
    tabActiveBg: string;
  };
  radius: { sm: number; md: number; lg: number; xl: number };
  font: typeof tokens.font;
  spacing: (n: number) => number;
}

const base = {
  radius: { ...tokens.radius },
  font: tokens.font,
  spacing: (n: number) => n * 4,
};

export const lightTheme: Theme = {
  ...base,
  colors: {
    background: tokens.color.parchment,
    surface: tokens.color.cream,
    cream: tokens.color.cream,
    sand: tokens.color.sand,
    text: tokens.color.ink,
    textMuted: tokens.color.muted,
    primary: tokens.color.azure,
    primaryText: '#FFFFFF',
    ink: tokens.color.ink,
    inkText: tokens.color.parchment,
    border: tokens.color.line,
    danger: tokens.color.clay,
    ochre: tokens.color.ochre,
    orange: tokens.color.orange,
    pine: tokens.color.pine,
    verifiedBg: tokens.color.verifiedBg,
    sellerIconBg: tokens.color.sellerIconBg,
    sellerIcon: tokens.color.sellerIcon,
    tabActiveBg: '#dde8f0',
  },
};

/** Design v2 is parchment-first; dark keeps ink surfaces for system dark mode. */
export const darkTheme: Theme = {
  ...base,
  colors: {
    background: tokens.color.ink,
    surface: '#1c2a38',
    cream: '#1c2a38',
    sand: '#243344',
    text: tokens.color.parchment,
    textMuted: '#a8b4be',
    primary: '#6ba3c9',
    primaryText: tokens.color.ink,
    ink: tokens.color.parchment,
    inkText: tokens.color.ink,
    border: 'rgba(243,237,225,0.14)',
    danger: tokens.color.clay,
    ochre: tokens.color.ochre,
    orange: tokens.color.orange,
    pine: tokens.color.pine,
    verifiedBg: '#1a3a30',
    sellerIconBg: '#3a2a18',
    sellerIcon: tokens.color.sellerIcon,
    tabActiveBg: 'rgba(169,200,220,0.22)',
  },
};

export function themeFor(scheme: ColorScheme | null | undefined): Theme {
  return scheme === 'dark' ? darkTheme : lightTheme;
}
