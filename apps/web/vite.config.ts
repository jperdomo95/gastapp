import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  // Env files live at the repo root; Vite prefers .env.local over .env.
  envDir: path.resolve(__dirname, '../..'),
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { port: 5173, host: true },
  test: {
    // e2e/ belongs to Playwright, not vitest
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
