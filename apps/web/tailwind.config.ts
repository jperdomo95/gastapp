import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '.light'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
      },
      colors: {
        pulse: {
          bg:           'var(--pulse-bg)',
          'bg-soft':    'var(--pulse-bg-soft)',
          text:         'var(--pulse-text)',
          dim:          'var(--pulse-dim)',
          faint:        'var(--pulse-faint)',
          glass:        'var(--pulse-glass)',
          'glass-hi':   'var(--pulse-glass-hi)',
          stroke:       'var(--pulse-stroke)',
          track:        'var(--pulse-track)',
          grid:         'var(--pulse-grid)',
          'bar-inactive': 'var(--pulse-bar-inactive)',
          'nav-bg':     'var(--pulse-nav-bg)',
          handle:       'var(--pulse-handle)',
          v1:           'var(--pulse-v1)',
          v2:           'var(--pulse-v2)',
        },
      },
      borderRadius: {
        'pulse-card':   '22px',
        'pulse-card-lg': '18px',
        'pulse-chip':   '20px',
        'pulse-sheet':  '28px',
        'pulse-fab':    '16px',
      },
      boxShadow: {
        'pulse-card': 'var(--pulse-card-shadow)',
      },
    },
  },
  plugins: [],
} satisfies Config;
