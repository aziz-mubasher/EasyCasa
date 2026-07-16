/**
 * Theme bridge from `@easycasa/design-tokens` (web CSS variables).
 */
import { tokens } from '@easycasa/design-tokens';

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  colors: {
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    primary: string;
    primaryText: string;
    border: string;
    danger: string;
  };
  radius: { sm: number; md: number; lg: number };
  spacing: (n: number) => number;
}

const base = {
  radius: { ...tokens.radius },
  spacing: (n: number) => n * 4,
};

export const lightTheme: Theme = {
  ...base,
  colors: {
    background: tokens.color.paper,
    surface: tokens.color.sand,
    text: tokens.color.primaryDark,
    textMuted: tokens.color.muted,
    primary: tokens.color.primary,
    primaryText: '#FFFFFF',
    border: tokens.color.line,
    danger: tokens.color.clay,
  },
};

export const darkTheme: Theme = {
  ...base,
  colors: {
    background: tokens.color.primaryDark,
    surface: '#1c2a45',
    text: tokens.color.paper,
    textMuted: '#a8a494',
    primary: '#6b9bff',
    primaryText: tokens.color.primaryDark,
    border: '#2a3a55',
    danger: tokens.color.clay,
  },
};

export function themeFor(scheme: ColorScheme | null | undefined): Theme {
  return scheme === 'dark' ? darkTheme : lightTheme;
}
