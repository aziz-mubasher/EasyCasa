import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        paper: 'var(--paper)',
        'paper-deep': 'var(--paper-deep)',
        azure: 'var(--azure)',
        'azure-pale': 'var(--azure-pale)',
        ochre: 'var(--ochre)',
        pine: 'var(--pine)',
        sand: 'var(--sand)',
        clay: 'var(--clay)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        muted: 'var(--muted)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl2: '1.25rem', doc: 'var(--radius-doc)' },
      maxWidth: { measure: '64rem' },
    },
  },
  plugins: [],
};
export default config;
