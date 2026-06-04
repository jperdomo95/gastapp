import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#10b981',
          fg: '#ffffff',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
