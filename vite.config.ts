import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `base` must match the GitHub repository name (served at /<repo>/ on GitHub Pages).
export default defineConfig({
  base: '/dictation_helper/',
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
