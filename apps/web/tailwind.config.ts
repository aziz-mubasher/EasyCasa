import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        paper: 'var(--paper)',
        azure: 'var(--azure)',
        pine: 'var(--pine)',
        sand: 'var(--sand)',
        clay: 'var(--clay)',
        line: 'var(--line)',
        muted: 'var(--muted)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};
export default config;
